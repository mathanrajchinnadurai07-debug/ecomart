import { useState, useRef, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useCart } from '../context/CartContext';

const CATEGORIES = [
  'biscuits','snacks','mushroom','chicken','mutton','dairy','beverages',
  'spices','oils','grains','fruits','vegetables','dryfruits','herbal',
  'flour','spreads','pickles','superfoods','readytocook','grocery'
];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const toSlug = (n) => n.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const EMPTY_FORM = {
  name:'', slug:'', category:'biscuits', price:'', discountPrice:'',
  stock:'100', rating:'4.5', numReviews:'0', description:'', isFeatured: false, image_url:'', seller_id:''
};

export default function AdminPanel() {
  const router = useRouter();
  const { user, loading: authLoading } = useCart();

  const isDevBypass = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  useEffect(() => {
    if (!authLoading && !isDevBypass) {
      if (!user) {
        router.push('/login?redirect=/admin-upload');
      } else if (user.email !== 'mathanrajchinnadurai07@gmail.com') {
        router.push('/');
      }
    }
  }, [user, authLoading, router, isDevBypass]);

  /* ─── view: 'list' | 'add' | 'edit' | 'sellers' ─── */
  const [view, setView]           = useState('list');
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editTarget, setEditTarget] = useState(null); // product being edited

  /* Admin Password verification */
  const [isVerified, setIsVerified] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  /* Sellers state */
  const [sellers, setSellers] = useState([]);
  const [sellerForm, setSellerForm] = useState({ name: '', email: '', phone: '', line1: '', city: '', state: '', pincode: '' });
  const [editingSeller, setEditingSeller] = useState(null);
  const [sellerFormError, setSellerFormError] = useState('');
  const [sellerActionStatus, setSellerActionStatus] = useState('idle');

  /* form state */
  const [form, setForm]           = useState(EMPTY_FORM);
  const [weights, setWeights]     = useState([{ label:'100g', price:'', discountPrice:'' }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus]       = useState('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef                   = useRef();

  /* ─── stats ─── */
  const [stats, setStats] = useState({ total:0, featured:0, outOfStock:0, categories:0 });

  /* Check verification from session on mount */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem('curify_admin_verified') === 'true';
      setIsVerified(verified);
    }
  }, []);

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    const secret = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'CurifyAdmin2026';
    if (adminPasswordInput === secret) {
      sessionStorage.setItem('curify_admin_verified', 'true');
      setIsVerified(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect secret admin password!');
    }
  };

  /* ─── Load sellers ─── */
  const fetchSellers = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/sellers`);
      const d = await r.json();
      setSellers(d.data || []);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    }
  }, []);

  /* ─── Load products ─── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/products?limit=200`);
      const d = await r.json();
      const list = d.data || [];
      setProducts(list);
      setStats({
        total: list.length,
        featured: list.filter(p => p.isFeatured || p.is_featured).length,
        outOfStock: list.filter(p => (p.stock || 0) === 0).length,
        categories: new Set(list.map(p => p.category)).size
      });
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchProducts(); 
    fetchSellers();
  }, [fetchProducts, fetchSellers]);

  const handleSellerField = (e) => {
    const { name, value } = e.target;
    setSellerForm(f => ({ ...f, [name]: value }));
  };

  const handleSellerSubmit = async (e) => {
    e.preventDefault();
    setSellerFormError('');
    if (!sellerForm.name.trim() || !sellerForm.email.trim()) {
      setSellerFormError('Name and Email are required.');
      return;
    }

    try {
      setSellerActionStatus('saving');
      const isEdit = !!editingSeller;
      const url = isEdit ? `${API}/api/sellers/${editingSeller.id}` : `${API}/api/sellers`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: sellerForm.name.trim(),
        email: sellerForm.email.trim(),
        phone: sellerForm.phone.trim(),
        address: {
          line1: sellerForm.line1.trim(),
          city: sellerForm.city.trim(),
          state: sellerForm.state.trim(),
          pincode: sellerForm.pincode.trim()
        },
        is_active: editingSeller ? editingSeller.is_active : true
      };

      let authHeaderValue = 'Bearer dev_admin';
      if (user) {
        const idToken = await user.getIdToken();
        authHeaderValue = `Bearer ${idToken}`;
      }

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderValue },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save seller');

      setSellerActionStatus('done');
      await fetchSellers();
      setSellerForm({ name: '', email: '', phone: '', line1: '', city: '', state: '', pincode: '' });
      setEditingSeller(null);
      setTimeout(() => setSellerActionStatus('idle'), 1500);
    } catch (err) {
      setSellerFormError(err.message);
      setSellerActionStatus('error');
    }
  };

  const startEditSeller = (seller) => {
    setEditingSeller(seller);
    const addr = seller.address || {};
    setSellerForm({
      name: seller.name || '',
      email: seller.email || '',
      phone: seller.phone || '',
      line1: addr.line1 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || ''
    });
    setSellerFormError('');
  };

  const handleDeactivateSeller = async (seller) => {
    if (!confirm(`Deactivate seller "${seller.name}"? They will no longer be active.`)) return;
    try {
      let authHeaderValue = 'Bearer dev_admin';
      if (user) {
        const idToken = await user.getIdToken();
        authHeaderValue = `Bearer ${idToken}`;
      }
      const r = await fetch(`${API}/api/sellers/${seller.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeaderValue }
      });
      if (!r.ok) throw new Error('Failed to deactivate');
      await fetchSellers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleActivateSeller = async (seller) => {
    try {
      let authHeaderValue = 'Bearer dev_admin';
      if (user) {
        const idToken = await user.getIdToken();
        authHeaderValue = `Bearer ${idToken}`;
      }
      const payload = {
        name: seller.name,
        email: seller.email,
        phone: seller.phone || '',
        address: seller.address,
        is_active: true
      };
      const r = await fetch(`${API}/api/sellers/${seller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderValue },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('Failed to activate');
      await fetchSellers();
    } catch (err) {
      alert(err.message);
    }
  };

  /* ─── Filtered list ─── */
  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  /* ─── Field handlers ─── */
  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: toSlug(value) } : {})
    }));
  };

  const handleWeight = (i, field, val) =>
    setWeights(ws => ws.map((w, idx) => idx === i ? { ...w, [field]: val } : w));

  /* ─── Open edit ─── */
  const openEdit = (p) => {
    setEditTarget(p);
    setForm({
      name: p.name || '',
      slug: p.slug || toSlug(p.name || ''),
      category: p.category || 'biscuits',
      price: p.price || '',
      discountPrice: p.discount_price || p.discountPrice || '',
      stock: p.stock ?? 100,
      rating: p.rating || 4.5,
      numReviews: p.num_reviews || p.numReviews || 0,
      description: p.description || '',
      isFeatured: !!(p.isFeatured || p.is_featured),
      image_url: p.image_url || p.imageUrl || '',
      seller_id: p.seller_id || ''
    });
    setWeights((p.weights?.length ? p.weights : [{ label:'100g', price:'', discountPrice:'' }]));
    setImageFile(null);
    setImagePreview(p.image_url || p.imageUrl || null);
    setStatus('idle');
    setErrorMsg('');
    setView('edit');
    fetchSellers();
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setWeights([{ label:'100g', price:'', discountPrice:'' }]);
    setImageFile(null);
    setImagePreview(null);
    setStatus('idle');
    setErrorMsg('');
    setView('add');
    fetchSellers();
  };

  /* ─── Image ─── */
  const pickImage = (file) => {
    if (!file || !file.type.startsWith('image/')) { setErrorMsg('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Image must be under 10 MB.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    pickImage(e.dataTransfer.files[0]);
  }, []);

  const uploadImage = () => new Promise((resolve, reject) => {
    if (!imageFile) { resolve(form.image_url || ''); return; }
    const path = `products/${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, imageFile);
    task.on('state_changed',
      snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });

  /* ─── Submit (add or edit) ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.name.trim()) { setErrorMsg('Product name is required.'); return; }
    if (!form.price) { setErrorMsg('Price is required.'); return; }

    try {
      setStatus('uploading');
      const imageUrl = await uploadImage();

      setStatus('saving');
      const slug = form.slug || toSlug(form.name);
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.price) || 0,
        discount: Math.round(((parseFloat(form.price) - (parseFloat(form.discountPrice) || parseFloat(form.price))) / parseFloat(form.price)) * 100) || 0,
        category: form.category,
        image_url: imageUrl,
        description: form.description.trim(),
        stock: parseInt(form.stock) || 0,
        slug, isFeatured: form.isFeatured,
        rating: parseFloat(form.rating) || 4.5,
        numReviews: parseInt(form.numReviews) || 0,
        seller_id: form.seller_id ? parseInt(form.seller_id) : null,
        weights: weights.filter(w => w.label).map(w => ({
          label: w.label,
          price: parseFloat(w.price) || parseFloat(form.price) || 0,
          discountPrice: parseFloat(w.discountPrice) || parseFloat(w.price) || 0,
        }))
      };

      const isEdit = view === 'edit' && editTarget;
      const url = isEdit ? `${API}/api/products/${editTarget.id}` : `${API}/api/products`;
      const method = isEdit ? 'PUT' : 'POST';

      let authHeaderValue = 'Bearer dev_admin';
      if (user) {
        try {
          const idToken = await user.getIdToken();
          authHeaderValue = `Bearer ${idToken}`;
        } catch (tokenErr) {
          console.error('Failed to retrieve Firebase ID token:', tokenErr);
        }
      }

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderValue },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save product');

      setStatus('done');
      await fetchProducts();
      setTimeout(() => { setView('list'); setStatus('idle'); }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      let authHeaderValue = 'Bearer dev_admin';
      if (user) {
        try {
          const idToken = await user.getIdToken();
          authHeaderValue = `Bearer ${idToken}`;
        } catch (tokenErr) {
          console.error('Failed to retrieve Firebase ID token:', tokenErr);
        }
      }
      await fetch(`${API}/api/products/${p.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeaderValue }
      });
      await fetchProducts();
    } catch {
      alert('Delete failed. Check console.');
    }
  };

  const busy = status === 'uploading' || status === 'saving';

  if (authLoading) {
    return (
      <div className="ap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
        <div className="spinner" /> <span style={{ marginLeft: 15 }}>Checking admin authorization…</span>
        <style jsx>{`
          .spinner {
            width: 24px; height: 24px; border: 3px solid #30363d;
            border-top-color: #3fb950; border-radius: 50%; animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!isDevBypass && (!user || user.email !== 'mathanrajchinnadurai07@gmail.com')) {
    return (
      <div className="ap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
        <span>Not authorized. Redirecting…</span>
      </div>
    );
  }

  if (!isVerified && !isDevBypass) {
    return (
      <div className="ap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
        <form onSubmit={handleVerifyPassword} className="sec" style={{ width: '400px', padding: '30px', borderRadius: '12px', background: '#161b22', border: '1px solid #30363d', textAlign: 'center' }}>
          <h2 style={{ color: '#3fb950', marginBottom: '15px' }}>🔐 Admin Verification</h2>
          <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '20px' }}>Please enter your secret password to enter the Curify Admin Panel.</p>
          <div className="fg" style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.06em' }}>Admin Password</label>
            <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} placeholder="••••••••" required style={{ marginTop: '5px', background:'#0d1117', border:'1px solid #30363d', color:'#e6edf3', borderRadius:'8px', padding:'10px 12px', width:'100%', outline:'none' }} />
          </div>
          {authError && <p style={{ color: '#f85149', fontSize: '0.82rem', marginBottom: '15px' }}>⚠️ {authError}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', background:'linear-gradient(135deg,#1a5c38,#3fb950)', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', cursor:'pointer', fontWeight:'bold' }}>Verify Password</button>
        </form>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <>
      <Head>
        <title>Admin Panel — Curify</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="ap">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-brand">
            <span className="sb-leaf">🌿</span>
            <div>
              <div className="sb-name">Curify</div>
              <div className="sb-role">Admin Panel</div>
            </div>
          </div>

          <nav className="sb-nav">
            <button className={`sb-link ${view==='list'?'active':''}`} onClick={() => setView('list')}>
              <span>📦</span> Products
            </button>
            <button className={`sb-link ${view==='add'?'active':''}`} onClick={openAdd}>
              <span>➕</span> Add Product
            </button>
            <button className={`sb-link ${view==='sellers'?'active':''}`} onClick={() => setView('sellers')}>
              <span>🏪</span> Sellers
            </button>
            <button className="sb-link" onClick={() => router.push('/')}>
              <span>🏠</span> View Store
            </button>
          </nav>

          {/* Stats */}
          <div className="sb-stats">
            <div className="sb-stat"><span>{stats.total}</span><label>Products</label></div>
            <div className="sb-stat"><span>{stats.featured}</span><label>Featured</label></div>
            <div className="sb-stat out"><span>{stats.outOfStock}</span><label>Out of Stock</label></div>
            <div className="sb-stat"><span>{stats.categories}</span><label>Categories</label></div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="ap-main">
          {isDevBypass && !user && (
            <div className="banner banner-err" style={{ marginBottom: 20 }}>
              ⚠️ <strong>Developer Bypass Active:</strong> You are viewing this page on localhost without being logged in. In production, this page is strictly restricted to <strong>mathanrajchinnadurai07@gmail.com</strong>.
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              <div className="page-hdr">
                <div>
                  <h1 className="page-title">Products</h1>
                  <p className="page-sub">{products.length} total products across {stats.categories} categories</p>
                </div>
                <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
              </div>

              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text" placeholder="Search by name or category…"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
              </div>

              {loading ? (
                <div className="loading-wrap">
                  <div className="spinner" /><span>Loading products…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div style={{fontSize:'3rem'}}>📦</div>
                  <p>{search ? `No products matching "${search}"` : 'No products yet. Click Add Product to get started.'}</p>
                </div>
              ) : (
                <div className="product-grid">
                  {filtered.map(p => (
                    <div key={p.id} className="p-card">
                      <div className="p-img-wrap">
                        {p.image_url || p.imageUrl
                          ? <img src={p.image_url || p.imageUrl} alt={p.name} className="p-img" />
                          : <div className="p-img-ph">🌿</div>
                        }
                        {(p.isFeatured || p.is_featured) && <span className="p-badge featured">⭐ Featured</span>}
                        {(p.stock || 0) === 0 && <span className="p-badge oos">Out of Stock</span>}
                      </div>
                      <div className="p-info">
                        <div className="p-cat">{p.category}</div>
                        <div className="p-name" title={p.name}>{p.name}</div>
                        <div className="p-meta">
                          <span className="p-price">₹{p.price}</span>
                          <span className="p-stock">Stock: {p.stock ?? '—'}</span>
                          <span className="p-rating">⭐ {p.rating || '—'}</span>
                        </div>
                      </div>
                      <div className="p-actions">
                        <button className="btn-edit" onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(p)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ADD / EDIT FORM ── */}
          {(view === 'add' || view === 'edit') && (
            <>
              <div className="page-hdr">
                <div>
                  <h1 className="page-title">{view === 'edit' ? `Edit: ${editTarget?.name}` : 'Add New Product'}</h1>
                  <p className="page-sub">{view === 'edit' ? 'Update product details below' : 'Fill in details and publish'}</p>
                </div>
                <button className="btn-ghost" onClick={() => setView('list')}>← Back to List</button>
              </div>

              {status === 'done' && (
                <div className="banner banner-ok">✅ Product {view === 'edit' ? 'updated' : 'published'} successfully!</div>
              )}
              {(status === 'error' || errorMsg) && (
                <div className="banner banner-err">⚠️ {errorMsg}</div>
              )}

              <form onSubmit={handleSubmit} className="ap-form">

                {/* Image */}
                <div className="sec">
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
                      : <div className="drop-hint">
                          <div className="drop-icon">📷</div>
                          <p className="drop-text">Click or drag & drop image here</p>
                          <p className="drop-sub">JPG · PNG · WebP · max 10 MB</p>
                        </div>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    onChange={e => pickImage(e.target.files[0])} style={{ display:'none' }} />
                  {status === 'uploading' && (
                    <div className="prog-wrap">
                      <div className="prog-bar" style={{ width: `${uploadProgress}%` }} />
                      <span className="prog-txt">{uploadProgress}%</span>
                    </div>
                  )}
                  {form.image_url && !imageFile && (
                    <p className="img-name">📎 Current image saved</p>
                  )}
                </div>

                {/* Basic Info */}
                <div className="sec">
                  <h2 className="sec-title">📝 Product Details</h2>
                  <div className="grid2">
                    <div className="fg span2">
                      <label>Product Name *</label>
                      <input name="name" value={form.name} onChange={handleField} placeholder="e.g. Ragi Cookies" required />
                    </div>
                    <div className="fg">
                      <label>URL Slug (auto-filled)</label>
                      <input name="slug" value={form.slug} onChange={handleField} placeholder="ragi-cookies" />
                    </div>
                    <div className="fg">
                      <label>Category *</label>
                      <select name="category" value={form.category} onChange={handleField}>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg">
                      <label>Seller / Vendor *</label>
                      <select name="seller_id" value={form.seller_id || ''} onChange={handleField}>
                        <option value="">Default Store</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.email}) {s.is_active ? '' : '(Inactive)'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg span2">
                      <label>Description</label>
                      <textarea name="description" value={form.description} onChange={handleField}
                        rows={3} placeholder="Short description…" />
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
                </div>

                {/* Pricing & Stock */}
                <div className="sec">
                  <h2 className="sec-title">💰 Pricing & Stock</h2>
                  <div className="grid3">
                    <div className="fg">
                      <label>Base Price (₹) *</label>
                      <input type="number" name="price" value={form.price} onChange={handleField} placeholder="120" min="0" step="0.01" required />
                    </div>
                    <div className="fg">
                      <label>Discount Price (₹)</label>
                      <input type="number" name="discountPrice" value={form.discountPrice} onChange={handleField} placeholder="99" min="0" step="0.01" />
                    </div>
                    <div className="fg">
                      <label>Stock Qty</label>
                      <input type="number" name="stock" value={form.stock} onChange={handleField} placeholder="100" min="0" />
                    </div>
                    <div className="fg">
                      <label>Rating (1–5)</label>
                      <input type="number" name="rating" value={form.rating} onChange={handleField} step="0.1" min="1" max="5" />
                    </div>
                    <div className="fg">
                      <label>No. of Reviews</label>
                      <input type="number" name="numReviews" value={form.numReviews} onChange={handleField} min="0" />
                    </div>
                  </div>
                </div>

                {/* Weight Variants */}
                <div className="sec">
                  <h2 className="sec-title">⚖️ Weight / Size Variants</h2>
                  <p className="sec-sub">Add different weight options (e.g. 100g, 250g, 500g)</p>
                  {weights.map((w, i) => (
                    <div key={i} className="w-row">
                      <div className="fg">
                        <label>Label</label>
                        <input value={w.label} onChange={e => handleWeight(i, 'label', e.target.value)} placeholder="e.g. 250g" />
                      </div>
                      <div className="fg">
                        <label>MRP (₹)</label>
                        <input type="number" value={w.price} onChange={e => handleWeight(i, 'price', e.target.value)} placeholder="120" min="0" />
                      </div>
                      <div className="fg">
                        <label>Sale Price (₹)</label>
                        <input type="number" value={w.discountPrice} onChange={e => handleWeight(i, 'discountPrice', e.target.value)} placeholder="99" min="0" />
                      </div>
                      {weights.length > 1 && (
                        <button type="button" className="rm-btn" onClick={() => setWeights(ws => ws.filter((_, idx) => idx !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => setWeights(ws => [...ws, { label:'', price:'', discountPrice:'' }])}>
                    + Add another size
                  </button>
                </div>

                {/* Submit */}
                <div className="submit-row">
                  <button type="button" className="btn-ghost-lg" onClick={() => setView('list')} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={busy}>
                    {status === 'uploading' ? `⬆️ Uploading… ${uploadProgress}%`
                     : status === 'saving' ? '💾 Saving…'
                     : view === 'edit' ? '✅ Save Changes'
                     : '🚀 Publish Product'}
                  </button>
                </div>

              </form>
            </>
          )}

          {/* ── SELLERS VIEW ── */}
          {view === 'sellers' && (
            <>
              <div className="page-hdr">
                <div>
                  <h1 className="page-title">Sellers / Vendors</h1>
                  <p className="page-sub">Manage shop vendors and their locations</p>
                </div>
              </div>

              <div className="grid2" style={{ alignItems: 'start' }}>
                
                {/* Left: Add / Edit Seller */}
                <div className="sec">
                  <h2 className="sec-title">{editingSeller ? '✏️ Edit Seller' : '➕ Add New Seller'}</h2>
                  {sellerFormError && <div className="banner banner-err">⚠️ {sellerFormError}</div>}
                  {sellerActionStatus === 'done' && <div className="banner banner-ok">✅ Seller saved successfully!</div>}
                  
                  <form onSubmit={handleSellerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="fg">
                      <label>Seller Name *</label>
                      <input name="name" value={sellerForm.name} onChange={handleSellerField} placeholder="e.g. Green Farms" required />
                    </div>
                    <div className="fg">
                      <label>Email Address *</label>
                      <input type="email" name="email" value={sellerForm.email} onChange={handleSellerField} placeholder="vendor@example.com" required />
                    </div>
                    <div className="fg">
                      <label>Phone Number</label>
                      <input name="phone" value={sellerForm.phone} onChange={handleSellerField} placeholder="e.g. 9876543210" />
                    </div>
                    <div className="fg">
                      <label>Address Line 1 *</label>
                      <input name="line1" value={sellerForm.line1} onChange={handleSellerField} placeholder="Street, Building No" required />
                    </div>
                    <div className="grid2">
                      <div className="fg">
                        <label>City *</label>
                        <input name="city" value={sellerForm.city} onChange={handleSellerField} placeholder="Chennai" required />
                      </div>
                      <div className="fg">
                        <label>State *</label>
                        <input name="state" value={sellerForm.state} onChange={handleSellerField} placeholder="Tamil Nadu" required />
                      </div>
                    </div>
                    <div className="fg">
                      <label>Pincode *</label>
                      <input name="pincode" value={sellerForm.pincode} onChange={handleSellerField} placeholder="600001" required />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      {editingSeller && (
                        <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => {
                          setEditingSeller(null);
                          setSellerForm({ name:'', email:'', phone:'', line1:'', city:'', state:'', pincode:'' });
                        }}>Cancel</button>
                      )}
                      <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={sellerActionStatus === 'saving'}>
                        {sellerActionStatus === 'saving' ? 'Saving…' : editingSeller ? 'Update Seller' : 'Add Seller'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right: Seller List */}
                <div className="sec" style={{ overflowX: 'auto' }}>
                  <h2 className="sec-title">🏪 Registered Sellers</h2>
                  {sellers.length === 0 ? (
                    <p style={{ color: '#8b949e', fontSize: '0.88rem' }}>No sellers found.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                          <th style={{ padding: '8px' }}>Name</th>
                          <th style={{ padding: '8px' }}>Email</th>
                          <th style={{ padding: '8px' }}>City</th>
                          <th style={{ padding: '8px' }}>Status</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellers.map(s => {
                          const addr = s.address || {};
                          return (
                            <tr key={s.id} style={{ borderBottom: '1px solid #21262d' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>{s.name}</td>
                              <td style={{ padding: '8px' }}>{s.email}</td>
                              <td style={{ padding: '8px' }}>{addr.city || '—'}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  backgroundColor: s.is_active ? '#1a3a21' : '#2d1010',
                                  color: s.is_active ? '#3fb950' : '#f85149'
                                }}>
                                  {s.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button className="btn-edit" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => startEditSeller(s)}>✏️</button>
                                {s.is_active ? (
                                  <button className="btn-delete" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeactivateSeller(s)}>Deactivate</button>
                                ) : (
                                  <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#2D6A4F', boxShadow: 'none' }} onClick={() => handleActivateSeller(s)}>Activate</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </>
          )}

        </main>
      </div>

      <style jsx>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        .ap {
          display:flex; min-height:100vh;
          background:#0d1117; color:#e6edf3;
          font-family:'Inter','Segoe UI',sans-serif;
        }

        /* ── Sidebar ── */
        .sidebar {
          width:240px; flex-shrink:0;
          background:#161b22; border-right:1px solid #30363d;
          padding:24px 0; position:sticky; top:0; height:100vh; overflow-y:auto;
        }
        .sb-brand {
          display:flex; align-items:center; gap:10px;
          padding:0 20px 24px; border-bottom:1px solid #30363d;
        }
        .sb-leaf { font-size:2rem; }
        .sb-name { font-weight:800; font-size:1.1rem; color:#3fb950; }
        .sb-role { font-size:0.72rem; color:#8b949e; text-transform:uppercase; letter-spacing:0.06em; }

        .sb-nav { padding:16px 12px; display:flex; flex-direction:column; gap:4px; }
        .sb-link {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:8px; border:none;
          background:none; color:#8b949e; cursor:pointer;
          font-size:0.88rem; font-family:inherit; text-align:left; width:100%;
          transition:all 0.15s;
        }
        .sb-link:hover { background:#21262d; color:#e6edf3; }
        .sb-link.active { background:#1a3a21; color:#3fb950; font-weight:600; }

        .sb-stats {
          margin:16px 12px 0;
          display:grid; grid-template-columns:1fr 1fr; gap:8px;
          border-top:1px solid #30363d; padding-top:16px;
        }
        .sb-stat {
          background:#0d1117; border:1px solid #30363d;
          border-radius:8px; padding:10px 8px; text-align:center;
        }
        .sb-stat span { display:block; font-size:1.3rem; font-weight:700; color:#3fb950; }
        .sb-stat.out span { color:#f85149; }
        .sb-stat label { font-size:0.68rem; color:#8b949e; text-transform:uppercase; margin-top:2px; }

        /* ── Main ── */
        .ap-main { flex:1; padding:32px; overflow-y:auto; max-height:100vh; }

        .page-hdr {
          display:flex; justify-content:space-between; align-items:flex-start;
          margin-bottom:24px; gap:16px; flex-wrap:wrap;
        }
        .page-title { font-size:1.8rem; font-weight:800; }
        .page-sub   { color:#8b949e; font-size:0.88rem; margin-top:4px; }

        /* Buttons */
        .btn-primary {
          background:linear-gradient(135deg,#1a5c38,#3fb950);
          color:#fff; border:none; padding:10px 22px;
          border-radius:9px; font-size:0.88rem; font-weight:700;
          cursor:pointer; transition:all 0.2s; white-space:nowrap;
          box-shadow:0 2px 12px rgba(63,185,80,0.3);
        }
        .btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(63,185,80,0.4); }

        .btn-ghost {
          background:none; border:1px solid #30363d; color:#8b949e;
          padding:10px 18px; border-radius:9px; cursor:pointer;
          font-size:0.88rem; transition:all 0.2s; font-family:inherit;
        }
        .btn-ghost:hover { background:#21262d; color:#e6edf3; }

        .btn-ghost-lg {
          background:none; border:1px solid #30363d; color:#8b949e;
          padding:14px 32px; border-radius:10px; cursor:pointer;
          font-size:0.95rem; transition:all 0.2s; font-family:inherit;
        }
        .btn-ghost-lg:hover { background:#21262d; color:#e6edf3; }

        /* Search */
        .search-bar {
          display:flex; align-items:center; gap:10px;
          background:#161b22; border:1px solid #30363d; border-radius:10px;
          padding:10px 16px; margin-bottom:24px;
        }
        .search-icon { font-size:1rem; }
        .search-bar input {
          flex:1; background:none; border:none; outline:none;
          color:#e6edf3; font-size:0.95rem; font-family:inherit;
        }
        .search-bar input::placeholder { color:#8b949e; }
        .clear-search {
          background:none; border:none; color:#8b949e;
          cursor:pointer; font-size:0.85rem; padding:2px 4px;
        }

        /* States */
        .loading-wrap { display:flex; align-items:center; gap:14px; padding:40px; color:#8b949e; }
        .spinner {
          width:24px; height:24px; border:3px solid #30363d;
          border-top-color:#3fb950; border-radius:50%; animation:spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty-state { text-align:center; padding:60px 20px; color:#8b949e; }
        .empty-state div { margin-bottom:12px; }

        /* Product Grid */
        .product-grid {
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap:16px;
        }
        .p-card {
          background:#161b22; border:1px solid #30363d; border-radius:12px;
          overflow:hidden; transition:all 0.2s;
        }
        .p-card:hover { border-color:#3fb950; box-shadow:0 4px 24px rgba(63,185,80,0.1); transform:translateY(-2px); }

        .p-img-wrap { position:relative; height:160px; background:#0d1117; overflow:hidden; }
        .p-img { width:100%; height:100%; object-fit:cover; }
        .p-img-ph {
          width:100%; height:100%;
          display:flex; align-items:center; justify-content:center; font-size:3.5rem;
        }
        .p-badge {
          position:absolute; top:8px; left:8px;
          font-size:0.68rem; font-weight:700; padding:3px 8px; border-radius:20px;
        }
        .p-badge.featured { background:#1a3a21; color:#3fb950; }
        .p-badge.oos { background:#2d1010; color:#f85149; }

        .p-info { padding:12px 14px; }
        .p-cat { font-size:0.7rem; color:#8b949e; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
        .p-name { font-size:0.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:8px; }
        .p-meta { display:flex; gap:10px; flex-wrap:wrap; font-size:0.78rem; }
        .p-price { color:#3fb950; font-weight:700; }
        .p-stock { color:#8b949e; }
        .p-rating { color:#f0c040; }

        .p-actions {
          display:flex; gap:8px; padding:10px 14px;
          border-top:1px solid #21262d;
        }
        .btn-edit {
          flex:1; padding:8px; background:#1c2128;
          border:1px solid #30363d; color:#e6edf3;
          border-radius:7px; cursor:pointer; font-size:0.8rem;
          transition:all 0.15s; font-family:inherit;
        }
        .btn-edit:hover { background:#21262d; border-color:#3fb950; color:#3fb950; }
        .btn-delete {
          flex:1; padding:8px; background:#1c1010;
          border:1px solid #30363d; color:#e6edf3;
          border-radius:7px; cursor:pointer; font-size:0.8rem;
          transition:all 0.15s; font-family:inherit;
        }
        .btn-delete:hover { background:#2d1010; border-color:#f85149; color:#f85149; }

        /* Form */
        .ap-form { display:flex; flex-direction:column; gap:20px; max-width:840px; }
        .sec { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:22px; }
        .sec-title { font-size:0.95rem; font-weight:700; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #30363d; }
        .sec-sub { color:#8b949e; font-size:0.82rem; margin:-6px 0 14px; }

        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .span2 { grid-column:1/-1; }

        .fg { display:flex; flex-direction:column; gap:5px; }
        .fg label { font-size:0.72rem; font-weight:600; color:#8b949e; text-transform:uppercase; letter-spacing:0.06em; }
        .fg input,.fg select,.fg textarea {
          background:#0d1117; border:1px solid #30363d; color:#e6edf3;
          border-radius:8px; padding:10px 12px; font-size:0.88rem; font-family:inherit; width:100%;
          transition:border-color 0.15s;
        }
        .fg input:focus,.fg select:focus,.fg textarea:focus {
          outline:none; border-color:#3fb950; box-shadow:0 0 0 3px rgba(63,185,80,0.1);
        }
        .fg textarea { resize:vertical; }

        .drop-zone {
          border:2px dashed #30363d; border-radius:12px;
          min-height:180px; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all 0.2s; overflow:hidden;
        }
        .drop-zone:hover,.drag-over { border-color:#3fb950; background:rgba(63,185,80,0.04); }
        .drop-hint { text-align:center; padding:20px; }
        .drop-icon { font-size:2.5rem; margin-bottom:8px; }
        .drop-text { color:#e6edf3; font-size:0.95rem; margin:0 0 4px; }
        .drop-sub { color:#8b949e; font-size:0.78rem; }
        .img-prev { max-height:220px; max-width:100%; object-fit:contain; border-radius:8px; }
        .img-name { color:#8b949e; font-size:0.78rem; margin-top:8px; }

        .prog-wrap {
          display:flex; align-items:center; gap:10px; margin-top:12px;
          background:#0d1117; border-radius:20px; padding:4px 12px;
          border:1px solid #30363d;
        }
        .prog-bar { height:6px; background:linear-gradient(90deg,#3fb950,#58a6ff); border-radius:3px; transition:width 0.3s; min-width:4px; }
        .prog-txt { color:#8b949e; font-size:0.78rem; white-space:nowrap; }

        .tog { display:flex; align-items:center; gap:10px; cursor:pointer; margin-top:4px; user-select:none; }
        .tog input { display:none; }
        .tog-track { width:44px; height:24px; background:#30363d; border-radius:12px; position:relative; transition:background 0.2s; flex-shrink:0; }
        .tog-track::after { content:''; position:absolute; top:3px; left:3px; width:18px; height:18px; background:#6e7681; border-radius:50%; transition:transform 0.2s, background 0.2s; }
        .tog input:checked ~ .tog-track { background:#1a5c38; }
        .tog input:checked ~ .tog-track::after { transform:translateX(20px); background:#3fb950; }
        .tog-lbl { color:#e6edf3; font-size:0.88rem; }

        .w-row { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:10px; align-items:end; padding:10px 0; border-bottom:1px solid #21262d; }
        .rm-btn { width:34px; height:34px; background:#2d1010; border:1px solid #f85149; color:#f85149; border-radius:7px; cursor:pointer; align-self:flex-end; transition:all 0.2s; }
        .rm-btn:hover { background:#f85149; color:#fff; }
        .add-btn { margin-top:12px; width:100%; padding:10px; background:none; border:1.5px dashed #30363d; color:#8b949e; border-radius:8px; cursor:pointer; font-size:0.83rem; transition:all 0.2s; }
        .add-btn:hover { border-color:#3fb950; color:#3fb950; }

        .submit-row { display:flex; gap:12px; justify-content:flex-end; }
        .submit-btn {
          background:linear-gradient(135deg,#1a5c38,#3fb950);
          color:#fff; border:none; padding:14px 40px;
          border-radius:10px; font-size:1rem; font-weight:700;
          cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 20px rgba(63,185,80,0.3);
        }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 6px 28px rgba(63,185,80,0.4); }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        .banner { padding:12px 16px; border-radius:10px; margin-bottom:20px; font-size:0.9rem; }
        .banner-ok  { background:#0d2b1a; border:1px solid #3fb950; color:#3fb950; }
        .banner-err { background:#2d1010; border:1px solid #f85149; color:#f85149; }

        @media (max-width:768px) {
          .ap { flex-direction:column; }
          .sidebar { width:100%; height:auto; position:relative; }
          .sb-nav { flex-direction:row; flex-wrap:wrap; }
          .ap-main { padding:20px 16px; max-height:none; }
          .grid2,.grid3 { grid-template-columns:1fr; }
          .span2 { grid-column:1; }
          .w-row { grid-template-columns:1fr 1fr; }
          .product-grid { grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); }
        }
      `}</style>
    </>
  );
}
