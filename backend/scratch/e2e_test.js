// Curify Launch Readiness E2E Integration Test Suite
// Run using: node scratch/e2e_test.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.MOCK_PAYMENTS = 'true';
process.env.RAZORPAY_KEY_ID = 'test_key_123';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_123';
process.env.PLATFORM_COMMISSION_PCT = '12.5'; // 12.5% platform commission

const crypto = require('crypto');
const http = require('http');

// 1. Monkeypatch modules before loading the server to stub network side-effects
const Razorpay = require('razorpay');
class MockRazorpay {
  constructor(options) {
    this.key_id = options.key_id;
    this.key_secret = options.key_secret;
    this.orders = {
      create: async (opt) => {
        console.log('💳 [MOCK] Razorpay orders.create called with:', JSON.stringify(opt));
        return {
          id: 'order_rzp_' + Math.random().toString(36).substr(2, 9),
          amount: opt.amount,
          currency: opt.currency,
          receipt: opt.receipt,
          status: 'created'
        };
      }
    };
    this.transfers = {
      create: async (opt) => {
        console.warn(`[MOCK] razorpay.transfers.create called for account: ${opt.account}, amount: ${opt.amount}`);
        return {
          id: "trf_mock_" + Math.random().toString(36).substr(2, 9),
          entity: "transfer",
          account: opt.account,
          amount: opt.amount,
          currency: "INR",
          status: "processed"
        };
      }
    };
  }
}
require.cache[require.resolve('razorpay')].exports = MockRazorpay;

const shiprocket = require('../config/shiprocket');
shiprocket.createShiprocketOrder = async (orderData) => {
  console.log(`✈️ [MOCK] Shiprocket createShiprocketOrder for pickup: "${orderData.pickup_location}"`);
  return {
    order_id: 'sr_order_' + Math.random().toString(36).substr(2, 9),
    shipment_id: 'sr_ship_id_' + Math.random().toString(36).substr(2, 9)
  };
};

// Disable actual Redis cache connection side effects for test suite
const redis = require('../config/redis');
redis.getCache = async () => null;
redis.setCache = async () => null;
redis.deleteCachePattern = async () => null;

const db = require('../config/database');
const app = require('../server');

