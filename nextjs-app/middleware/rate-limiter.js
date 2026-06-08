const rateLimitMap = new Map();

// Periodic cleanup of stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(req, res) {
  // Extract IP
  const ip = 
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  const windowMs = 60 * 1000; // 60 seconds
  const maxRequests = 10;     // 10 requests per window

  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // New window or new IP
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitMap.set(ip, record);
    return false;
  }

  // Increment request count
  record.count += 1;

  if (record.count > maxRequests) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
    return true;
  }

  return false;
}
