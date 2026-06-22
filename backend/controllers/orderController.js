const db = require('../config/database');
const { deleteCachePattern } = require('../config/redis');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { createShiprocketOrder } = require('../config/shiprocket');
const { sendOrderConfirmationEmail } = require('../utils/email');
const { createDeliveryJobs, sendDeliveryNotifications } = require('../services/deliveryService');

// --------------- POST /api/orders ---------------
const createOrder = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { user_id, items, total_amount, address, status, payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!user_id || !items || !items.length || !total_amount) {
      return res.status(400).json({ success: false, error: 'user_id, items, and total_amount are required' });
    }

    // MANDATORY: Verify Razorpay signature if order status is requested as 'paid'
    if (status === 'paid') {
      if (!payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing Razorpay signature fields for paid order' });
      }
      
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      // Fail closed if key is missing
      if (!keySecret) {
        return res.status(500).json({ success: false, error: 'Payment gateway not configured (missing secret)' });
      }

      const body = razorpay_order_id + '|' + payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    await client.query('BEGIN');

    // Ensure user exists in Postgres to satisfy foreign key constraint
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : (address || {});
    await client.query(
      `INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [user_id, parsedAddress.name || 'User', parsedAddress.email || `user_${user_id}@example.com`, parsedAddress.phone || null]
    );

    // Verify stock for each item
    for (const item of items) {
      const { rows } = await client.query('SELECT stock, seller_id, name, price FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
      }
      if (rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Insufficient stock for product ${item.product_id}` });
      }

      // Enrich item with db details for order recording
      item.seller_id = rows[0].seller_id;
      if (!item.name) item.name = rows[0].name;
      if (!item.price) item.price = parseFloat(rows[0].price);

      // Decrement stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Create the order
    const initialStatus = status || 'pending';
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, items, total_amount, address, status, payment_id, razorpay_order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, JSON.stringify(items), total_amount, JSON.stringify(address || {}), initialStatus, payment_id || null, razorpay_order_id || null]
    );

    // Calculate eco-points (1 point per ₹100 spent)
    const pointsToAward = Math.floor(total_amount / 100);
    if (pointsToAward > 0) {
      await client.query(
        'UPDATE users SET eco_points = COALESCE(eco_points, 0) + $1 WHERE id = $2',
        [pointsToAward, user_id]
      );
    }
    const newOrder = rows[0];

    // Attempt to create Shiprocket order
    let shiprocketOrderId = null;
    try {
      const parsedAddress = typeof address === 'string' ? JSON.parse(address) : (address || {});
      const [firstName, ...lastNameParts] = (parsedAddress.name || 'Customer').split(' ');
      const lastName = lastNameParts.join(' ') || 'Name';
      
      const shiprocketData = {
        order_id: newOrder.id.toString(),
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
        order_items: items.map(i => ({
          name: i.name || `Product ${i.product_id}`,
          sku: `SKU-${i.product_id}`,
          units: i.quantity,
          selling_price: i.price,
          discount: 0,
          tax: 0,
          hsn: ""
        })),
        payment_method: initialStatus === 'pending' ? 'COD' : 'Prepaid',
        sub_total: total_amount,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 1 // default weight in kg
      };

      const srRes = await createShiprocketOrder(shiprocketData);
      if (srRes && srRes.order_id) {
        shiprocketOrderId = srRes.order_id;
        // Optionally update the DB with shiprocketOrderId here
        await client.query('UPDATE orders SET shiprocket_order_id = $1 WHERE id = $2', [shiprocketOrderId, newOrder.id]);
        newOrder.shiprocket_order_id = shiprocketOrderId;
      }
    } catch (srErr) {
      console.error('Shiprocket order creation failed during checkout:', srErr);
    }

    // Create delivery jobs inside the transaction
    const parsedDeliveryAddress = typeof address === 'string' ? JSON.parse(address) : (address || {});
    const jobsCreated = await createDeliveryJobs(newOrder.id, items, parsedDeliveryAddress, client);

    await client.query('COMMIT');

    // Dispatch notifications asynchronously outside the transaction
    sendDeliveryNotifications(jobsCreated, newOrder.id, parsedDeliveryAddress)
      .then(results => console.log('[OrderController] Delivery dispatches completed:', results))
      .catch(err => console.error('[OrderController] Delivery dispatches failed:', err));

    // Invalidate relevant caches
    await deleteCachePattern('products:*');


    // Sync to Firestore
    try {
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const firestorePayload = {
        ...newOrder,
        updated_at: timestamp,
        statusHistory: [{ status: initialStatus, timestamp: new Date().toISOString() }]
      };

      // 1. Global Orders Collection
      await admin.firestore().collection('orders').doc(newOrder.id.toString()).set(firestorePayload);
      
      // 2. User's specific Orders Collection (used by Dashboard)
      await admin.firestore().collection('users').doc(user_id).collection('orders').doc(newOrder.id.toString()).set({
        orderId: newOrder.id.toString(),
        total: total_amount,
        items: items,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        statusHistory: [{ status: initialStatus, timestamp: new Date().toISOString() }]
      });

      // 3. User points
      if (pointsToAward > 0) {
        await admin.firestore().collection('users').doc(user_id).set({
          eco_points: admin.firestore.FieldValue.increment(pointsToAward)
        }, { merge: true });
      }
    } catch (fsErr) {
      console.error('Error syncing to Firestore:', fsErr);
    }

    // Send Confirmation Email
    try {
      await sendOrderConfirmationEmail(newOrder);
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// --------------- GET /api/orders/user/:userId ---------------
const getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { rows } = await db.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/orders/:id ---------------
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- PUT /api/orders/:id/status ---------------
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_id } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }

    let query = 'UPDATE orders SET status = $1';
    const params = [status];

    if (payment_id) {
      query += ', payment_id = $2 WHERE id = $3 RETURNING *';
      params.push(payment_id, id);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(id);
    }

    const { rows } = await db.query(query, params);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updatedOrder = rows[0];

    // If cancelled, restore stock
    if (status === 'cancelled') {
      const items = updatedOrder.items;
      for (const item of items) {
        await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
      await deleteCachePattern('products:*');
    }

    // Sync to Firestore
    try {
      const historyEntry = { status: updatedOrder.status, timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: updatedOrder.status,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      if (updatedOrder.payment_id) {
        fsUpdate.payment_id = updatedOrder.payment_id;
      }
      
      // 1. Global Orders Collection
      await admin.firestore().collection('orders').doc(updatedOrder.id.toString()).update(fsUpdate);
      
      // 2. User's specific Orders Collection
      await admin.firestore().collection('users').doc(updatedOrder.user_id).collection('orders').doc(updatedOrder.id.toString()).update(fsUpdate);

    } catch (fsErr) {
      console.error('Error syncing order status update to Firestore:', fsErr);
    }

    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/orders/shiprocket/webhook ---------------
const shiprocketWebhook = async (req, res, next) => {
  try {
    const { order_id, current_status, status_code } = req.body;
    
    // Validate request header token if Shiprocket provides one (omitted for simplicity here)
    if (!order_id) return res.status(400).send('Missing order_id');

    // Map Shiprocket status to our status
    let newStatus = null;
    const lowerStatus = (current_status || '').toLowerCase();
    
    if (lowerStatus.includes('shipped') || lowerStatus.includes('in transit')) {
      newStatus = 'shipped';
    } else if (lowerStatus.includes('delivered')) {
      newStatus = 'delivered';
    } else if (lowerStatus.includes('canceled') || lowerStatus.includes('cancelled')) {
      newStatus = 'cancelled';
    } else if (lowerStatus.includes('processing') || lowerStatus.includes('manifested')) {
      newStatus = 'processing';
    }

    if (newStatus) {
      // Find internal order by shiprocket_order_id
      const { rows } = await db.query('SELECT * FROM orders WHERE shiprocket_order_id = $1 OR id::text = $1 LIMIT 1', [order_id.toString()]);
      
      if (rows.length > 0) {
        const order = rows[0];
        
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order.id]);
        
        // Sync to Firestore
        try {
          const historyEntry = { status: newStatus, timestamp: new Date().toISOString() };
          const fsUpdate = {
            status: newStatus,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
          };
          await admin.firestore().collection('orders').doc(order.id.toString()).update(fsUpdate);
          await admin.firestore().collection('users').doc(order.user_id).collection('orders').doc(order.id.toString()).update(fsUpdate);
        } catch (fsErr) {
          console.error('Error syncing webhook status to Firestore:', fsErr);
        }
      }
    }

    res.setHeader('x-shiprocket-webhook-status', 'success');
    res.status(200).send('OK');
  } catch (err) {
    console.error('Shiprocket webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// --------------- POST /api/orders/:id/return ---------------
const returnOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = rows[0];
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Only delivered orders can be returned' });
    }

    const updatedOrderQuery = await db.query(
      'UPDATE orders SET status = $1, return_reason = $2 WHERE id = $3 RETURNING *',
      ['return_requested', reason || 'Customer requested return', id]
    );
    
    const updatedOrder = updatedOrderQuery.rows[0];

    // Sync to Firestore
    try {
      const historyEntry = { status: 'return_requested', timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: 'return_requested',
        return_reason: reason || 'Customer requested return',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      await admin.firestore().collection('orders').doc(id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(updatedOrder.user_id).collection('orders').doc(id.toString()).update(fsUpdate);
    } catch (fsErr) {
      console.error('Error syncing return request to Firestore:', fsErr);
    }

    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  shiprocketWebhook,
  returnOrder,
};
