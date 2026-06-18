const db = require('../config/database');

// GET /api/sellers
const getSellers = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM sellers ORDER BY name ASC'
    );
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

module.exports = {
  getSellers,
  createSeller,
  updateSeller,
  deleteSeller
};
