const db = require('../config/database');
const { deleteCachePattern } = require('../config/redis');

// --------------- POST /api/orders ---------------
const createOrder = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { user_id, items, total_amount, address } = req.body;

    if (!user_id || !items || !items.length || !total_amount) {
      return res.status(400).json({ success: false, error: 'user_id, items, and total_amount are required' });
    }

    await client.query('BEGIN');

    // Verify stock for each item
    for (const item of items) {
      const { rows } = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
      }
      if (rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Insufficient stock for product ${item.product_id}` });
      }
      // Decrement stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Create the order
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, items, total_amount, address, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [user_id, JSON.stringify(items), total_amount, JSON.stringify(address || {})]
    );

    await client.query('COMMIT');

    // Invalidate relevant caches
    await deleteCachePattern('products:*');

    res.status(201).json({ success: true, data: rows[0] });
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

    // If cancelled, restore stock
    if (status === 'cancelled') {
      const items = rows[0].items;
      for (const item of items) {
        await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
      await deleteCachePattern('products:*');
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
};
