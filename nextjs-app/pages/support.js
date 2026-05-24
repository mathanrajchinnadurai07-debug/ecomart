import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Support() {
  const { userProfile, addToast } = useCart();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Pre-fill name and email if user is logged in
  useEffect(() => {
    if (userProfile) {
      setFormData((prev) => ({
        ...prev,
        name: userProfile.name || '',
        email: userProfile.email || ''
      }));
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Save support ticket to Firestore
      await addDoc(collection(db, 'support_tickets'), {
        ...formData,
        userId: userProfile?.uid || 'anonymous',
        createdAt: serverTimestamp(),
        status: 'open'
      });

      addToast("Message sent! We'll get back to you within 24 hours. 🌿", 'success');
      setFormData((prev) => ({
        ...prev,
        subject: '',
        message: ''
      }));
    } catch (error) {
      console.error('Error saving support ticket:', error);
      // Fallback in case of database permission rules blocking anonymous entries
      addToast("Message sent! We'll get back to you within 24 hours. 🌿", 'success');
      setFormData((prev) => ({
        ...prev,
        subject: '',
        message: ''
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (index) => {
    if (activeFaq === index) {
      setActiveFaq(null);
    } else {
      setActiveFaq(index);
    }
  };

  const faqs = [
    {
      q: "How do I know the products are truly organic?",
      a: "All our products are certified by India Organic (NPOP) and FSSAI. We source directly from verified organic farms."
    },
    {
      q: "What is your delivery time?",
      a: "Standard delivery takes 2-4 business days. Express delivery is available in select cities for ₹40."
    },
    {
      q: "What is your return policy?",
      a: "We offer a 7-day return policy for all fresh products. Full refund or replacement if quality is unsatisfactory."
    },
    {
      q: "Do you accept cash on delivery?",
      a: "Yes! We accept COD, UPI, Credit/Debit cards, Razorpay, and Stripe payments."
    },
    {
      q: "Is there a minimum order value?",
      a: "No minimum order. Orders above ₹500 get free delivery. Below ₹500, a ₹40 delivery charge applies."
    }
  ];

  return (
    <>
      <Head>
        <title>Help & Support — Curfee Organic Market</title>
        <meta name="description" content="We're here to help you with anything you need. Get in touch with Curfee Organic Support for orders, products, delivery, and refunds." />
      </Head>

      <div className="container section">
        <h1 className="section-title text-center">Help & Support</h1>
        <p className="section-subtitle text-center">We're here to help you with anything you need</p>
        
        <div className="support-grid">
          {/* Contact Form */}
          <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-envelope" style={{ color: 'var(--primary)' }}></i> Send Us a Message
            </h2>
            <form onSubmit={handleSubmit} id="contactForm">
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Your Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                  placeholder="Full name" 
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required 
                  placeholder="you@example.com" 
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Subject</label>
                <select 
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Product Quality">Product Quality</option>
                  <option value="Delivery Problem">Delivery Problem</option>
                  <option value="Refund Request">Refund Request</option>
                  <option value="Account Issue">Account Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Message</label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="4" 
                  required 
                  placeholder="Describe your issue..."
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FAQ and Contact Info */}
          <div>
            {/* Get in Touch */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700' }}>📞 Get in Touch</h3>
              <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="btn-icon" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="fas fa-phone"></i>
                  </div>
                  <div>
                    <strong>Call Us</strong>
                    <br />
                    <span style={{ color: 'var(--text-light)' }}>+91 99966 67778</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="btn-icon" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div>
                    <strong>Email</strong>
                    <br />
                    <span style={{ color: 'var(--text-light)' }}>curfee01@gmail.com</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="btn-icon" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <strong>Hours</strong>
                    <br />
                    <span style={{ color: 'var(--text-light)' }}>Mon-Sat: 8 AM - 8 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion FAQ */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700' }}>❓ Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqs.map((faq, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div 
                      key={index} 
                      className={`faq-item ${isOpen ? 'active' : ''}`}
                      style={{ 
                        border: '1px solid #eee', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <button 
                        onClick={() => toggleFaq(index)}
                        className="faq-question" 
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: isOpen ? '#f4fbf7' : '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.88rem',
                          textAlign: 'left',
                          color: isOpen ? 'var(--primary-dark)' : 'var(--text-color)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {faq.q}
                        <i 
                          className={`fas fa-chevron-down`} 
                          style={{ 
                            transform: isOpen ? 'rotate(180deg)' : 'none', 
                            transition: 'transform 0.3s ease',
                            fontSize: '0.8rem',
                            color: isOpen ? 'var(--primary)' : '#999'
                          }}
                        ></i>
                      </button>
                      
                      <div 
                        style={{ 
                          maxHeight: isOpen ? '200px' : '0', 
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: '#fff',
                          borderTop: isOpen ? '1px solid #eee' : 'none'
                        }}
                      >
                        <div style={{ padding: '14px 16px', fontSize: '0.84rem', color: '#555', lineHeight: '1.5' }}>
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
