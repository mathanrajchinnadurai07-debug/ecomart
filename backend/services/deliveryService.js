const db = require('../config/database');
const { notifySeller, notifyDeliveryPartner } = require('./notificationService');
const { DEFAULT_SELLER_EMAIL } = require('../config/constants');

/**
 * Creates delivery jobs in the database. Runs inside the active database transaction client.
 */
async function createDeliveryJobs(orderId, orderItems, deliveryAddress, client) {
  // 1. Group items by seller_id
  const sellerMap = {};
  for (const item of orderItems) {
    let sid = item.seller_id;
    
    // If product has no seller_id, fetch default seller
    if (!sid) {
      const defaultSellerRes = await client.query('SELECT id FROM sellers WHERE email = $1 LIMIT 1', [DEFAULT_SELLER_EMAIL]);
      if (defaultSellerRes.rows.length) {
        sid = defaultSellerRes.rows[0].id;
      }
    }
    
    if (sid) {
      if (!sellerMap[sid]) sellerMap[sid] = [];
      sellerMap[sid].push(item);
    }
  }

  const jobsCreated = [];

  for (const [sellerId, items] of Object.entries(sellerMap)) {
    // Fetch seller details
    const sellerRes = await client.query(
      'SELECT * FROM sellers WHERE id = $1 AND is_active = TRUE', [sellerId]
    );
    if (!sellerRes.rows.length) continue;
    const seller = sellerRes.rows[0];

    // Create delivery job in DB
    const jobRes = await client.query(
      `INSERT INTO delivery_jobs (order_id, seller_id, pickup_address, delivery_address, status)
       VALUES ($1, $2, $3, $4, 'assigned') RETURNING id`,
      [orderId, sellerId, JSON.stringify(seller.address), JSON.stringify(deliveryAddress)]
    );
    const jobId = jobRes.rows[0].id;

    jobsCreated.push({
      jobId,
      seller,
      items
    });
  }

  return jobsCreated;
}

/**
 * Dispatches notification emails for the jobs. Runs OUTSIDE the transaction after successful commit.
 */
async function sendDeliveryNotifications(jobs, orderId, deliveryAddress) {
  const results = [];

  for (const job of jobs) {
    const { jobId, seller, items } = job;
    try {
      // Send notifications in parallel
      const [sellerNotif, deliveryNotif] = await Promise.allSettled([
        notifySeller(seller, items, orderId),
        notifyDeliveryPartner(seller, deliveryAddress, jobId, orderId)
      ]);

      const sellerSucceeded = sellerNotif.status === 'fulfilled' && sellerNotif.value.success;
      const deliverySucceeded = deliveryNotif.status === 'fulfilled' && deliveryNotif.value.success;

      // If both succeeded, mark notified_at in DB
      if (sellerSucceeded && deliverySucceeded) {
        await db.query(
          'UPDATE delivery_jobs SET notified_at = NOW() WHERE id = $1', [jobId]
        );
      }

      results.push({
        jobId,
        sellerId: seller.id,
        sellerNotif: sellerSucceeded,
        deliveryNotif: deliverySucceeded
      });
    } catch (err) {
      console.error(`[DeliveryService] Error dispatching notifications for job ${jobId}:`, err.message);
      results.push({
        jobId,
        sellerId: seller.id,
        status: 'failed',
        error: err.message
      });
    }
  }

  return results;
}

module.exports = { createDeliveryJobs, sendDeliveryNotifications };
