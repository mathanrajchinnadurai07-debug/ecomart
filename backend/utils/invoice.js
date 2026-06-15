const PDFDocument = require('pdfkit');

const GST_RATES = {
  default: 0.18,
  biscuits: 0.18,
  snacks: 0.12,
  dairy: 0.05,
  fruits: 0,
  spices: 0.05,
  grains: 0
};

const getCategoryGST = (category) => {
  const lowerCat = (category || '').toLowerCase();
  return GST_RATES[lowerCat] !== undefined ? GST_RATES[lowerCat] : GST_RATES.default;
};

const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc
        .fillColor('#1a5c38')
        .fontSize(20)
        .text('Curify Organic Market', { align: 'center' })
        .fontSize(10)
        .fillColor('#444444')
        .text('Curify HQ, Organic Street', { align: 'center' })
        .text('GSTIN: 33ABCDE1234F1Z5', { align: 'center' })
        .moveDown();

      // Invoice Details
      doc
        .fontSize(14)
        .fillColor('#000000')
        .text(`TAX INVOICE`, { align: 'center' })
        .moveDown();

      const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

      doc
        .fontSize(10)
        .text(`Order ID: ${order.id}`)
        .text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString()}`)
        .text(`Customer: ${address.name || 'N/A'}`)
        .text(`Billing Address: ${address.line1 || ''}, ${address.city || ''} ${address.pincode || ''}`)
        .moveDown();

      // Items Table
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, doc.y, { continued: true });
      doc.text('Qty', 250, doc.y, { continued: true });
      doc.text('Price', 350, doc.y, { continued: true });
      doc.text('GST', 420, doc.y, { continued: true });
      doc.text('Total', 500, doc.y);
      doc.font('Helvetica');
      doc.moveDown(0.5);
      
      let y = doc.y;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.moveDown(0.5);

      let subtotal = 0;
      let totalGst = 0;

      items.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const gstRate = getCategoryGST(item.category);
        const itemSubtotal = qty * price;
        const itemGst = itemSubtotal * gstRate;
        const itemTotal = itemSubtotal + itemGst;

        subtotal += itemSubtotal;
        totalGst += itemGst;

        doc.text(item.name || `Item ${item.product_id}`, 50, doc.y, { width: 180, continued: true });
        doc.text(qty.toString(), 250, doc.y, { continued: true });
        doc.text(`Rs ${price.toFixed(2)}`, 350, doc.y, { continued: true });
        doc.text(`${(gstRate * 100).toFixed(0)}%`, 420, doc.y, { continued: true });
        doc.text(`Rs ${itemTotal.toFixed(2)}`, 500, doc.y);
      });

      doc.moveDown();
      y = doc.y;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.moveDown();

      // Totals
      const grandTotal = order.total_amount || (subtotal + totalGst);
      
      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: Rs ${subtotal.toFixed(2)}`, { align: 'right' });
      doc.text(`Total GST: Rs ${totalGst.toFixed(2)}`, { align: 'right' });
      doc.text(`Grand Total: Rs ${Number(grandTotal).toFixed(2)}`, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePDF
};
