import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

const CATEGORIES = [
  'biscuits', 'snacks', 'mushroom', 'chicken',
  'dairy', 'beverages', 'spices', 'oils', 'grains', 'fruits'
];

const toSlug = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminUpload() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', slug: '', category: 'biscuits',
    price: '', discountPrice: '', stock: '100',
    rating: '4.5', numReviews: '0',
    description: '', isFeatured: false,
  });

  const [weights, setWeights] = useState([
    { label: '100g', price: '', discountPrice: '' }
  ]);

  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus]             = useState('idle'); // idle | uploading | saving | done | error
  const [errorMsg, setErrorMsg]         = useState('');
  const [dragging, setDragging]         = useState(false);

  const fileRef = useRef();

  // ── Field handlers ────────────────────────────────────────────────────────
  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: toSlug(value) } : {})
    }));
  };

  const handleWeight = (idx, field, val) =>
    setWeights(ws => ws.map((w, i) => i === idx ? { ...w, [field]: val } : w));

  const addWeight  = () => setWeights(ws => [...ws, { label: '', price: '', discountPrice: '' }]);
  const dropWeight = (idx) => setWeights(ws => ws.filter((_, i) => i !== idx));

  // ── Image selection (click or drag) ──────────────────────────────────────
  const pickImage = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image must be under 10 MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickImage(e.dataTransfer.files[0]);
  }, []);

  // ── Upload image to Firebase Storage ────────────────────────────────────
  const uploadImage = () => new Promise((resolve, reject) => {
    if (!imageFile) { resolve(''); return; }
    const path = `products/${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, imageFile);
    task.on(
      'state_changed',
      snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        // Storage rule error — give user a helpful message
        if (err.code === 'storage/unauthorized') {
          reject(new Error(
            'Firebase Storage permission denied.\n\n' +
            'Go to Firebase Console → Storage → Rules and set:\n\n' +
            'allow write: if true;\n\n' +
            '(You can restrict this later with auth rules.)'
          ));
        } else {
          reject(err);
        }
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim()) { setErrorMsg('Product name is required.'); return; }
    if (!form.price)        { setErrorMsg('Price is required.'); return; }

    try {
      // 1. Upload image
      setStatus('uploading');
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // 2. Save to Firestore
      setStatus('saving');
      const slug = form.slug || toSlug(form.name);
      const data = {
        name:          form.name.trim(),
        slug,
        category:      form.category,
        price:         parseFloat(form.price)         || 0,
        discountPrice: parseFloat(form.discountPrice) || parseFloat(form.price) || 0,
        stock:         parseInt(form.stock)           || 0,
        rating:        parseFloat(form.rating)        || 4.5,
        numReviews:    parseInt(form.numReviews)      || 0,
        description:   form.description.trim(),
        isFeatured:    form.isFeatured,
        imageUrl,
        images: imageUrl ? [imageUrl] : [],
        weights: weights
          .filter(w => w.label)
          .map(w => ({
            label:         w.label,
            price:         parseFloat(w.price)         || parseFloat(form.price)         || 0,
            discountPrice: parseFloat(w.discountPrice) || parseFloat(form.discountPrice) || parseFloat(w.price) || 0,
          })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'products', slug), data);

      setStatus('done');

      // Reset after 3s
      setTimeout(() => {
        setStatus('idle');
        setForm({ name:'', slug:'', category:'biscuits', price:'', discountPrice:'', stock:'100', rating:'4.5', numReviews:'0', description:'', isFeatured:false });
        setWeights([{ label:'100g', price:'', discountPrice:'' }]);
        setImageFile(null);
        setImagePreview(null);
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Admin upload error:', err);
      setErrorMsg(err.message || 'Something went wrong. Check the console.');
      setStatus('error');
    }
  };

  const busy = status === 'uploading' || status === 'saving';

  return (
    <>
      <Head>
        <title>Admin — Add Product | EcoMart</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="ap">

        {/* Header */}
        <header className="ap-hdr">
          <div className="ap-hdr-left">
            <span className="ap-logo">🌿</span>
            <span className="ap-title">EcoMart Admin</span>
          </div>
          <button onClick={() => router.push('/')} className="ap-back">← Back to Store</button>
        </header>

        <main className="ap-main">
          <h1 className="ap-h1">Add New Product</h1>
          <p className="ap-desc">Upload product image + details — saved directly to Firebase.</p>

          {/* Status banners */}
          {status === 'done' && (
            <div className="banner banner-ok">
              ✅ Product <strong>{form.name || 'saved'}</strong> published to Firebase!
            </div>
          )}
          {(status === 'error' || errorMsg) && (
            <div className="banner banner-err">
              <strong>⚠️ Error</strong>
              <pre className="err-pre">{errorMsg}</pre>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ap-form">

            {/* ── Image ── */}
            <section className="sec">
              <h2 className="sec-title">📷 Product Image</h2>
              <div
                className={`drop-zone ${dragging ? 'drag-over' : ''}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="img-prev" />
                  : (
                    <div className="drop-hint">
                      <div className="drop-icon">📷</div>
                      <p className="drop-text">Click or drag & drop image here</p>
                      <p className="drop-sub">JPG · PNG · WebP · max 10 MB</p>
                    </div>
                  )
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*"
                onChange={e => pickImage(e.target.files[0])}
                style={{ display:'none' }} />

              {status === 'uploading' && (
                <div className="prog-wrap">
                  <div className="prog-bar" style={{ width: `${uploadProgress}%` }} />
                  <span className="prog-txt">{uploadProgress}%</span>
                </div>
              )}
              {imageFile && status !== 'uploading' && (
                <p className="img-name">📎 {imageFile.name}</p>
              )}
            </section>

            {/* ── Basic Info ── */}
            <section className="sec">
              <h2 className="sec-title">📝 Product Details</h2>
              <div className="grid2">
                <div className="fg span2">
                  <label>Product Name *</label>
                  <input name="name" value={form.name} onChange={handleField}
                    placeholder="e.g. Ragi Cookies" required />
                </div>
                <div className="fg">
                  <label>URL Slug (auto-filled)</label>
                  <input name="slug" value={form.slug} onChange={handleField}
                    placeholder="ragi-cookies" />
                </div>
                <div className="fg">
                  <label>Category *</label>
                  <select name="category" value={form.category} onChange={handleField}>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="fg span2">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleField}
                    rows={3} placeholder="Short description of the product..." />
                </div>
                <div className="fg">
                  <label>Mark as Featured?</label>
                  <label className="tog">
                    <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleField} />
                    <span className="tog-track" />
                    <span className="tog-lbl">{form.isFeatured ? '⭐ Yes' : 'No'}</span>
                  </label>
                </div>
              </div>
            </section>

            {/* ── Pricing ── */}
            <section className="sec">
              <h2 className="sec-title">💰 Pricing & Stock</h2>
              <div className="grid3">
                <div className="fg">
                  <label>Base Price (₹) *</label>
                  <input type="number" name="price" value={form.price} onChange={handleField}
                    placeholder="120" min="0" step="0.01" required />
                </div>
                <div className="fg">
                  <label>Discount Price (₹)</label>
                  <input type="number" name="discountPrice" value={form.discountPrice} onChange={handleField}
                    placeholder="99" min="0" step="0.01" />
                </div>
                <div className="fg">
                  <label>Stock Qty</label>
                  <input type="number" name="stock" value={form.stock} onChange={handleField}
                    placeholder="100" min="0" />
                </div>
                <div className="fg">
                  <label>Rating (1–5)</label>
                  <input type="number" name="rating" value={form.rating} onChange={handleField}
                    step="0.1" min="1" max="5" />
                </div>
                <div className="fg">
                  <label>No. of Reviews</label>
                  <input type="number" name="numReviews" value={form.numReviews} onChange={handleField}
                    min="0" />
                </div>
              </div>
            </section>

            {/* ── Weight Variants ── */}
            <section className="sec">
              <h2 className="sec-title">⚖️ Weight / Size Variants</h2>
              <p className="sec-sub">Add different weight options (e.g. 100g, 250g, 500g)</p>
              {weights.map((w, i) => (
                <div key={i} className="w-row">
                  <div className="fg">
                    <label>Label</label>
                    <input value={w.label}
                      onChange={e => handleWeight(i, 'label', e.target.value)}
                      placeholder="e.g. 250g" />
                  </div>
                  <div className="fg">
                    <label>MRP (₹)</label>
                    <input type="number" value={w.price}
                      onChange={e => handleWeight(i, 'price', e.target.value)}
                      placeholder="120" min="0" />
                  </div>
                  <div className="fg">
                    <label>Sale Price (₹)</label>
                    <input type="number" value={w.discountPrice}
                      onChange={e => handleWeight(i, 'discountPrice', e.target.value)}
                      placeholder="99" min="0" />
                  </div>
                  {weights.length > 1 && (
                    <button type="button" className="rm-btn" onClick={() => dropWeight(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addWeight}>
                + Add another size
              </button>
            </section>

            {/* ── Submit ── */}
            <div className="submit-row">
              <button type="submit" className="submit-btn" disabled={busy}>
                {status === 'uploading'
                  ? `⬆️ Uploading image… ${uploadProgress}%`
                  : status === 'saving'
                  ? '💾 Saving to Firebase…'
                  : '🚀 Publish Product'}
              </button>
            </div>

          </form>

          {/* Firebase Rules helper */}
          <div className="help-box">
            <h3>⚠️ If upload fails with "permission denied"</h3>
            <p>Go to <strong>Firebase Console → Storage → Rules</strong> and paste:</p>
            <pre className="rules-pre">{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}`}</pre>
            <p>Also go to <strong>Firestore → Rules</strong>:</p>
            <pre className="rules-pre">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
            <p style={{color:'#f85149', fontSize:'0.8rem', marginTop:8}}>
              ⚠️ These open rules are for testing only. Lock them down before going live.
            </p>
          </div>

        </main>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        .ap { min-height:100vh; background:#0d1117; color:#e6edf3; font-family:'Inter','Segoe UI',sans-serif; }

        /* Header */
        .ap-hdr {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 32px; background:#161b22; border-bottom:1px solid #30363d;
          position:sticky; top:0; z-index:10;
        }
        .ap-hdr-left { display:flex; align-items:center; gap:10px; }
        .ap-logo  { font-size:1.5rem; }
        .ap-title { font-size:1.1rem; font-weight:700; color:#3fb950; }
        .ap-back  {
          background:none; border:1px solid #30363d; color:#8b949e;
          padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.85rem;
          transition:all 0.2s;
        }
        .ap-back:hover { background:#21262d; color:#e6edf3; }

        /* Main */
        .ap-main { max-width:820px; margin:0 auto; padding:40px 20px 80px; }
        .ap-h1   { font-size:2rem; font-weight:800; margin:0 0 6px; }
        .ap-desc { color:#8b949e; margin:0 0 28px; font-size:0.95rem; }

        /* Banners */
        .banner { padding:14px 18px; border-radius:10px; margin-bottom:24px; font-size:0.95rem; }
        .banner-ok  { background:#0d2b1a; border:1px solid #3fb950; color:#3fb950; }
        .banner-err { background:#2d1010; border:1px solid #f85149; color:#f85149; }
        .err-pre { margin:8px 0 0; white-space:pre-wrap; font-size:0.8rem; font-family:monospace; background:#1a0a0a; padding:10px; border-radius:6px; }

        /* Form */
        .ap-form { display:flex; flex-direction:column; gap:24px; }

        /* Sections */
        .sec { background:#161b22; border:1px solid #30363d; border-radius:14px; padding:24px; }
        .sec-title { font-size:1rem; font-weight:700; margin:0 0 16px; padding-bottom:12px; border-bottom:1px solid #30363d; }
        .sec-sub   { color:#8b949e; font-size:0.85rem; margin:-8px 0 16px; }

        /* Grids */
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
        .span2 { grid-column:1/-1; }

        /* Field group */
        .fg { display:flex; flex-direction:column; gap:6px; }
        .fg label { font-size:0.75rem; font-weight:600; color:#8b949e; text-transform:uppercase; letter-spacing:0.06em; }
        .fg input, .fg select, .fg textarea {
          background:#0d1117; border:1px solid #30363d; color:#e6edf3;
          border-radius:8px; padding:10px 14px; font-size:0.9rem; font-family:inherit;
          transition:border-color 0.2s; width:100%;
        }
        .fg input:focus, .fg select:focus, .fg textarea:focus {
          outline:none; border-color:#3fb950; box-shadow:0 0 0 3px rgba(63,185,80,0.1);
        }
        .fg textarea { resize:vertical; }

        /* Drop zone */
        .drop-zone {
          border:2px dashed #30363d; border-radius:12px;
          min-height:200px; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all 0.2s; overflow:hidden;
        }
        .drop-zone:hover, .drag-over { border-color:#3fb950; background:rgba(63,185,80,0.04); }
        .drop-hint { text-align:center; padding:20px; }
        .drop-icon { font-size:3rem; margin-bottom:8px; }
        .drop-text { color:#e6edf3; font-size:1rem; margin:0 0 4px; }
        .drop-sub  { color:#8b949e; font-size:0.8rem; margin:0; }
        .img-prev  { max-height:240px; max-width:100%; object-fit:contain; border-radius:8px; }
        .img-name  { color:#8b949e; font-size:0.8rem; margin:8px 0 0; }

        /* Progress */
        .prog-wrap {
          display:flex; align-items:center; gap:10px; margin-top:12px;
          background:#0d1117; border-radius:20px; padding:4px 12px;
          border:1px solid #30363d;
        }
        .prog-bar {
          height:6px; background:linear-gradient(90deg,#3fb950,#58a6ff);
          border-radius:3px; transition:width 0.3s ease; min-width:4px;
        }
        .prog-txt { color:#8b949e; font-size:0.8rem; white-space:nowrap; }

        /* Toggle */
        .tog { display:flex; align-items:center; gap:12px; cursor:pointer; margin-top:4px; user-select:none; }
        .tog input { display:none; }
        .tog-track {
          width:44px; height:24px; background:#30363d; border-radius:12px;
          position:relative; transition:background 0.25s; flex-shrink:0;
        }
        .tog-track::after {
          content:''; position:absolute; top:3px; left:3px;
          width:18px; height:18px; background:#6e7681; border-radius:50%;
          transition:transform 0.25s, background 0.25s;
        }
        .tog input:checked ~ .tog-track { background:#1a5c38; }
        .tog input:checked ~ .tog-track::after { transform:translateX(20px); background:#3fb950; }
        .tog-lbl { color:#e6edf3; font-size:0.9rem; }

        /* Weight rows */
        .w-row {
          display:grid; grid-template-columns:1fr 1fr 1fr auto;
          gap:12px; align-items:end;
          padding:12px 0; border-bottom:1px solid #21262d;
        }
        .rm-btn {
          width:36px; height:36px; background:#2d1010; border:1px solid #f85149;
          color:#f85149; border-radius:7px; cursor:pointer; font-size:0.85rem;
          transition:all 0.2s; align-self:flex-end;
        }
        .rm-btn:hover { background:#f85149; color:#fff; }
        .add-btn {
          margin-top:14px; width:100%; padding:10px;
          background:none; border:1.5px dashed #30363d; color:#8b949e;
          border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.2s;
        }
        .add-btn:hover { border-color:#3fb950; color:#3fb950; }

        /* Submit */
        .submit-row { display:flex; justify-content:center; }
        .submit-btn {
          background:linear-gradient(135deg,#1a5c38,#3fb950);
          color:#fff; border:none; padding:16px 48px;
          border-radius:12px; font-size:1.05rem; font-weight:700;
          cursor:pointer; transition:all 0.25s;
          box-shadow:0 4px 24px rgba(63,185,80,0.35);
          width:100%; max-width:400px;
        }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 32px rgba(63,185,80,0.45); }
        .submit-btn:disabled { opacity:0.55; cursor:not-allowed; transform:none; }

        /* Help box */
        .help-box {
          margin-top:48px; background:#161b22; border:1px solid #30363d;
          border-radius:14px; padding:24px;
        }
        .help-box h3 { margin:0 0 10px; font-size:0.95rem; color:#e6edf3; }
        .help-box p  { margin:10px 0 6px; color:#8b949e; font-size:0.85rem; }
        .rules-pre {
          background:#0d1117; border:1px solid #30363d; border-radius:8px;
          padding:14px; font-size:0.78rem; font-family:monospace;
          color:#e6edf3; white-space:pre; overflow-x:auto;
        }

        /* Responsive */
        @media (max-width:640px) {
          .grid2, .grid3 { grid-template-columns:1fr; }
          .span2 { grid-column:1; }
          .w-row { grid-template-columns:1fr 1fr; }
          .ap-main { padding:24px 16px 60px; }
          .ap-hdr { padding:14px 16px; }
        }
      `}</style>
    </>
  );
}
