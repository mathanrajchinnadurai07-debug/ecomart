const db = require('../config/database');
const { deleteCachePattern } = require('../config/redis');
const Razorpay = require('razorpay');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { createShiprocketOrder } = require('../config/shiprocket');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/email');
const { createDeliveryJobs, sendDeliveryNotifications } = require('../services/deliveryService');

// --------------- HELPER: POST PAYMENT SUCCESS ---------------
const updateOrderToConfirmed = async (orderId, paymentId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // 1. Update status
    const { rows } = await client.query(
      'UPDATE orders SET status = $1, payment_id = $2 WHERE id = $3 RETURNING *',
      ['confirmed', paymentId, orderId]
    );
    
    if (!rows.length) {
      throw new Error(`Order ${orderId} not found`);
    }
    const order = rows[0];
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const address = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;

    // 2. Award Eco points
    const pointsToAward = Math.floor(order.total_amount / 100);
    if (pointsToAward > 0) {
      await client.query(
        'UPDATE users SET eco_points = COALESCE(eco_points, 0) + $1 WHERE id = $2',
        [pointsToAward, order.user_id]
      );
    }

    // 3. Shiprocket Multi-Vendor
    try {
      const parsedAddress = address || {};
      const [firstName, ...lastNameParts] = (parsedAddress.name || 'Customer').split(' ');
      const lastName = lastNameParts.join(' ') || 'Name';
      
      const itemsBySeller = items.reduce((acc, item) => {
        const sId = item.seller_id || 0;
        if (!acc[sId]) acc[sId] = [];
        acc[sId].push(item);
        return acc;
      }, {});

      for (const [sId, sellerItems] of Object.entries(itemsBySeller)) {
        const { rows: subOrderRows } = await client.query(
          `INSERT INTO sub_orders (order_id, seller_id, status) VALUES ($1, $2, $3) RETURNING *`,
          [order.id, sId, 'confirmed']
        );
        const subOrder = subOrderRows[0];
        const subTotal = sellerItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        const shiprocketData = {
          order_id: `${order.id}-${subOrder.id}`,
          order_date: new Date().toISOString().slice(0, 10),
          pickup_location: "Primary",
          billing_customer_name: firstName,
          billing_last_name: lastName,
          billing_address: parsedAddress.line1 || 'Address',
          billing_address_2: parsedAddress.line2 || '',
          billing_city: parsedAddress.city || 'City',
          billing_pincode: parsedAddress.pincode || '000000',
          billing_state: parsedAddress.state || 'State',
          billing_country: "India",
          billing_email: parsedAddress.email || "test@example.com",
          billing_phone: parsedAddress.phone || "0000000000",
          shipping_is_billing: true,
          order_items: sellerItems.map(i => ({
            name: i.name || `Product ${i.product_id}`,
            sku: `SKU-${i.product_id}`,
            units: i.quantity,
            selling_price: i.price,
            discount: 0,
            tax: 0,
            hsn: ""
          })),
          payment_method: 'Prepaid',
          sub_total: subTotal,
          length: 10, breadth: 10, height: 10, weight: 1
        };

        const srRes = await createShiprocketOrder(shiprocketData);
        if (srRes && srRes.order_id) {
          await client.query('UPDATE sub_orders SET shiprocket_order_id = $1 WHERE id = $2', [srRes.order_id, subOrder.id]);
        }
      }
    } catch (srErr) {
      console.error('Shiprocket multi-vendor order creation failed:', srErr);
    }

    // 4. Delivery Jobs
    const jobsCreated = await createDeliveryJobs(order.id, items, address, client);
    await client.query('COMMIT');

    // 5. Asynchronous Side Effects
    sendDeliveryNotifications(jobsCreated, order.id, address).catch(console.error);
    deleteCachePattern('products:*').catch(console.error);

    // Sync Firestore
    try {
      const historyEntry = { status: 'confirmed', timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: 'confirmed',
        payment_id: paymentId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      await admin.firestore().collection('orders').doc(order.id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(order.user_id).collection('orders').doc(order.id.toString()).update(fsUpdate);
      
      if (pointsToAward > 0) {
        await admin.firestore().collection('users').doc(order.user_id).set({
          eco_points: admin.firestore.FieldValue.increment(pointsToAward)
        }, { merge: true });
      }
    } catch (fsErr) {
      console.error('Firestore sync failed in helper:', fsErr);
    }

    // Send email
    sendOrderConfirmationEmail(order).catch(console.error);

    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// --------------- POST /api/orders ---------------
const createOrder = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { user_id, items, total_amount, address } = req.body;

    if (!user_id || !items || !items.length || !total_amount) {
      return res.status(400).json({ success: false, error: 'user_id, items, and total_amount are required' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    }

    await client.query('BEGIN');

    // Ensure user exists
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : (address || {});
    await client.query(
      `INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [user_id, parsedAddress.name || 'User', parsedAddress.email || \`user_\${user_id}@example.com\`, parsedAddress.phone || null]
    );

    // Verify stock
    for (const item of items) {
      const { rows } = await client.query('SELECT stock, seller_id, name, price FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: \`Product \${item.product_id} not found\` });
      }
      if (rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: \`Insufficient stock for product \${item.product_id}\` });
      }
      item.seller_id = rows[0].seller_id;
      if (!item.name) item.name = rows[0].name;
      if (!item.price) item.price = parseFloat(rows[0].price);
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Generate Razorpay Order
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total_amount * 100),
      currency: 'INR',
      receipt: \`rcpt_\${Date.now()}\`
    });

    // Create Pending Order
    const { rows } = await client.query(
      \`INSERT INTO orders (user_id, items, total_amount, address, status, razorpay_order_id)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *\`,
      [user_id, JSON.stringify(items), total_amount, JSON.stringify(address || {}), rzpOrder.id]
    );
    const newOrder = rows[0];

    await client.query('COMMIT');

    // Sync initial pending state to Firestore
    try {
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const firestorePayload = {
        ...newOrder,
        updated_at: timestamp,
        statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }]
      };
      await admin.firestore().collection('orders').doc(newOrder.id.toString()).set(firestorePayload);
      await admin.firestore().collection('users').doc(user_id).collection('orders').doc(newOrder.id.toString()).set({
        orderId: newOrder.id.toString(),
        total: total_amount,
        items: items,
        status: 'pending',
        createdAt: new Date().toISOString(),
        statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }]
      });
    } catch (fsErr) {
      console.error('Error syncing to Firestore:', fsErr);
    }

    res.status(201).json({ 
      success: true, 
      data: newOrder,
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
