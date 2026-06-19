const db = require('../config/database');
const admin = require('firebase-admin');

// --------------- GET /api/delivery/jobs/:email ---------------
const getJobsByDriver = async (req, res, next) => {
  try {
    const { email } = req.params;

    const { rows } = await db.query(
      'SELECT dj.*, o.address as order_address, o.user_id as order_user_id, o.payment_id FROM delivery_jobs dj JOIN orders o ON dj.order_id = o.id WHERE dj.driver_email = $1 ORDER BY dj.created_at DESC',
      [email]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// --------------- PUT /api/delivery/jobs/:id/status ---------------
const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g., 'picked_up', 'in_transit', 'delivered'

    const allowedStatuses = ['pending', 'picked_up', 'in_transit', 'delivered'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { rows: jobRows } = await db.query(
      'UPDATE delivery_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (!jobRows.length) {
      return res.status(404).json({ success: false, error: 'Delivery job not found' });
    }

    const job = jobRows[0];
    const orderId = job.order_id;

    // Check if we need to update the global Order status
    let newOrderStatus = null;
    if (status === 'picked_up' || status === 'in_transit') {
      newOrderStatus = 'shipped'; // Out for Delivery
    } else if (status === 'delivered') {
      // Check if ALL jobs for this order are delivered
      const { rows: allJobs } = await db.query('SELECT status FROM delivery_jobs WHERE order_id = $1', [orderId]);
      const allDelivered = allJobs.every(j => j.status === 'delivered');
      if (allDelivered) {
        newOrderStatus = 'delivered';
      }
    }

    if (newOrderStatus) {
      // Update order status in DB
      const { rows: orderRows } = await db.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [newOrderStatus, orderId]
      );
      
      const updatedOrder = orderRows[0];

      // Push to Firestore statusHistory
      try {
        const historyEntry = { status: newOrderStatus, timestamp: new Date().toISOString() };
        const fsUpdate = {
          status: newOrderStatus,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
        };
        await admin.firestore().collection('orders').doc(orderId.toString()).update(fsUpdate);
        await admin.firestore().collection('users').doc(updatedOrder.user_id).collection('orders').doc(orderId.toString()).update(fsUpdate);
      } catch (fsErr) {
        console.error('Error syncing delivery webhook status to Firestore:', fsErr);
      }
    }

    res.json({ success: true, data: job, orderStatusUpdatedTo: newOrderStatus });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getJobsByDriver,
  updateJobStatus
};
