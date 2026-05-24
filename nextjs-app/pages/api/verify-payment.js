import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      // Development mode - accept all payments
      if (razorpay_order_id.startsWith('order_dev_')) {
        return res.status(200).json({
          verified: true,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          _dev_mode: true
        });
      }
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