// Helper to make local http requests
function request(port, path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

(async () => {
  console.log('\n🏁 Starting Curify E2E Integration Test Suite...\n');
  
  // Start express server on a random free port
  const server = app.listen(0, async () => {
    const port = server.address().port;
    console.log(`📡 Test server running locally on port ${port}\n`);

    try {
      // 1. Fetch Dynamic Test Products representing two different sellers
      const p1Res = await db.query('SELECT id, name, price FROM products WHERE seller_id = 1 LIMIT 1');
      const p2Res = await db.query('SELECT id, name, price FROM products WHERE seller_id = 2 LIMIT 1');

      if (p1Res.rows.length === 0 || p2Res.rows.length === 0) {
        throw new Error('❌ Test products not found. Please run seed script first.');
      }

      const prod1 = p1Res.rows[0];
      const prod2 = p2Res.rows[0];
      console.log(`🥬 Central Store (Seller 1) Product: "${prod1.name}" - ₹${prod1.price}`);
      console.log(`🍪 Demo Store (Seller 2) Product: "${prod2.name}" - ₹${prod2.price}\n`);

      // 2. Fetch Test Auth Token via test-only endpoint
      console.log('🔑 Step 2: Fetching test auth token...');
      const authRes = await request(port, '/api/test/auth/token', 'POST', {}, {
        uid: 'test_audit_customer_123',
        email: 'audit_customer@curify.com',
        role: 'customer',
        name: 'Audit Customer'
      });

      if (authRes.status !== 200 || !authRes.body.token) {
        throw new Error('❌ Test auth token acquisition failed: ' + JSON.stringify(authRes.body));
      }
      const token = authRes.body.token;
      console.log('✅ Test token received.');

      // 3. Place Order (Prepaid Path)
      console.log('\n🛒 Step 3: Placing prepaid order with items from both sellers...');
      const cartItems = [
        { product_id: prod1.id, name: prod1.name, price: parseFloat(prod1.price), quantity: 1, seller_id: 1 },
        { product_id: prod2.id, name: prod2.name, price: parseFloat(prod2.price), quantity: 2, seller_id: 2 }
      ];
      const totalAmount = parseFloat(prod1.price) + (parseFloat(prod2.price) * 2);

      const orderPayload = {
        user_id: 'test_audit_customer_123',
        items: cartItems,
        total_amount: totalAmount,
        address: {
          name: 'Audit Customer',
          phone: '9876543210',
          email: 'audit_customer@curify.com',
          line1: '123 Coconut Grove Road',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641001'
        }
      };

      const orderRes = await request(port, '/api/orders', 'POST', {
        'Authorization': `Bearer ${token}`
      }, orderPayload);

      if (orderRes.status !== 201 || !orderRes.body.success) {
        throw new Error('❌ Order placement failed: ' + JSON.stringify(orderRes.body));
      }

      const orderId = orderRes.body.data.id;
      const rzpOrderId = orderRes.body.razorpay_order_id;
      console.log(`✅ Order placed successfully! DB ID: ${orderId}, Razorpay Order ID: ${rzpOrderId}`);

      // 4. Update order status to confirmed (simulating Razorpay payment callback)
      console.log('\n💳 Step 4: Simulating Razorpay payment success callback...');
      const paymentId = 'pay_test_' + Math.random().toString(36).substr(2, 9);
      
      // Calculate valid signature for the test secrets
      const bodyStr = rzpOrderId + '|' + paymentId;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(bodyStr)
        .digest('hex');

      const updateRes = await request(port, `/api/orders/${orderId}/status`, 'PUT', {
        'Authorization': `Bearer ${token}`
      }, {
        status: 'confirmed',
        payment_id: paymentId,
        razorpay_order_id: rzpOrderId,
        razorpay_signature: signature
      });

      if (updateRes.status !== 200 || !updateRes.body.success) {
        throw new Error('❌ Payment confirmation / status update failed: ' + JSON.stringify(updateRes.body));
      }
      console.log('✅ Order updated to confirmed with valid signature verification.');

      // 5. Database Verification
      console.log('\n📊 Step 5: Verifying database state for sub-orders and split payments...');
      
      // Verify sub_orders count
      const subOrdersQuery = await db.query(
        'SELECT so.id, so.order_id, so.seller_id, so.status, so.shiprocket_order_id, s.name, s.pickup_location, s.razorpay_account_id FROM sub_orders so JOIN sellers s ON so.seller_id = s.id WHERE so.order_id = $1 ORDER BY so.seller_id',
        [orderId]
      );

      console.log('Sub-orders retrieved from DB:');
      console.log(JSON.stringify(subOrdersQuery.rows, null, 2));

      if (subOrdersQuery.rows.length !== 2) {
        throw new Error(`❌ Expected exactly 2 sub_orders, but found: ${subOrdersQuery.rows.length}`);
      }

      const sub1 = subOrdersQuery.rows[0];
      const sub2 = subOrdersQuery.rows[1];

      // Verify seller IDs
      if (sub1.seller_id !== 1 || sub2.seller_id !== 2) {
        throw new Error(`❌ Sub-order seller distribution mismatch.`);
      }

      // Verify statuses
      if (sub1.status !== 'confirmed' || sub2.status !== 'confirmed') {
        throw new Error('❌ Sub-orders status should be updated to confirmed.');
      }

      // Verify Shiprocket Order IDs were updated
      if (!sub1.shiprocket_order_id || !sub2.shiprocket_order_id) {
        throw new Error('❌ Shiprocket order IDs were not registered on sub-orders.');
      }

      console.log('\n🎉 ALL INTEGRATION TEST ASSERTIONS PASSED! ✅');
      
      // Clean up test order data to keep database tidy
      await db.query('DELETE FROM sub_orders WHERE order_id = $1', [orderId]);
      await db.query('DELETE FROM orders WHERE id = $1', [orderId]);
      console.log('🧹 Cleaned up test order records.');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ E2E INTEGRATION TEST FAILED:\n', err);
      server.close();
      process.exit(1);
    }
  });
})();
