// --------------- GET /api/orders/user/:userId ---------------
const getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { rows } = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) { next(err); }
};

// --------------- GET /api/orders/:id ---------------
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// --------------- PUT /api/orders/:id/status ---------------
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_id, razorpay_signature, razorpay_order_id } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: \`Invalid status. Allowed: \${allowedStatuses.join(', ')}\` });
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
    try {
      const historyEntry = { status: updatedOrder.status, timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: updatedOrder.status,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      if (updatedOrder.payment_id) fsUpdate.payment_id = updatedOrder.payment_id;
      
      await admin.firestore().collection('orders').doc(updatedOrder.id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(updatedOrder.user_id).collection('orders').doc(updatedOrder.id.toString()).update(fsUpdate);
    } catch (fsErr) {
      console.error('Error syncing order status update to Firestore:', fsErr);
    }

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
    const { order_id, current_status } = req.body;
    if (!order_id) return res.status(400).send('Missing order_id');

    let newStatus = null;
    const lowerStatus = (current_status || '').toLowerCase();
    
    if (lowerStatus.includes('shipped') || lowerStatus.includes('in transit')) newStatus = 'shipped';
    else if (lowerStatus.includes('delivered')) newStatus = 'delivered';
    else if (lowerStatus.includes('canceled') || lowerStatus.includes('cancelled')) newStatus = 'cancelled';
    else if (lowerStatus.includes('processing') || lowerStatus.includes('manifested')) newStatus = 'processing';

    if (newStatus) {
      const { rows } = await db.query('SELECT * FROM orders WHERE shiprocket_order_id = $1 OR id::text = $1 LIMIT 1', [order_id.toString()]);
      if (rows.length > 0) {
        const order = rows[0];
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order.id]);
        try {
          const historyEntry = { status: newStatus, timestamp: new Date().toISOString() };
          const fsUpdate = {
            status: newStatus,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
          };
          await admin.firestore().collection('orders').doc(order.id.toString()).update(fsUpdate);
          await admin.firestore().collection('users').doc(order.user_id).collection('orders').doc(order.id.toString()).update(fsUpdate);
        } catch (fsErr) { console.error(fsErr); }
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
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found' });

    const order = rows[0];
    if (order.status !== 'delivered') return res.status(400).json({ success: false, error: 'Only delivered orders can be returned' });

    const updatedOrderQuery = await db.query(
      'UPDATE orders SET status = $1, return_reason = $2 WHERE id = $3 RETURNING *',
      ['return_requested', reason || 'Customer requested return', id]
    );
    const updatedOrder = updatedOrderQuery.rows[0];

    try {
      const historyEntry = { status: 'return_requested', timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: 'return_requested', return_reason: reason || 'Customer requested return',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      await admin.firestore().collection('orders').doc(id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(updatedOrder.user_id).collection('orders').doc(id.toString()).update(fsUpdate);
    } catch (fsErr) { console.error(fsErr); }

    res.json({ success: true, data: updatedOrder });
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
      const historyEntry = { status: 'refunded', timestamp: new Date().toISOString() };
      const fsUpdate = {
        status: 'refunded', updated_at: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };
      await admin.firestore().collection('orders').doc(id.toString()).update(fsUpdate);
      await admin.firestore().collection('users').doc(order.user_id).collection('orders').doc(id.toString()).update(fsUpdate);
    } catch (fsErr) { console.error(fsErr); }

    res.json({ success: true, message: 'Order refunded successfully', data: updateRows[0] });
  } catch (err) {
    console.error('Refund failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Refund failed' });
  }
};

module.exports = {
  updateOrderToConfirmed,
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  shiprocketWebhook,
  returnOrder,
  refundOrder,
};
