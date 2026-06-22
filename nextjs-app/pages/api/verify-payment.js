import crypto from 'crypto';
import { checkRateLimit } from '../../middleware/rate-limiter';
import { sanitizeString } from '../../middleware/sanitize';
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
    let { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Sanitize inputs
    razorpay_order_id = sanitizeString(razorpay_order_id, 100);
    razorpay_payment_id = sanitizeString(razorpay_payment_id, 100);
    razorpay_signature = sanitizeString(razorpay_signature, 200);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({ error: 'Razorpay payment gateway not configured (missing secret)' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.status(200).json({
        verified: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
    } else {
      res.status(400).json({
        verified: false,
        error: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
}
