const db = require('../config/database');
const axios = require('axios');
const { authenticateShiprocket } = require('../config/shiprocket');

// GET /api/sellers
// Admins see all fields; authenticated non-admins see only public-safe fields.
// PII (phone, address, email, bank/payout details) is stripped for non-admins.
const getSellers = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';

    let rows;
    if (isAdmin) {
      // Full data for admins
      const result = await db.query('SELECT * FROM sellers ORDER BY name ASC');
      rows = result.rows;
    } else {
      // Fetch sellers; strip PII for all except the seller's own profile.
      const result = await db.query(
        'SELECT id, name, email, phone, address, is_active, is_demo FROM sellers WHERE is_active = TRUE ORDER BY name ASC'
      );
      rows = result.rows.map(row => {
        if (req.user && req.user.email === row.email) {
          // Keep PII for their own profile
          return row;
        } else {
          // Strip PII fields
          const { email, phone, address, ...publicSafe } = row;
          return publicSafe;
        }
      });
    }

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/sellers
const createSeller = async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || !email || !address) {
      return res.status(400).json({ success: false, error: 'name, email, and address are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO sellers (name, email, phone, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, phone || null, typeof address === 'string' ? address : JSON.stringify(address)]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'A seller with this email already exists' });
    }
    next(err);
  }
};

// PUT /api/sellers/:id
const updateSeller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, is_active } = req.body;

    if (!name || !email || !address) {
      return res.status(400).json({ success: false, error: 'name, email, and address are required' });
    }

    const { rows } = await db.query(
      `UPDATE sellers
       SET name = $1, email = $2, phone = $3, address = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, email, phone || null, typeof address === 'string' ? address : JSON.stringify(address), is_active !== false, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'A seller with this email already exists' });
    }
    next(err);
  }
};

// DELETE /api/sellers/:id
const deleteSeller = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete (setting is_active = false)
    const { rows } = await db.query(
      `UPDATE sellers
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, message: 'Seller deactivated successfully', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/seller/sub-orders
const getSellerSubOrders = async (req, res, next) => {
  try {
    const sellerEmail = req.user.email;
    if (!sellerEmail) return res.status(400).json({ success: false, error: 'Seller email not found in token' });

    const sellerRes = await db.query('SELECT id FROM sellers WHERE email = $1 AND is_active = TRUE', [sellerEmail]);
    if (!sellerRes.rows.length) return res.status(403).json({ success: false, error: 'No active seller account for this user' });
    const sellerId = sellerRes.rows[0].id;

    const { rows } = await db.query(`
      SELECT
        so.id,
        so.order_id,
        so.status,
        so.shiprocket_order_id,
        so.awb_code,
        so.tracking_url,
        so.order_items,
        o.total_amount,
        o.created_at,
        o.address
      FROM sub_orders so
      JOIN orders o ON o.id = so.order_id
      WHERE so.seller_id = $1
      ORDER BY o.created_at DESC
    `, [sellerId]);

    const data = rows.map(row => ({
      ...row,
      address: typeof row.address === 'string' ? JSON.parse(row.address) : (row.address || {}),
      order_items: typeof row.order_items === 'string' ? JSON.parse(row.order_items) : (row.order_items || [])
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/seller/sub-orders/:id/label
const getShiprocketLabel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerEmail = req.user.email;

    const sellerRes = await db.query('SELECT id FROM sellers WHERE email = $1 AND is_active = TRUE', [sellerEmail]);
    if (!sellerRes.rows.length) return res.status(403).json({ success: false, error: 'Not a seller' });
    const sellerId = sellerRes.rows[0].id;

    const { rows } = await db.query('SELECT * FROM sub_orders WHERE id = $1 AND seller_id = $2', [id, sellerId]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Sub-order not found or unauthorized' });

    const subOrder = rows[0];
    if (!subOrder.shiprocket_order_id) return res.status(400).json({ success: false, error: 'No Shiprocket order ID for this sub-order' });

    const token = await authenticateShiprocket();
    if (!token) return res.status(503).json({ success: false, error: 'Shiprocket auth failed' });

    const labelRes = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${subOrder.shiprocket_order_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const labelUrl = labelRes.data?.label_url;
    if (!labelUrl) return res.status(404).json({ success: false, error: 'Label URL not available yet' });

    res.json({ success: true, label_url: labelUrl });
  } catch (err) { next(err); }
};

module.exports = {
  getSellers,
  createSeller,
  updateSeller,
  deleteSeller,
  getSellerSubOrders,
  getShiprocketLabel
};
