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

module.exports = {
  sendOrderConfirmationEmail
};
