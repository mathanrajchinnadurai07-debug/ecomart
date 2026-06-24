const { Resend } = require('resend');
const { generateInvoicePDF } = require('./invoice');

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock123');

const sendOrderConfirmationEmail = async (order) => {
  try {
    const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    const email = address.email;
    
    if (!email) {
      console.warn(`No email found for order ${order.id}. Skipping email.`);
      return;
    }

    const pdfBuffer = await generateInvoicePDF(order);

    const data = await resend.emails.send({
      from: 'Curify Orders <orders@curifyorganic.com>', // Replace with your verified domain
      to: email,
      subject: `Curify Order Confirmation - #${order.id}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Hi ${address.name || 'Customer'},</p>
        <p>Your order <strong>#${order.id}</strong> has been successfully placed and is currently being processed.</p>
        <p>Total Amount: ₹${order.total_amount}</p>
        <p>Please find your tax invoice attached to this email.</p>
        <p>Stay green!</p>
        <p>- The Curify Team</p>
      `,
      attachments: [
        {
          filename: `Invoice_${order.id}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    console.log(`Order confirmation email sent to ${email}:`, data);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};

const sendOrderStatusUpdateEmail = async (order) => {
  try {
    const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    const email = address.email;
    
    if (!email) {
      console.warn(`No email found for order ${order.id}. Skipping status update email.`);
      return;
    }

    const data = await resend.emails.send({
      from: 'Curify Orders <orders@curifyorganic.com>',
      to: email,
      subject: `Order Update - #${order.id} is now ${order.status.toUpperCase()}`,
      html: `
        <h2>Order Status Update</h2>
        <p>Hi ${address.name || 'Customer'},</p>
        <p>Your order <strong>#${order.id}</strong> status has been updated to: <strong>${order.status.toUpperCase()}</strong>.</p>
        <p>Thank you for shopping with us!</p>
        <p>- The Curify Team</p>
      `
    });

    console.log(`Order status update email sent to ${email}:`, data);
  } catch (error) {
    console.error('Error sending order status update email:', error);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail
};
