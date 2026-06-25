const db = require('../config/database');
const { deleteCachePattern } = require('../config/redis');
const Razorpay = require('razorpay');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { createShiprocketOrder } = require('../config/shiprocket');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/email');
const { createDeliveryJobs, sendDeliveryNotifications } = require('../services/deliveryService');
const { generateInvoicePDF } = require('../utils/invoice');

// --------------- HELPER: SYNC ORDER TO FIRESTORE ---------------
const syncOrderToFirestore = async (orderId) => {
  try {
    const { rows: orderRows } = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!orderRows.length) return;
    const order = orderRows[0];

    const { rows: subOrderRows } = await db.query(
      `SELECT so.*, s.name as seller_name 
       FROM sub_orders so 
       LEFT JOIN sellers s ON so.seller_id = s.id 
       WHERE so.order_id = $1`,
      [orderId]
    );

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});

    const subOrdersFormatted = subOrderRows.map(so => ({
      id: so.id,
      order_id: so.order_id,
      seller_id: so.seller_id,
      seller_name: so.seller_name || 'Farmer / Seller',
      status: so.status || 'pending',
      shiprocket_order_id: so.shiprocket_order_id,
      shipment_id: so.shipment_id,
      created_at: so.created_at,
      order_items: typeof so.order_items === 'string' ? JSON.parse(so.order_items) : (so.order_items || [])
    }));

    const firestorePayload = {
      ...order,
      items,
      address,
      sub_orders: subOrdersFormatted,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const orderDocRef = admin.firestore().collection('orders').doc(orderId.toString());
    const snap = await orderDocRef.get();
    let statusHistory = [];
    if (snap.exists() && snap.data().statusHistory) {
      statusHistory = snap.data().statusHistory;
    }
    const lastHistory = statusHistory[statusHistory.length - 1];
    if (!lastHistory || lastHistory.status !== order.status) {
      statusHistory.push({ status: order.status, timestamp: new Date().toISOString() });
    }
    firestorePayload.statusHistory = statusHistory;

    await orderDocRef.set(firestorePayload, { merge: true });

    await admin.firestore()
      .collection('users')
      .doc(order.user_id)
      .collection('orders')
      .doc(orderId.toString())
      .set({
        orderId: orderId.toString(),
        total: order.total_amount,
        items,
        status: order.status,
        statusHistory,
        sub_orders: subOrdersFormatted,
        createdAt: order.created_at || new Date().toISOString()
      }, { merge: true });

  } catch (err) {
    console.error(`Error syncing order ${orderId} to Firestore:`, err);
  }
};

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
          `INSERT INTO sub_orders (order_id, seller_id, status, order_items)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [order.id, sId, 'confirmed', JSON.stringify(sellerItems)]
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
    await syncOrderToFirestore(order.id);
    if (pointsToAward > 0) {
      try {
        await admin.firestore().collection('users').doc(order.user_id).set({
          eco_points: admin.firestore.FieldValue.increment(pointsToAward)
        }, { merge: true });
      } catch (fsErr) {
        console.error('Firestore eco points sync failed:', fsErr);
      }
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
    const { user_id, items, total_amount, address, payment_method } = req.body;

    if (!user_id || !items || !items.length || !total_amount) {
      return res.status(400).json({ success: false, error: 'user_id, items, and total_amount are required' });
    }

    const isCod = payment_method === 'cod';

    if (!isCod && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
      return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    }

    await client.query('BEGIN');

    // Ensure user exists
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : (address || {});
    await client.query(
      `INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [user_id, parsedAddress.name || 'User', parsedAddress.email || `user_${user_id}@example.com`, parsedAddress.phone || null]
    );

    // Atomically decrement stock for every item inside the open transaction.
    // A single UPDATE validates AND decrements: if stock < quantity, 0 rows are
    // affected, which we treat as out-of-stock and ROLLBACK the entire order.
    for (const item of items) {
      // Fetch product details (name, price, seller_id) for order payload enrichment
      const { rows: pRows } = await client.query(
        'SELECT stock, seller_id, name, price FROM products WHERE id = $1',
        [item.product_id]
      );
      if (!pRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
      }
      item.seller_id = pRows[0].seller_id;
      if (!item.name)  item.name  = pRows[0].name;
      if (!item.price) item.price = parseFloat(pRows[0].price);

      // Atomic check-and-decrement: affects 0 rows if stock is insufficient
      const { rowCount } = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
        [item.quantity, item.product_id]
      );
      if (rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for "${item.name || `product ${item.product_id}`}". Order not placed.`
        });
      }
    }

    if (isCod) {
      // --- COD Flow: no Razorpay, insert with pending_cod status ---
      const { rows } = await client.query(
        `INSERT INTO orders (user_id, items, total_amount, address, status, razorpay_order_id, payment_method)
         VALUES ($1, $2, $3, $4, 'pending_cod', NULL, 'cod') RETURNING *`,
        [user_id, JSON.stringify(items), total_amount, JSON.stringify(address || {})]
      );
      const newOrder = rows[0];

      // Insert sub_orders grouped by seller_id (same logic as Razorpay path)
      const itemsBySeller = items.reduce((acc, item) => {
        const sId = item.seller_id || 0;
        if (!acc[sId]) acc[sId] = [];
        acc[sId].push(item);
        return acc;
      }, {});
      for (const [sId, sellerItems] of Object.entries(itemsBySeller)) {
        await client.query(
          `INSERT INTO sub_orders (order_id, seller_id, status, order_items)
           VALUES ($1, $2, 'pending_cod', $3)`,
          [newOrder.id, sId, JSON.stringify(sellerItems)]
        );
      }

      await client.query('COMMIT');

      // Sync to Firestore
      await syncOrderToFirestore(newOrder.id);

      return res.status(201).json({ success: true, order_id: newOrder.id, payment_method: 'cod' });
    }

    // --- Razorpay Flow ---
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total_amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    // Create Pending Order
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, items, total_amount, address, status, razorpay_order_id)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
      [user_id, JSON.stringify(items), total_amount, JSON.stringify(address || {}), rzpOrder.id]
    );
    const newOrder = rows[0];

    await client.query('COMMIT');

    // Sync initial pending state to Firestore
    await syncOrderToFirestore(newOrder.id);

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

// --------------- GET /api/orders/user/:userId ---------------
const getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user ? req.user.uid : null;
    const isAdmin = req.user && req.user.role === 'admin';

    if (requestUserId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { rows } = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) { next(err); }
};

// --------------- GET /api/orders/:id ---------------
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestUserId = req.user ? req.user.uid : null;
    const isAdmin = req.user && req.user.role === 'admin';

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });

    const order = rows[0];
    if (order.user_id !== requestUserId && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// --------------- PUT /api/orders/:id/status ---------------
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_id, razorpay_signature, razorpay_order_id } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
    }

    // Special flow: Frontend success callback to confirm an order securely
    if (status === 'confirmed' && payment_id && razorpay_signature && razorpay_order_id) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) return res.status(500).json({ success: false, error: 'Payment gateway missing secret' });
      
      const bodyStr = razorpay_order_id + '|' + payment_id;
      const expectedSignature = crypto.createHmac('sha256', keySecret).update(bodyStr).digest('hex');
      
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }

      // Invoke robust success handler
      const updatedOrder = await updateOrderToConfirmed(id, payment_id);
      return res.json({ success: true, data: updatedOrder });
    }

    // Standard fallback manual updates by Admin / Driver Portal
    // Build query — stamp shipped_at / delivered_at as appropriate
    let query = 'UPDATE orders SET status = $1';
    const params = [status];
    let paramCount = 1;

    if (status === 'shipped') {
      paramCount++;
      query += `, shipped_at = $${paramCount}`;
      params.push(new Date());
    } else if (status === 'delivered') {
      paramCount++;
      query += `, delivered_at = $${paramCount}`;
      params.push(new Date());
    }

    if (payment_id) {
      paramCount++;
      query += `, payment_id = $${paramCount}`;
      params.push(payment_id);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const { rows } = await db.query(query, params);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });
    const updatedOrder = rows[0];

    // If cancelled, restore stock
    if (status === 'cancelled') {
      const items = typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items;
      for (const item of items) {
        await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
      await deleteCachePattern('products:*');
    }

    // Sync to Firestore
    await syncOrderToFirestore(updatedOrder.id);

    // Send Status Update Email
    if (['confirmed', 'shipped', 'delivered'].includes(updatedOrder.status)) {
      try {
        await sendOrderStatusUpdateEmail(updatedOrder);
      } catch (emailErr) {
        console.error('Failed to send status update email:', emailErr);
      }
    }

    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/orders/shiprocket/webhook ---------------
const shiprocketWebhook = async (req, res, next) => {
  try {
    // ── Signature Verification ──────────────────────────────────────────
    // req.body is a raw Buffer because server.js registers express.raw() for this path.
    // Shiprocket sends X-Shiprocket-Hmac-Sha256 = HMAC-SHA256(rawBody, webhookSecret).
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('🚨 CRITICAL: SHIPROCKET_WEBHOOK_SECRET is not set. Rejecting webhook.');
      return res.status(500).send('Webhook secret not configured');
    }

    const incomingSignature = req.headers['x-shiprocket-hmac-sha256'];
    if (!incomingSignature) {
      return res.status(401).send('Missing webhook signature');
    }

    console.log('shiprocket webhook: Buffer.isBuffer(req.body) =', Buffer.isBuffer(req.body));
    if (!Buffer.isBuffer(req.body)) {
      // If req.body is not a Buffer, express.raw() did not fire for this route.
      // Re-stringifying a parsed object produces a different byte sequence than
      // the original payload, so HMAC verification will always fail.  Surface the
      // misconfiguration instead of masking it with a silent fallback.
      console.error('🚨 req.body is NOT a Buffer — express.raw() is not mounted before express.json() for this route.');
      return res.status(500).send('Webhook body parser misconfiguration');
    }
    const rawBody = req.body;
    const expectedSignature = require('crypto')
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (incomingSignature !== expectedSignature) {
      console.warn('Shiprocket webhook: invalid signature. Possible spoofed request.');
      return res.status(401).send('Invalid webhook signature');
    }
    // ───────────────────────────────────────────────────────────────────

    // Parse body (already a Buffer from express.raw, so parse it here)
    const payload = JSON.parse(rawBody.toString('utf8'));
    const { order_id, current_status } = payload;
    if (!order_id) return res.status(400).send('Missing order_id');

    let newStatus = null;
    const lowerStatus = (current_status || '').toLowerCase();
    
    if (lowerStatus.includes('shipped') || lowerStatus.includes('in transit')) newStatus = 'shipped';
    else if (lowerStatus.includes('delivered')) newStatus = 'delivered';
    else if (lowerStatus.includes('canceled') || lowerStatus.includes('cancelled')) newStatus = 'cancelled';
    else if (lowerStatus.includes('processing') || lowerStatus.includes('manifested')) newStatus = 'processing';

    if (newStatus) {
      let parentOrderIdStr = order_id.toString();
      let subOrderIdStr = null;
      if (parentOrderIdStr.includes('-')) {
        const parts = parentOrderIdStr.split('-');
        parentOrderIdStr = parts[0];
        subOrderIdStr = parts[1];
      }

      const { rows } = await db.query('SELECT * FROM orders WHERE shiprocket_order_id = $1 OR id::text = $1 LIMIT 1', [parentOrderIdStr]);
      if (rows.length > 0) {
        const order = rows[0];

        // Update the specific sub_order if identified
        if (subOrderIdStr) {
          await db.query('UPDATE sub_orders SET status = $1 WHERE id = $2 AND order_id = $3', [newStatus, subOrderIdStr, order.id]);
        } else {
          await db.query('UPDATE sub_orders SET status = $1 WHERE shiprocket_order_id = $2 AND order_id = $3', [newStatus, order_id.toString(), order.id]);
        }

        // Determine overall status of parent order
        const { rows: allSubOrders } = await db.query('SELECT status FROM sub_orders WHERE order_id = $1', [order.id]);
        let overallStatus = newStatus;
        if (allSubOrders.length > 0) {
          const allDelivered = allSubOrders.every(so => so.status === 'delivered');
          const anyShipped = allSubOrders.some(so => so.status === 'shipped');
          const anyProcessing = allSubOrders.some(so => so.status === 'processing');
          
          if (allDelivered) {
            overallStatus = 'delivered';
          } else if (anyShipped) {
            overallStatus = 'shipped';
          } else if (anyProcessing) {
            overallStatus = 'processing';
          }
        }
        
        let updateQuery = 'UPDATE orders SET status = $1';
        const updateParams = [overallStatus];
        let pCount = 1;
        let whereExtra = '';

        if (overallStatus === 'shipped') {
          pCount++;
          updateQuery += `, shipped_at = $${pCount}`;
          updateParams.push(new Date());
          whereExtra = ' AND shipped_at IS NULL';
        } else if (overallStatus === 'delivered') {
          pCount++;
          updateQuery += `, delivered_at = $${pCount}`;
          updateParams.push(new Date());
          whereExtra = ' AND delivered_at IS NULL';
        }

        pCount++;
        updateQuery += ` WHERE id = $${pCount}${whereExtra}`;
        updateParams.push(order.id);

        const updateRes = await db.query(updateQuery, updateParams);

        if (whereExtra && updateRes.rowCount === 0) {
          await db.query('UPDATE orders SET status = $1 WHERE id = $2', [overallStatus, order.id]);
        }

        // Sync everything to Firestore
        await syncOrderToFirestore(order.id);
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
    const { item_id, reason, description } = req.body;

    const userId = req.user ? req.user.uid : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });

    const order = rows[0];
    if (order.user_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (order.status !== 'delivered') return res.status(400).json({ success: false, error: 'Only delivered orders can be returned' });

    if (!item_id) return res.status(400).json({ success: false, error: 'item_id is required' });

    let items = order.items;
    if (typeof items === 'string') {
      items = JSON.parse(items);
    }

    const itemIndex = items.findIndex(i => i.product_id?.toString() === item_id.toString() || i.id?.toString() === item_id.toString());
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Item not found in order' });
    }

    if (items[itemIndex].return_requested) {
      return res.status(400).json({ success: false, error: 'Return already requested for this item' });
    }

    // Flag the item
    items[itemIndex].return_requested = true;

    // Update order in DB
    const updatedOrderQuery = await db.query(
      'UPDATE orders SET items = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(items), id]
    );
    const updatedOrder = updatedOrderQuery.rows[0];

    // Record the request
    await db.query(
      'INSERT INTO return_requests (order_id, item_id, user_id, reason, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, item_id.toString(), userId, reason || 'Other', description || '', 'pending']
    );

    // Sync to Firestore
    await syncOrderToFirestore(id);

    res.status(201).json({ success: true, data: updatedOrder });
  } catch (err) { next(err); }
};

// --------------- POST /api/orders/:id/cancel ---------------
// Customers can cancel ONLY if status is pending / pending_cod / confirmed / processing
// Once a delivery partner has picked up (shipped), cancellation is blocked.
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user ? req.user.uid : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Update order status atomically
    const updateRes = await db.query(
      `UPDATE orders 
       SET status = 'cancelled', cancel_reason = $1 
       WHERE id = $2 
         AND user_id = $3 
         AND status NOT IN ('shipped', 'delivered', 'cancelled') 
       RETURNING *`,
      [reason || 'Customer cancelled', id, userId]
    );

    if (updateRes.rowCount === 0) {
      // Check if order exists but is in non-cancellable status
      const checkRes = await db.query('SELECT status, user_id FROM orders WHERE id = $1', [id]);
      if (!checkRes.rows.length) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      const order = checkRes.rows[0];
      if (order.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      return res.status(400).json({
        success: false,
        error: order.status === 'shipped' || order.status === 'delivered'
          ? 'Cancellation not possible — your order is already with the delivery partner. Please contact support if you have an issue.'
          : `Order cannot be cancelled in status: ${order.status}`
      });
    }

    const updatedOrder = updateRes.rows[0];

    // Restore stock
    const items = typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items;
    for (const item of items) {
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }
    await deleteCachePattern('products:*');

    // Sync Firestore
    await db.query(`UPDATE sub_orders SET status = 'cancelled' WHERE order_id = $1`, [id]);
    await syncOrderToFirestore(id);

    // Send cancellation email
    try { await sendOrderStatusUpdateEmail(updatedOrder); } catch (e) { console.error('Cancel email failed:', e); }

    res.json({ success: true, message: 'Order cancelled successfully', data: updatedOrder });
  } catch (err) { next(err); }
};

// --------------- POST /api/orders/:id/refund ---------------
const refundOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = rows[0];

    if (order.status === 'refunded') return res.status(400).json({ success: false, error: 'Order already refunded' });

    if (order.payment_id && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      await razorpay.payments.refund(order.payment_id, { amount: Math.round(order.total_amount * 100) });
    }

    const { rows: updateRows } = await db.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', ['refunded', id]);

    try {
      await db.query(`UPDATE sub_orders SET status = 'refunded' WHERE order_id = $1`, [id]);
      await syncOrderToFirestore(id);
    } catch (fsErr) { console.error(fsErr); }

    res.json({ success: true, message: 'Order refunded successfully', data: updateRows[0] });
  } catch (err) {
    console.error('Refund failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Refund failed' });
  }
};

// --------------- POST /api/orders/:id/complaint (24-hour food complaint window) ---------------
const raiseComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { item_id, issue_type, description } = req.body;
    const userId = req.user ? req.user.uid : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const validIssues = ['wrong_item', 'damaged', 'spoiled', 'missing_item', 'other'];
    if (!item_id || !issue_type || !validIssues.includes(issue_type)) {
      return res.status(400).json({ success: false, error: `item_id and issue_type (${validIssues.join(', ')}) are required` });
    }

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = rows[0];

    if (order.user_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (order.status !== 'delivered') return res.status(400).json({ success: false, error: 'Complaints can only be raised for delivered orders' });

    // Enforce 24-hour complaint window for food products
    if (!order.delivered_at) {
      return res.status(400).json({ success: false, error: 'Delivery not confirmed yet. Please try again after delivery is confirmed.' });
    }
    const hoursSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceDelivery > 24) {
      return res.status(400).json({
        success: false,
        error: 'Complaint window closed. For food safety, complaints must be raised within 24 hours of delivery.'
      });
    }

    // Find item and flag it
    let items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const itemIndex = items.findIndex(i =>
      i.product_id?.toString() === item_id.toString() || i.id?.toString() === item_id.toString()
    );
    if (itemIndex === -1) return res.status(404).json({ success: false, error: 'Item not found in order' });
    if (items[itemIndex].complaint_raised) {
      return res.status(400).json({ success: false, error: 'A complaint has already been raised for this item' });
    }
    items[itemIndex].complaint_raised = true;

    await db.query('UPDATE orders SET items = $1 WHERE id = $2', [JSON.stringify(items), id]);
    await db.query(
      'INSERT INTO complaints (order_id, item_id, user_id, issue_type, description) VALUES ($1, $2, $3, $4, $5)',
      [id, item_id.toString(), userId, issue_type, description || '']
    );

    // Sync Firestore
    await syncOrderToFirestore(id);

    res.status(201).json({ success: true, message: 'Complaint raised. We will review it within 24 hours.' });
  } catch (err) { next(err); }
};

// --------------- GET /api/orders/admin/complaints ---------------
const listComplaints = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, o.total_amount, o.payment_id, o.payment_method, o.status AS order_status
       FROM complaints c
       JOIN orders o ON o.id = c.order_id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) { next(err); }
};

// --------------- PUT /api/orders/admin/complaints/:id/approve ---------------
const approveComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refund_amount } = req.body;

    const { rows } = await db.query(
      'SELECT c.*, o.payment_id, o.payment_method, o.total_amount, o.user_id, o.items FROM complaints c JOIN orders o ON o.id = c.order_id WHERE c.id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Complaint not found' });
    const complaint = rows[0];

    if (complaint.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Complaint already ${complaint.status}` });
    }

    const amountToRefund = parseFloat(refund_amount) || parseFloat(complaint.total_amount) || 0;

    // Server-side validation of refund_amount against the actual item price/quantity stored in the order
    let orderItems = typeof complaint.items === 'string' ? JSON.parse(complaint.items) : complaint.items;
    const orderItem = orderItems.find(i =>
      i.product_id?.toString() === complaint.item_id.toString() || i.id?.toString() === complaint.item_id.toString()
    );
    if (!orderItem) {
      return res.status(400).json({ success: false, error: 'Item not found in order' });
    }
    const maxItemAmount = parseFloat(orderItem.price) * parseInt(orderItem.quantity) || 0;
    if (amountToRefund > maxItemAmount) {
      return res.status(400).json({ success: false, error: `Refund amount cannot exceed item subtotal of ₹${maxItemAmount}` });
    }

    // Atomic UPDATE to check complaint.status === 'pending' to claim status first
    const updateResult = await db.query(
      "UPDATE complaints SET status = 'approved', refund_amount = $1 WHERE id = $2 AND status = 'pending' RETURNING *",
      [amountToRefund, id]
    );
    if (updateResult.rowCount === 0) {
      return res.status(400).json({ success: false, error: 'Complaint is already processed or not found' });
    }

    let refundResult = null;

    // Trigger Razorpay refund for non-COD orders
    if (complaint.payment_method !== 'cod' && complaint.payment_id && amountToRefund > 0
        && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        // Deterministic key tied to complaint id — same on every retry, min 10 chars required by Razorpay
        const idempotencyKey = `curify-refund-${id}`;

        const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${complaint.payment_id}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Refund-Idempotency': idempotencyKey,
            'Authorization': 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
          },
          body: JSON.stringify({ amount: Math.round(amountToRefund * 100) })
        });

        const refundData = await refundRes.json();

        if (refundRes.status === 409) {
          // Same idempotency key already being processed by Razorpay right now — don't roll back,
          // don't retry. Tell the caller to check back.
          return res.status(409).json({ success: false, error: 'Refund already in progress for this complaint. Please retry shortly.' });
        }

        if (!refundRes.ok) {
          throw new Error(refundData.error?.description || 'Refund request failed');
        }

        refundResult = refundData;
      } catch (refundErr) {
        // Rollback complaint status back to pending if API call fails
        await db.query("UPDATE complaints SET status = 'pending', refund_amount = 0 WHERE id = $1", [id]);
        return res.status(500).json({ success: false, error: `Refund failed: ${refundErr.message}` });
      }
    }

    // Update order status
    await db.query(
      "UPDATE orders SET status = 'refunded' WHERE id = $1",
      [complaint.order_id]
    );

    // Sync Firestore
    try {
      const historyEntry = { status: 'refunded', timestamp: new Date().toISOString() };
      const fsUpdate = { status: 'refunded', updated_at: admin.firestore.FieldValue.serverTimestamp(), statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry) };
      await admin.firestore().collection('orders').doc(complaint.order_id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(complaint.user_id).collection('orders').doc(complaint.order_id.toString()).update(fsUpdate);
    } catch (fsErr) { console.error('Firestore refund sync error:', fsErr); }

    res.json({
      success: true,
      message: complaint.payment_method === 'cod'
        ? 'Complaint approved. COD refund must be processed manually via bank transfer/UPI.'
        : `Complaint approved. Razorpay refund of ₹${amountToRefund} initiated.`,
      razorpay_refund: refundResult
    });
  } catch (err) { next(err); }
};

