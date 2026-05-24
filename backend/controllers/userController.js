const db = require('../config/database');

// --------------- GET /api/users/:id ---------------
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- PUT /api/users/:id ---------------
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const { rows } = await db.query(
      `UPDATE users
       SET name  = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone)
       WHERE id = $4 RETURNING *`,
      [name, email, phone, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    // Handle unique email constraint
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    next(err);
  }
};

// --------------- POST /api/users/address ---------------
const addAddress = async (req, res, next) => {
  try {
    const { user_id, address } = req.body;

    if (!user_id || !address) {
      return res.status(400).json({ success: false, error: 'user_id and address are required' });
    }

    // Append address to the JSONB addresses array
    const { rows } = await db.query(
      `UPDATE users
       SET addresses = COALESCE(addresses, '[]'::jsonb) || $1::jsonb
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(address), user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/users (create / upsert on first login) ---------------
const createUser = async (req, res, next) => {
  try {
    const { id, name, email, phone } = req.body;

    if (!id || !email) {
      return res.status(400).json({ success: false, error: 'id and email are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO users (id, name, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name  = COALESCE(EXCLUDED.name, users.name),
         email = COALESCE(EXCLUDED.email, users.email),
         phone = COALESCE(EXCLUDED.phone, users.phone)
       RETURNING *`,
      [id, name || '', email, phone || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    next(err);
  }
};

module.exports = {
  getUserById,
  updateUser,
  addAddress,
  createUser,
};
