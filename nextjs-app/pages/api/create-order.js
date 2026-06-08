import Razorpay from 'razorpay';
import { checkRateLimit } from '../../middleware/rate-limiter';
import { sanitizeAmount, sanitizeString } from '../../middleware/sanitize';
import { verifyAuth } from '../../middleware/auth';

export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting Check
  if (checkRateLimit(req, res)) {
    return;
  }

  // Authorization Check
  const authenticatedUser = verifyAuth(req);
  if (!authenticatedUser) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  try {
    let { amount, currency = 'INR', receipt } = req.body;

    // Sanitize inputs
    amount = sanitizeAmount(amount);
    currency = sanitizeString(currency, 10) || 'INR';
    receipt = sanitizeString(receipt, 100);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Initialize Razorpay - will use env vars if available, otherwise return mock for dev
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // Development mode - return mock order for testing
      return res.status(200).json({
        id: 'order_dev_' + Date.now(),
        entity: 'order',
        amount: Math.round(amount * 100),
        amount_paid: 0,
        amount_due: Math.round(amount * 100),
        currency: currency,
        receipt: receipt || 'receipt_' + Date.now(),
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
        _dev_mode: true
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: currency,
      receipt: receipt || 'receipt_' + Date.now(),
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
}