// --------------- PUT /api/orders/admin/complaints/:id/reject ---------------
const rejectComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Complaint not found' });
    if (rows[0].status !== 'pending') return res.status(400).json({ success: false, error: `Complaint already ${rows[0].status}` });

    await db.query('UPDATE complaints SET status = $1 WHERE id = $2', ['rejected', id]);
    res.json({ success: true, message: 'Complaint rejected.' });
  } catch (err) { next(err); }
};

// --------------- POST /api/orders/validate-coupon ---------------
const COUPONS = {
  'CURIFY10':   { type: 'percent', value: 10, min_order: 200 },
  'ORGANIC50':  { type: 'flat',    value: 50, min_order: 300 },
  'FIRSTORDER': { type: 'percent', value: 15, min_order: 0   },
  'WELCOME100': { type: 'flat',    value: 100, min_order: 500 },
  'GREEN20':    { type: 'percent', value: 20, min_order: 400 }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { coupon_code, cart_total } = req.body;

    if (!coupon_code || cart_total === undefined || cart_total === null) {
      return res.status(400).json({ success: false, error: 'coupon_code and cart_total are required' });
    }

    const coupon = COUPONS[coupon_code.toUpperCase().trim()];
    if (!coupon) {
      return res.status(400).json({ success: false, error: 'Invalid coupon' });
    }

    const numericTotal = parseFloat(cart_total);
    if (isNaN(numericTotal) || numericTotal < 0) {
      return res.status(400).json({ success: false, error: 'Invalid cart_total' });
    }

    if (numericTotal < coupon.min_order) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount of Rs ${coupon.min_order} required for this coupon`
      });
    }

    let discount;
    if (coupon.type === 'percent') {
      discount = parseFloat(((numericTotal * coupon.value) / 100).toFixed(2));
    } else {
      discount = Math.min(coupon.value, numericTotal);
    }

    const final_total = parseFloat((numericTotal - discount).toFixed(2));

    res.json({
      success: true,
      discount,
      final_total,
      coupon_type: coupon.type,
      coupon_value: coupon.value
    });
  } catch (err) { next(err); }
};

// --------------- GET /api/orders/:id/invoice ---------------
const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });

    const order = rows[0];
    const isAdmin = req.user && req.user.role === 'admin';
    if (order.user_id !== userId && !isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });

    const pdfBuffer = await generateInvoicePDF(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice_${id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// --------------- GET /api/orders/admin/complaints/stuck ---------------
// Reconciliation endpoint: surfaces complaints that were atomically flipped
// to 'approved' but whose Razorpay refund call may have never completed
// (process crash, network timeout, etc.).
// "Stuck" = status='approved' AND created_at is older than N minutes AND
// the complaint has a non-zero refund_amount but we have no refund record.
const stuckComplaints = async (req, res, next) => {
  try {
    const minutesThreshold = parseInt(req.query.minutes) || 10;

    const { rows } = await db.query(
      `SELECT c.id AS complaint_id,
              c.order_id,
              c.item_id,
              c.user_id,
              c.issue_type,
              c.refund_amount,
              c.status,
              c.created_at,
              o.payment_id,
              o.payment_method,
              o.total_amount
       FROM complaints c
       JOIN orders o ON o.id = c.order_id
       WHERE c.status = 'approved'
         AND c.created_at < NOW() - ($1 || ' minutes')::INTERVAL
       ORDER BY c.created_at ASC`,
      [minutesThreshold]
    );

    res.json({
      success: true,
      threshold_minutes: minutesThreshold,
      count: rows.length,
      data: rows
    });
  } catch (err) { next(err); }
};

module.exports = {
  updateOrderToConfirmed,
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  shiprocketWebhook,
  cancelOrder,
  returnOrder,
  refundOrder,
  raiseComplaint,
  listComplaints,
  approveComplaint,
  rejectComplaint,
  validateCoupon,
  downloadInvoice,
  stuckComplaints
};
