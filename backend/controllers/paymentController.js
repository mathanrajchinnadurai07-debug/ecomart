const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/database');

const hasRazorpayCredentials = 
  process.env.RAZORPAY_KEY_ID && 
  process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (hasRazorpayCredentials) {
  // Initialise Razorpay instance
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.log('⚠️  Razorpay credentials missing in .env. Running in Backend Dev Mode (mock payments enabled).');
}

// --------------- POST /api/payments/create ---------------
const createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt, notes, items } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    let client;
    if (items && items.length > 0) {
      client = await db.getClient();
      try {
        await client.query('BEGIN');
        for (const item of items) {
          const { rows } = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
          if (!rows.length) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ success: false, error: `Product ${item.name || item.productId} not found` });
          }
          if (rows[0].stock < item.quantity) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ success: false, error: `Insufficient stock for product ${item.name || item.productId}` });
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        if (client) client.release();
      }
    }

    if (!hasRazorpayCredentials) {
      // Dev mock order creation
      return res.status(201).json({
        success: true,
        data: {
          orderId: 'order_dev_' + Date.now(),
          amount: Math.round(amount * 100),
          currency,
          receipt: receipt || `order_rcpt_${Date.now()}`,
          key: 'razorpay_dev_key',
          _dev_mode: true
        },
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: receipt || `order_rcpt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/payments/verify ---------------
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        error: 'razorpay_order_id and razorpay_payment_id are required',
      });
    }

    if (!hasRazorpayCredentials) {
      // Dev mock signature verification
      if (razorpay_order_id.startsWith('order_dev_')) {
        return res.json({
          success: true,
          message: 'Payment verified successfully (dev mode mock)',
          data: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            _dev_mode: true
          },
        });
      }
    }

    if (!razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'razorpay_signature is required',
      });
    }

    // Generate expected signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/payments/webhook ---------------
const paymentWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(200).send('Webhook secret not configured, ignoring');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).send('Signature missing');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      // You can update the order status here if order_id is mapped
      console.log(`Payment captured: ${payment.id} for order ${payment.order_id}`);
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      console.log(`Payment failed: ${payment.id} for order ${payment.order_id}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  paymentWebhook,
};
