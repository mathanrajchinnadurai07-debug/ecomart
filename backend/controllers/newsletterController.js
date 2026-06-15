const db = require('../config/database');
const crypto = require('crypto');

// --------------- POST /api/newsletter ---------------
const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { rowCount } = await db.query(
      `INSERT INTO newsletter_subscribers (email, token, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE SET is_active = true, token = $2`,
      [email, token]
    );

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    next(err);
  }
};

// --------------- DELETE /api/newsletter/:token ---------------
const unsubscribe = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const { rowCount } = await db.query(
      `UPDATE newsletter_subscribers SET is_active = false WHERE token = $1`,
      [token]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  subscribe,
  unsubscribe
};
