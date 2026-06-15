const admin = require('firebase-admin');

const syncOrderStatus = async (orderId, updates) => {
  try {
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(orderId.toString());

    await orderRef.update({
      ...updates,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully synced order ${orderId} status to Firestore.`);
  } catch (error) {
    console.error(`Error syncing order ${orderId} status to Firestore:`, error);
  }
};

module.exports = {
  syncOrderStatus
};
