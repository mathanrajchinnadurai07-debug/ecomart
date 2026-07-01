const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// --------------- Startup Secrets Guard ---------------
// In production, any missing critical env var causes an immediate hard exit.
// This prevents the app from starting with silent auth bypass or misconfigured webhooks.
const REQUIRED_IN_PRODUCTION = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'SHIPROCKET_EMAIL',
  'SHIPROCKET_PASSWORD',
  'SHIPROCKET_WEBHOOK_SECRET',
];

if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_IN_PRODUCTION.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length > 0) {
    console.error('');
    console.error('🚨 FATAL: Missing required environment variables in production:');
    missing.forEach(k => console.error('   ❌ ' + k));
    console.error('');
    console.error('Server will NOT start. Set all required env vars and restart.');
    process.exit(1);
  }
} else {
  const missing = REQUIRED_IN_PRODUCTION.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length > 0) {
    console.warn('⚠️  DEV MODE: The following env vars are not set (OK for local dev, required in production):');
    missing.forEach(k => console.warn('   ⚪ ' + k));
  }
}

const app = express();

// --------------- Middleware ---------------
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(compression());
// Webhook must be parsed as raw Buffer before express.json
// Both Razorpay and Shiprocket webhooks need the raw body for HMAC verification.
const paymentRoutes = require('./routes/payments');
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments', paymentRoutes);
app.use('/api/orders/shiprocket/webhook', express.raw({ type: ['application/json', '*/*'] }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const newsletterRoutes = require('./routes/newsletter');
const reviewRoutes = require('./routes/reviews');
const sellerRoutes = require('./routes/sellers');
const deliveryRoutes = require('./routes/delivery');

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
// /api/payments is already mounted above for the webhook
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/delivery', deliveryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test auth path (gated strictly to test environments)
if (process.env.NODE_ENV === 'test') {
  app.post('/api/test/auth/token', (req, res) => {
    const { uid = 'test_uid', email = 'test@example.com', role = 'customer', name = 'Test User' } = req.body;
    const payload = { uid, email, role, name };
    const token = 'test_jwt_' + Buffer.from(JSON.stringify(payload)).toString('base64');
    res.json({ token });
  });
  console.log('🧪 Mounted test-only auth token path (/api/test/auth/token)');
}

// --------------- Error Handler ---------------
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 EcoMart Backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
