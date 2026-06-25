const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/database');
const admin = require('firebase-admin');
const { updateOrderToConfirmed } = require('./orderController'); // We will export this helper

// --------------- POST /api/payments/webhook ---------------
const paymentWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // 500 — NOT 200. A 200 silently accepts all unauthenticated events and hides
      // the misconfiguration. Razorpay will retry on 5xx, making the failure visible
      // in the Razorpay dashboard and in server logs.
      console.error('🚨 CRITICAL: RAZORPAY_WEBHOOK_SECRET is not set. Rejecting webhook.');
      return res.status(500).send('Webhook secret not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).send('Signature missing');
    }

    // req.body is a raw Buffer because we used express.raw() in server.js
    const rawBody = req.body.toString('utf8');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const payloadObj = JSON.parse(rawBody);
    const event = payloadObj.event;
    const payload = payloadObj.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      console.log(`Webhook: Payment captured: ${payment.id} for Razorpay order ${payment.order_id}`);

      // Lookup internal order by razorpay_order_id
      const { rows } = await db.query('SELECT * FROM orders WHERE razorpay_order_id = $1', [payment.order_id]);
      
      if (rows.length > 0) {
        const order = rows[0];
        
        // If order is still pending, update it using the robust helper
        if (order.status === 'pending') {
          console.log(`Webhook: Order ${order.id} is pending. Force confirming now...`);
          await updateOrderToConfirmed(order.id, payment.id);
        } else {
          console.log(`Webhook: Order ${order.id} already has status ${order.status}, skipping update.`);
        }
      } else {
        console.log(`Webhook: Internal order not found for Razorpay order ${payment.order_id}`);
      }

    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      console.log(`Webhook: Payment failed: ${payment.id} for Razorpay order ${payment.order_id}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).send('Webhook Error');
  }
};

module.exports = {
  paymentWebhook,
};
