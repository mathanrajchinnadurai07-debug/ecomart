/**
 * EcoMart Firebase Seeder
 * Run with: node scripts/seed-firebase.js
 *
 * This script reads all products from data/products.js
 * and uploads them to Firestore under the "products" collection.
 *
 * HOW TO RUN:
 *   1. npm install firebase-admin (only needed once)
 *   2. Download your Firebase service account JSON from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   3. Save it as: scripts/serviceAccountKey.json
 *   4. node scripts/seed-firebase.js
 */

const admin = require('firebase-admin');
const path = require('path');

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  console.error('\n❌  serviceAccountKey.json not found!');
  console.error('   Download it from Firebase Console → Project Settings → Service Accounts');
  console.error('   Save as: scripts/serviceAccountKey.json\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'ecomart-6a21a.firebasestorage.app'
});

const db = admin.firestore();

// ─── Products Data (inline, mirrors data/products.js) ────────────────────────
// We paste the raw array here to avoid ESM import issues in a CommonJS script.
// Re-export from data/products.js if you switch to ESM (package.json "type":"module").

const IMG = '/assets/images/products/';

const ALL_PRODUCTS = [
  // BISCUITS & COOKIES
  {_id:'b1',slug:'ragi-cookies',name:'Ragi Cookies',category:'biscuits',price:120,discountPrice:99,rating:4.5,numReviews:142,stock:200,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:45,discountPrice:38},{label:'250g',price:120,discountPrice:99},{label:'500g',price:220,discountPrice:185}],isFeatured:true,description:'Crispy organic ragi cookies made with finger millet, jaggery & coconut oil. Zero refined sugar.'},
  {_id:'b2',slug:'millet-biscuits',name:'Millet Biscuits',category:'biscuits',price:110,discountPrice:89,rating:4.4,numReviews:98,stock:180,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:42,discountPrice:35},{label:'250g',price:110,discountPrice:89}],description:'Crunchy multigrain millet biscuits with zero maida.'},
  {_id:'b3',slug:'jaggery-cookies',name:'Jaggery Cookies',category:'biscuits',price:130,discountPrice:109,rating:4.6,numReviews:167,stock:150,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:50,discountPrice:42},{label:'250g',price:130,discountPrice:109},{label:'500g',price:240,discountPrice:199}],isFeatured:true,description:'Traditional jaggery cookies with whole wheat & cardamom.'},
  {_id:'b4',slug:'coconut-cookies',name:'Coconut Cookies',category:'biscuits',price:140,discountPrice:119,rating:4.5,numReviews:89,stock:120,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:55,discountPrice:45},{label:'250g',price:140,discountPrice:119}],description:'Organic coconut cookies with desiccated coconut & jaggery.'},
  {_id:'b5',slug:'oats-biscuits',name:'Oats Digestive Biscuits',category:'biscuits',price:95,discountPrice:79,rating:4.3,numReviews:76,stock:220,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:38,discountPrice:32},{label:'250g',price:95,discountPrice:79},{label:'500g',price:175,discountPrice:149}],description:'High-fiber oats digestive biscuits for healthy snacking.'},
  {_id:'s1',slug:'banana-chips-classic',name:'Kerala Banana Chips',category:'snacks',price:99,discountPrice:79,rating:4.5,numReviews:234,stock:300,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'100g',price:40,discountPrice:32},{label:'250g',price:99,discountPrice:79},{label:'500g',price:180,discountPrice:149}],isFeatured:true,description:'Crispy Kerala banana chips fried in coconut oil.'},
  {_id:'s2',slug:'millet-chips',name:'Millet Chips',category:'snacks',price:85,discountPrice:69,rating:4.3,numReviews:156,stock:250,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'75g',price:35,discountPrice:28},{label:'150g',price:85,discountPrice:69}],description:'Crunchy millet chips with Himalayan pink salt.'},
  {_id:'m1',slug:'dried-shiitake',name:'Dried Shiitake Mushrooms',category:'mushroom',price:350,discountPrice:299,rating:4.7,numReviews:87,stock:60,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'50g',price:180,discountPrice:155},{label:'100g',price:350,discountPrice:299}],isFeatured:true,description:'Premium dried shiitake mushrooms from organic farms.'},
  {_id:'m2',slug:'mushroom-powder',name:'Mushroom Powder Mix',category:'mushroom',price:280,discountPrice:239,rating:4.5,numReviews:123,stock:90,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'50g',price:145,discountPrice:125},{label:'100g',price:280,discountPrice:239}],isFeatured:true,description:'5-mushroom immunity powder blend.'},
  {_id:'c1',slug:'chicken-breast',name:'Organic Chicken Breast',category:'chicken',price:380,discountPrice:329,rating:4.6,numReviews:198,stock:50,images:[IMG+'Curify_logo_product.jpg'],weights:[{label:'250g',price:195,discountPrice:169},{label:'500g',price:380,discountPrice:329}],isFeatured:true,description:'Antibiotic-free organic chicken breast, vacuum sealed.'},
];

// ─── Seeder ───────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  Starting EcoMart Firebase Seed — ${ALL_PRODUCTS.length} products\n`);

  let success = 0;
  let failed  = 0;

  for (const product of ALL_PRODUCTS) {
    try {
      const docId = product._id || product.slug;
      const docData = {
        ...product,
        // Ensure these fields always exist
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isFeatured: product.isFeatured || false,
        // imageUrl: set this to a real Firebase Storage URL after uploading the image
        imageUrl: product.images?.[0] || '',
      };

      await db.collection('products').doc(docId).set(docData, { merge: true });
      console.log(`  ✅  ${docId.padEnd(20)} → ${product.name}`);
      success++;
    } catch (err) {
      console.error(`  ❌  ${product._id} → ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`  ✅ Seeded : ${success}`);
  console.log(`  ❌ Failed : ${failed}`);
  console.log(`─────────────────────────────────────\n`);

  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
