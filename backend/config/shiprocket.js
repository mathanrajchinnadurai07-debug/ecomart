const axios = require('axios');

let shiprocketToken = null;
let tokenExpiry = null;

const authenticateShiprocket = async () => {
  try {
    if (shiprocketToken && tokenExpiry && new Date() < tokenExpiry) {
      return shiprocketToken;
    }

    const { SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD } = process.env;
    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
      console.warn('Shiprocket credentials missing. Skipping authentication.');
      return null;
    }

    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD
    });

    shiprocketToken = response.data.token;
    // Token is valid for 10 days, we set expiry to 9 days to be safe
    tokenExpiry = new Date(new Date().getTime() + 9 * 24 * 60 * 60 * 1000);
    return shiprocketToken;
  } catch (error) {
    console.error('Shiprocket authentication failed:', error.response?.data || error.message);
    return null;
  }
};

const createShiprocketOrder = async (orderData) => {
  const token = await authenticateShiprocket();
  if (!token) return null;

  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Shiprocket order creation failed:', error.response?.data || error.message);
    return null;
  }
};

module.exports = {
  authenticateShiprocket,
  createShiprocketOrder
};
