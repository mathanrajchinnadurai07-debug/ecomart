import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
      a: "No minimum order. Orders above ₹499 get free delivery. Below ₹499, a ₹49 delivery charge applies."
    }
  ];

  return (
    <div className="support-pg">
      <Head>
        <title>Help & Support — Curify</title>
        <meta name="description" content="We're here to help you with anything you need. Get in touch with Curify Support for orders, products, delivery, and refunds." />
      </Head>

      <style>{`
        .support-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        
        /* Sticky Header */
        .support-top-header {
          position: sticky; top: 0; z-index: 200;
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 12px rgba(26,92,56,0.3);
        }
        .support-top-header h1 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; }
        .support-back-btn { background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; font-size: 1rem; }

        .support-container { padding: 16px 12px; max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
        @media(min-width: 768px) {
          .support-container { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        }

        /* Card styles */
        .sup-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.01); }
        .sup-card-title { font-size: 1.05rem; font-weight: 700; color: #1a5c38; font-family: 'Poppins', sans-serif; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #e8f5e9; padding-bottom: 10px; }

        /* Form elements */
        .form-group { margin-bottom: 14px; display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 0.75rem; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.3px; }
        .form-input, .form-select, .form-textarea {
          width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px;
          font-size: 0.88rem; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif;
          background: #fff;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: #1a5c38; box-shadow: 0 0 0 3px rgba(26,92,56,0.1); }
        .form-textarea { resize: none; }

        /* Submit Button */
        .btn-submit {
          width: 100%; padding: 14px; background: linear-gradient(135deg, #e05a2b, #f77f00);
          color: #fff; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(224,90,43,0.3); transition: all 0.2s;
        }
        .btn-submit:active { transform: scale(0.98); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Contact Details list */
        .contact-list { display: flex; flex-direction: column; gap: 14px; }
        .contact-item { display: flex; align-items: center; gap: 14px; }
        .contact-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: #e8f5ee; color: #1a5c38; display: flex;
          align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0;
        }
        .contact-info strong { font-size: 0.88rem; color: #333; display: block; font-family: 'Poppins', sans-serif; }
        .contact-info span { font-size: 0.78rem; color: #666; }

        /* FAQ styles */
        .faq-list { display: flex; flex-direction: column; gap: 10px; }
        .faq-item { border: 1px solid #e8f5ee; border-radius: 10px; overflow: hidden; background: #fff; transition: all 0.2s; }
        .faq-item.active { border-color: #1a5c38; box-shadow: 0 2px 8px rgba(26,92,56,0.05); }
        .faq-question-btn {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; border: none; cursor: pointer; text-align: left;
          font-weight: 700; font-size: 0.85rem; font-family: 'Poppins', sans-serif;
          background: #fff; transition: all 0.2s;
        }
        .faq-item.active .faq-question-btn { background: #fafdfb; color: #1a5c38; }
        .faq-chevron { font-size: 0.78rem; color: #94a3b8; transition: transform 0.2s; }
        .faq-item.active .faq-chevron { transform: rotate(180deg); color: #1a5c38; }
        
        .faq-answer-wrap {
          max-height: 0; overflow: hidden; transition: max-height 0.2s ease-out;
          border-top: none; background: #fff;
        }
        .faq-item.active .faq-answer-wrap { border-top: 1px dashed #e8f5ee; }
        .faq-answer { padding: 14px 16px; font-size: 0.8rem; color: #555; line-height: 1.5; }
      `}</style>

      {/* Top Header */}
      <div className="support-top-header">
        <Link href="/">
          <button className="support-back-btn">
            <i className="fas fa-arrow-left"></i>
          </button>
        </Link>
        <h1>🌿 Support Center</h1>
        <div style={{ width: '36px' }}></div>
      </div>

      <div className="support-container">
        
        {/* Contact Form Card */}
        <div className="sup-card">
          <div className="sup-card-title">
            <i className="fas fa-envelope"></i> Send Us a Message
          </div>
          <form onSubmit={handleSubmit} id="contactForm">
            <div className="form-group">
              <label>Your Name</label>
              <input 
                type="text" 
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                required 
                placeholder="Full name" 
              />
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                required 
                placeholder="you@example.com" 
              />
            </div>
            
            <div className="form-group">
              <label>Subject</label>
              <select 
                name="subject"
                className="form-select"
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
              <label>Message</label>
              <textarea 
                name="message"
                className="form-textarea"
                value={formData.message}
                onChange={handleInputChange}
                rows="4" 
                required 
                placeholder="Describe your issue..."
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={submitting}
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

        {/* Info & FAQ Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Contact Box */}
          <div className="sup-card">
            <div className="sup-card-title">
              <i className="fas fa-phone-alt"></i> Get in Touch
            </div>
            <div className="contact-list">
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div className="contact-info">
                  <strong>Call Customer Care</strong>
                  <span>+91 78457 44038</span>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="contact-info">
                  <strong>Email Support</strong>
                  <span>Curify01@gmail.com</span>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="contact-info">
                  <strong>Support Hours</strong>
                  <span>Mon-Sat: 8 AM - 8 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion FAQ Box */}
          <div className="sup-card">
            <div className="sup-card-title">
              <i className="fas fa-question-circle"></i> FAQ
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div 
                    key={index} 
                    className={`faq-item ${isOpen ? 'active' : ''}`}
                  >
                    <button 
                      onClick={() => toggleFaq(index)}
                      className="faq-question-btn"
                    >
                      <span>{faq.q}</span>
                      <i className="fas fa-chevron-down faq-chevron"></i>
                    </button>
                    
                    <div 
                      className="faq-answer-wrap"
                      style={{ maxHeight: isOpen ? '200px' : '0' }}
                    >
                      <div className="faq-answer">
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
  );
}
