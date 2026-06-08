const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Security Tests ---');

  // Test 1: Method validation
  try {
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/create-order',
      method: 'GET'
    });
    console.log(`Test 1 (GET /api/create-order -> 405 Method Not Allowed): ${res1.statusCode === 405 ? 'PASSED ✅' : 'FAILED ❌ (' + res1.statusCode + ')'}`);
  } catch (err) {
    console.error('Test 1 error:', err.message);
  }

  // Test 2: Auth validation
  try {
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/create-order',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { amount: 100 });
    console.log(`Test 2 (POST /api/create-order without token -> 401 Unauthorized): ${res2.statusCode === 401 ? 'PASSED ✅' : 'FAILED ❌ (' + res2.statusCode + ')'}`);
  } catch (err) {
    console.error('Test 2 error:', err.message);
  }

  // Test 3: Valid order creation (Dev mock mode) + Security headers check
  let securityHeadersPassed = false;
  try {
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/create-order',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer firebase_test_uid'
      }
    }, { amount: 150.50, receipt: 'receipt_test_123' });

    const codePassed = res3.statusCode === 200;
    const bodyPassed = res3.body && res3.body.id && res3.body._dev_mode;

    const hContentType = res3.headers['x-content-type-options'] === 'nosniff';
    const hFrame = res3.headers['x-frame-options'] === 'DENY';
    const hCsp = !!res3.headers['content-security-policy'];

    securityHeadersPassed = hContentType && hFrame && hCsp;

    console.log(`Test 3 (POST /api/create-order with mock token -> 200 OK + Mock details): ${codePassed && bodyPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Test 4 (Security Headers -> X-Content-Type-Options: nosniff, X-Frame-Options: DENY, CSP): ${securityHeadersPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (err) {
    console.error('Test 3/4 error:', err.message);
  }

  // Test 5: Rate limiting check (10 req/min limit, 11th request should receive 429)
  console.log('Testing Rate Limiter (Sending 12 requests)...');
  let rateLimitHit = false;
  let statusCodes = [];
  for (let i = 0; i < 12; i++) {
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/create-order',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer firebase_test_uid'
        }
      }, { amount: 10, receipt: `receipt_loop_${i}` });
      statusCodes.push(res.statusCode);
      if (res.statusCode === 429) {
        rateLimitHit = true;
      }
    } catch (err) {
      // ignore
    }
  }
  console.log(`StatusCodes returned: ${statusCodes.join(', ')}`);
  console.log(`Test 5 (Rate Limiter 429 triggered): ${rateLimitHit ? 'PASSED ✅' : 'FAILED ❌ (No 429 code returned)'}`);

  console.log('--- API Security Tests Finished ---');
}

// Give dev server a couple of seconds to make sure it's up before running
setTimeout(() => {
  runTests();
}, 2000);
