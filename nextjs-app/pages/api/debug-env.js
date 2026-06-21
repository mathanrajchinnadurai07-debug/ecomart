// TEMPORARY DEBUG ENDPOINT - DELETE AFTER USE
export default function handler(req, res) {
  // Never expose actual key values - only check if they exist
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  res.status(200).json({
    RAZORPAY_KEY_ID_set: !!keyId && keyId.length > 0,
    RAZORPAY_KEY_ID_starts_with: keyId ? keyId.substring(0, 8) : 'MISSING',
    RAZORPAY_KEY_SECRET_set: !!keySecret && keySecret.length > 0,
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
