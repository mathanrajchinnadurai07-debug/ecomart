export function verifyAuth(req) {
  // If in dev/mock mode (no Razorpay keys), we can allow a fallback
  const isDevMode = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (isDevMode) {
      return { uid: 'dev_user_uid', email: 'dev@ecomart.com' };
    }
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];

  // In dev/mock mode, also allow the simpler mock token format stored in localStorage
  if (isDevMode && token.startsWith('firebase_')) {
    const uid = token.replace('firebase_', '');
    return { uid, email: `${uid}@dev.com` };
  }

  // Firebase JWT ID token validation
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return null;

    const payloadBuf = Buffer.from(tokenParts[1], 'base64url');
    const payload = JSON.parse(payloadBuf.toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      console.warn('Token expired');
      return null;
    }

    const expectedIss = `https://securetoken.google.com/ecomart-6a21a`;
    if (payload.iss !== expectedIss) {
      console.warn('Token issuer mismatch:', payload.iss);
      return null;
    }

    if (payload.aud !== 'ecomart-6a21a') {
      console.warn('Token audience mismatch:', payload.aud);
      return null;
    }

    return {
      uid: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified
    };
  } catch (err) {
    console.error('JWT verification error:', err);
    return null;
  }
}
