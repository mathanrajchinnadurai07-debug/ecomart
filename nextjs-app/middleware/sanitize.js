export function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  // Strip HTML tags using simple regex
  let sanitized = str.replace(/<[^>]*>/g, '');
  // Trim
  sanitized = sanitized.trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export function sanitizeAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) {
    return 0;
  }
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}***@${domain}`;
  }
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length < 4) return '****';
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

export function maskPincode(pincode) {
  if (!pincode || typeof pincode !== 'string') return '';
  return pincode.slice(0, 2) + '*'.repeat(pincode.length - 2);
}

export function maskAddressLine(line) {
  if (!line || typeof line !== 'string') return '';
  if (line.length <= 5) return '*****';
  return line.slice(0, 3) + ' ' + '*'.repeat(Math.min(10, line.length - 3));
}
