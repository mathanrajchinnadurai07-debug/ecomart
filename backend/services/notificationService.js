const { Resend } = require('resend');
const { DELIVERY_PARTNER_EMAIL } = require('../config/constants');

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock123');

async function notifySeller(seller, items, orderId) {
  try {
    await resend.emails.send({
      from: 'Curify Vendor Portal <orders@curifyorganic.com>',
      to: seller.email,
      subject: `New Order #${orderId} — Items to Prepare 🌿`,
      html: buildSellerEmailHTML(seller, items, orderId),
    });
    console.log(`[NotificationService] Seller email sent successfully to ${seller.email} for order #${orderId}`);
    return { success: true };
  } catch (err) {
    console.error(`[NotificationService] Seller email failed for order ${orderId}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function notifyDeliveryPartner(seller, deliveryAddress, jobId, orderId) {
  try {
    await resend.emails.send({
      from: 'Curify Delivery <orders@curifyorganic.com>',
      to: DELIVERY_PARTNER_EMAIL,
      subject: `Delivery Job #${jobId} — Pickup from ${seller.name} 📦`,
      html: buildDeliveryEmailHTML(seller, deliveryAddress, jobId, orderId),
    });
    console.log(`[NotificationService] Delivery email sent successfully to ${DELIVERY_PARTNER_EMAIL} for job #${jobId}`);
    return { success: true };
  } catch (err) {
    console.error(`[NotificationService] Delivery email failed for job ${jobId}:`, err.message);
    return { success: false, error: err.message };
  }
}

function buildSellerEmailHTML(seller, items, orderId) {
  const rows = items.map(i =>
    `<tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${i.name}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${i.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${i.price}</td>
    </tr>`
  ).join('');
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a5c38; border-bottom: 2px solid #1a5c38; padding-bottom: 10px;">New Order Request - #${orderId}</h2>
      <p>Hello <strong>${seller.name}</strong>,</p>
      <p>You have received a new order. Please prepare the following items for pickup:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="color: #666; font-size: 13px;">Thank you for selling with Curify!</p>
    </div>
  `;
}

function buildDeliveryEmailHTML(seller, deliveryAddress, jobId, orderId) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2D6A4F; border-bottom: 2px solid #2D6A4F; padding-bottom: 10px;">Delivery Job Assigned - #${jobId}</h2>
      <p>A new delivery task has been assigned for Order <strong>#${orderId}</strong>.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2D6A4F; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #333;">📦 Step 1: Pickup From</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          <strong>Store Name:</strong> ${seller.name}<br>
          <strong>Address:</strong> ${seller.address.line1 || ''}, ${seller.address.line2 || ''}, ${seller.address.city || ''}, ${seller.address.state || ''} — ${seller.address.pincode || ''}<br>
          <strong>Phone:</strong> ${seller.phone || 'N/A'}
        </p>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #ff9800; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #333;">🏠 Step 2: Deliver To</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          <strong>Customer Name:</strong> ${deliveryAddress.name || 'Customer'}<br>
          <strong>Address:</strong> ${deliveryAddress.line1 || ''}, ${deliveryAddress.line2 || ''}, ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} — ${deliveryAddress.pincode || ''}<br>
          <strong>Phone:</strong> ${deliveryAddress.phone || 'N/A'}
        </p>
      </div>
      
      <p style="color: #666; font-size: 13px;">Please collect the items and update delivery status accordingly.</p>
    </div>
  `;
}

module.exports = { notifySeller, notifyDeliveryPartner };
