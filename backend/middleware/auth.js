const admin = require('firebase-admin');

const hasFirebaseCredentials = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_PRIVATE_KEY && 
  process.env.FIREBASE_CLIENT_EMAIL;

const isDevMode = !hasFirebaseCredentials;

if (isDevMode) {
  console.log('⚠️  Firebase Admin credentials missing in .env. Running in Backend Dev Mode (mock auth enabled).');
} else {
  // Initialise Firebase Admin SDK (once)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
}

/**
 * Verify Firebase ID token from the Authorization header.
 * Attaches decoded user info to req.user.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (isDevMode) {
      // Dev mode: accept mock tokens or fall back to default dev user
      let uid = 'dev_user_uid';
      let email = 'dev_user@example.com';
      let name = 'Developer User';
      let role = 'admin'; // default to admin for ease of dev testing

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        if (token.startsWith('firebase_')) {
          uid = token.split('firebase_')[1];
        }
        if (token.includes('customer')) {
          role = 'customer';
        }
      }

      req.user = { uid, email, name, role };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized – no token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || '',
      role: (decoded.role === 'admin' || decoded.email === 'curfee01@gmail.com') ? 'admin' : 'customer',
    };

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Unauthorized – invalid token' });
  }
};

/**
 * Require admin role (must run AFTER verifyToken).
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden – admin access required' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };
