import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TestPage() {
  const [healthStatus, setHealthStatus] = useState({ loading: true, ok: false, data: null, error: null });
  const [productsStatus, setProductsStatus] = useState({ loading: true, ok: false, data: null, error: null });
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // 1. Fetch backend health check
    fetch(`${apiUrl}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => setHealthStatus({ loading: false, ok: true, data, error: null }))
      .catch(err => setHealthStatus({ loading: false, ok: false, data: null, error: err.message }));

    // 2. Fetch backend products listing
    fetch(`${apiUrl}/api/products?limit=1`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => setProductsStatus({ loading: false, ok: true, data, error: null }))
      .catch(err => setProductsStatus({ loading: false, ok: false, data: null, error: err.message }));
  }, [apiUrl]);

  return (
    <>
      <Head>
        <title>Curify — Connection Test</title>
      </Head>
      <div className="test-container">
        <h1>🔌 Curify Full-Stack Connection Test</h1>
        <p className="subtitle">Checking frontend connection to Express backend on: <code>{apiUrl}</code></p>
        
        <div className="cards">
          {/* Health check card */}
          <div className="card">
            <h2>Backend Health Status</h2>
            {healthStatus.loading ? (
              <span className="badge badge-loading">Loading...</span>
            ) : healthStatus.ok ? (
              <div>
                <span className="badge badge-success">Connected 🟢</span>
                <pre>{JSON.stringify(healthStatus.data, null, 2)}</pre>
              </div>
            ) : (
              <div>
                <span className="badge badge-danger">Failed 🔴</span>
                <p className="error-msg">Error: {healthStatus.error}</p>
              </div>
            )}
          </div>

          {/* Products card */}
          <div className="card">
            <h2>PostgreSQL Products Query</h2>
            {productsStatus.loading ? (
              <span className="badge badge-loading">Loading...</span>
            ) : productsStatus.ok ? (
              <div>
                <span className="badge badge-success">Connected 🟢</span>
                <p>Retrieved products successfully from PostgreSQL database via API.</p>
                <pre>{JSON.stringify(productsStatus.data, null, 2)}</pre>
              </div>
            ) : (
              <div>
                <span className="badge badge-danger">Failed 🔴</span>
                <p className="error-msg">Error: {productsStatus.error}</p>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .test-container {
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            font-family: 'Inter', sans-serif;
            background: #fff;
            color: #333;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          }
          h1 {
            font-family: 'Poppins', sans-serif;
            color: #1a5c38;
            margin-bottom: 5px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
          }
          code {
            background: #f4f6f0;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
          .cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            background: #fafaf9;
          }
          h2 {
            font-size: 1.1rem;
            margin-top: 0;
            color: #2d6a4f;
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .badge-loading {
            background: #e2e8f0;
            color: #4a5568;
          }
          .badge-success {
            background: #d1fae5;
            color: #065f46;
          }
          .badge-danger {
            background: #fee2e2;
            color: #991b1b;
          }
          pre {
            background: #1e1e1e;
            color: #3fb950;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.8rem;
            max-height: 250px;
          }
          .error-msg {
            color: #ef4444;
            font-size: 0.9rem;
          }
          @media(max-width: 640px) {
            .cards {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </>
  );
}
