import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../constants';

// Responsive, modern luxury confirmation page (Luxe-Gold Edition)
// Color palette: #0D0D0D (charcoal), #D4AF37 (gold), #fff (white)
// All product images, order details, and user info are shown
const money = (v) => `9${Number(v || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const ConfirmationPremium = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [feedback, setFeedback] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const syncInProgressRef = useRef(false);

  // Fetch order from localStorage or backend
  useEffect(() => {
    async function syncOrder() {
      let fallbackOrder = null;
      const stored = localStorage.getItem('lastPlacedOrder');
      if (stored) {
        try { fallbackOrder = JSON.parse(stored); } catch {}
      }
      setOrder(fallbackOrder);
      setLoading(false);
      // Optionally, fetch latest from backend
      if (fallbackOrder?.orderId) {
        try {
          const { data } = await axios.get(`${BASE_URL}/api/order/${encodeURIComponent(fallbackOrder.orderId)}?userId=${encodeURIComponent(fallbackOrder.userid)}`);
          if (data?.orderId) setOrder(data);
        } catch {}
      }
    }
    syncOrder();
  }, []);

  // Fetch recommendations
  useEffect(() => {
    async function getRecommendedProducts() {
      try {
        const { data } = await axios.get(`${BASE_URL}/product`);
        const list = Array.isArray(data) ? data : [];
        const purchased = new Set((order?.products || []).map((p) => String(p.productid || p._id || p.id || '')));
        const picks = list.filter((p) => !purchased.has(String(p._id || p.id || ''))).slice(0, 4);
        setRecommended(picks);
      } catch (e) {
        setRecommended([]);
      }
    }
    if (order?.orderId) getRecommendedProducts();
  }, [order?.orderId]);

  // Feedback submit
  async function handleFeedbackSubmit() {
    if (!order?.orderId || !feedback) return;
    setFeedbackSent(true);
    // TODO: Send feedback to backend
    setTimeout(() => setFeedbackSent(false), 2000);
  }

  // Invoice download
  async function handleInvoiceDownload() {
    if (!order) return;
    setInvoiceLoading(true);
    // TODO: Generate and download invoice (HTML/PDF)
    setTimeout(() => setInvoiceLoading(false), 1200);
  }

  if (loading || !order) return <div style={{color:'#d4af37',textAlign:'center',marginTop:80}}>Loading your order...</div>;

  const items = Array.isArray(order.products) ? order.products.map((p) => ({
    name: p.name || p.product?.name || 'Product',
    price: p.price || p.product?.finalprice || p.product?.price || 0,
    image: p.product?.pic1 || p.image || p.product?.image || 'https://eshopperr.me/assets/images/sample-watch.jpg',
    quantity: p.quantity || p.qty || 1,
  })) : [];
  const subtotal = Number(order.totalAmount || 0);
  const tax = Math.round(subtotal * 0.05);
  const total = Number(order.finalAmount || subtotal);
  const shipping = Number(order.shippingAmount || 0);
  const shippingAddress = order.shippingAddress?.address || order.shippingAddress || 'N/A';
  const paymentDetails = order.paymentMethod || 'N/A';
  const expectedDate = formatDate(order.estimatedArrival || Date.now() + 4 * 24 * 60 * 60 * 1000);
  const orderId = order.orderId || 'N/A';
  const userName = order.shippingAddress?.fullName || order.userName || 'Valued Customer';

  return (
    <div
      style={{
        background: "#0D0D0D",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: 0,
        margin: 0,
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "#0D0D0D",
          borderRadius: 18,
          boxShadow: "0 4px 32px #0008",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 0 18px 0" }}>
          <img
            src="https://eshopperr.me/logo-final-email.png"
            alt="eShopper Luxe Gold Logo"
            width={120}
            style={{
              display: "block",
              margin: "0 auto 12px auto",
              filter: "drop-shadow(0 2px 8px #d4af3740)",
            }}
          />
          <div
            style={{
              display: "inline-block",
              padding: "7px 22px",
              border: "1.5px solid #D4AF37",
              borderRadius: 22,
              fontSize: 15,
              fontWeight: 600,
              color: "#D4AF37",
              background: "#181818",
              marginBottom: 8,
            }}
          >
            <span style={{ verticalAlign: "middle" }}>Order Confirmed</span>
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                background: "#1aaf5d",
                borderRadius: "50%",
                marginLeft: 8,
                verticalAlign: "middle",
                lineHeight: "18px",
                textAlign: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="6" fill="#1aaf5d" />
                <polyline
                  points="3,7 5,9 9,4"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: "#fff",
              marginBottom: 6,
              marginTop: 8,
            }}
          >
            Expected by {expectedDate}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#d4af37",
              opacity: 0.92,
              marginBottom: 18,
            }}
          >
            Our artisans are now preparing your handpicked selection.
          </div>
        </div>

        {/* Item Grid */}
        <div style={{ padding: "0 32px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", paddingBottom: 8 }}>
            Your Items
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#181818",
                  borderRadius: 12,
                  padding: "12px 10px",
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  width={72}
                  height={72}
                  style={{
                    borderRadius: 12,
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    marginRight: 14,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{item.name}</div>
                  <div style={{ fontSize: 15, color: "#d4af37", fontWeight: 600, marginTop: 2 }}>{money(item.price)} x {item.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ padding: "0 32px", marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: 12,
              padding: "14px 12px 14px 16px",
              flex: 1,
              minWidth: 180,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: "#d4af37", marginBottom: 4 }}>Shipping Address</div>
            <div style={{ fontSize: 14 }}>{shippingAddress}</div>
          </div>
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: 12,
              padding: "14px 16px 14px 12px",
              flex: 1,
              minWidth: 180,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: "#d4af37", marginBottom: 4 }}>Payment Details</div>
            <div style={{ fontSize: 14 }}>{paymentDetails}</div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div style={{ padding: "0 32px" }}>
          <table style={{ width: "100%", marginTop: 18, marginBottom: 10 }}>
            <tbody>
              <tr>
                <td style={{ textAlign: "right", fontSize: 15, color: "#fff" }}>Subtotal:</td>
                <td style={{ textAlign: "right", fontSize: 15, color: "#fff", fontWeight: 600 }}>₹{subtotal}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "right", fontSize: 15, color: "#d4af37" }}>Shipping:</td>
                <td style={{ textAlign: "right", fontSize: 15, color: "#d4af37", fontWeight: 600 }}>Complimentary</td>
              </tr>
              <tr>
                <td style={{ textAlign: "right", fontSize: 15, color: "#bdbdbd" }}>Estimated Tax/GST:</td>
                <td style={{ textAlign: "right", fontSize: 15, color: "#bdbdbd", fontWeight: 600 }}>₹{tax}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "right", fontSize: 18, color: "#d4af37", fontWeight: 700, paddingTop: 8 }}>Order Total:</td>
                <td style={{ textAlign: "right", fontSize: 18, color: "#d4af37", fontWeight: 700, paddingTop: 8 }}>₹{total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Luxe Promise Section */}
        <div style={{ padding: "0 32px" }}>
          <div style={{ textAlign: "center", fontSize: 13, color: "#fff", marginBottom: 18 }}>
            <span style={{ display: "inline-block", margin: "0 10px 0 0", verticalAlign: "middle" }}>
              <img src="https://eshopperr.me/assets/icons/quality-check.png" width={18} alt="Quality Check" style={{ verticalAlign: "middle" }} />
            </span>
            10-Point Quality Check
            <span style={{ display: "inline-block", margin: "0 10px 0 18px", verticalAlign: "middle" }}>
              <img src="https://eshopperr.me/assets/icons/insured-shipping.png" width={18} alt="Insured Shipping" style={{ verticalAlign: "middle" }} />
            </span>
            Insured Shipping
            <span style={{ display: "inline-block", margin: "0 0 0 18px", verticalAlign: "middle" }}>
              <img src="https://eshopperr.me/assets/icons/easy-returns.png" width={18} alt="Easy Returns" style={{ verticalAlign: "middle" }} />
            </span>
            7-Day Easy Returns
          </div>
        </div>

        {/* Footer & Actions */}
        <div style={{ padding: "0 32px 32px 32px", textAlign: "center" }}>
          <button
            onClick={() => navigate('/myorders')}
            style={{
              display: "inline-block",
              padding: "13px 38px",
              borderRadius: 24,
              background: "linear-gradient(90deg,#d4af37,#f5e7b2)",
              color: "#0D0D0D",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              marginBottom: 12,
              boxShadow: "0 2px 8px #d4af3720",
              border: "none",
              cursor: "pointer",
            }}
          >
            View All Orders
          </button>
          <button
            onClick={handleInvoiceDownload}
            disabled={invoiceLoading}
            style={{
              display: "inline-block",
              padding: "13px 38px",
              borderRadius: 24,
              background: invoiceLoading ? '#bdbdbd' : "linear-gradient(90deg,#d4af37,#f5e7b2)",
              color: "#0D0D0D",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              marginBottom: 12,
              marginLeft: 12,
              boxShadow: "0 2px 8px #d4af3720",
              border: "none",
              cursor: invoiceLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {invoiceLoading ? 'Preparing Invoice...' : 'Download Invoice'}
          </button>
          <div style={{ marginTop: 18, fontSize: 15, color: '#d4af37', fontWeight: 600 }}>
            Thank you, {userName.split(' ')[0] || 'Customer'}! Your order ID is <span style={{color:'#fff'}}>{orderId}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <a href="https://instagram.com/eshopperr" style={{ color: "#d4af37", textDecoration: "none", marginRight: 18 }}>
              Instagram
            </a>
            <a href="mailto:support@eshopperr.me" style={{ color: "#fff", textDecoration: "none" }}>
              Support
            </a>
          </div>
        </div>

        {/* Recommendations */}
        {recommended.length > 0 && (
          <div style={{ padding: '0 32px 32px 32px', textAlign: 'center' }}>
            <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Recommended for You</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              {recommended.map((p) => (
                <div key={p._id || p.id} style={{ background: '#181818', borderRadius: 12, padding: 12, width: 140 }}>
                  <img src={p.pic1 || p.image} alt={p.name} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                  <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 14 }}>{money(p.finalprice || p.price)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Prompt */}
        <div style={{ padding: '0 32px 32px 32px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>How was your experience?</div>
          <div>
            {[1,2,3,4,5].map((star) => (
              <span key={star} style={{ fontSize: 28, color: feedback >= star ? '#d4af37' : '#bdbdbd', cursor: 'pointer' }} onClick={() => setFeedback(star)}>&#9733;</span>
            ))}
          </div>
          <button
            onClick={handleFeedbackSubmit}
            disabled={feedbackSent || !feedback}
            style={{
              marginTop: 10,
              padding: '8px 28px',
              borderRadius: 18,
              background: feedbackSent ? '#bdbdbd' : '#d4af37',
              color: '#0D0D0D',
              fontWeight: 700,
              border: 'none',
              cursor: feedbackSent ? 'not-allowed' : 'pointer',
            }}
          >
            {feedbackSent ? 'Thank you!' : 'Submit Feedback'}
          </button>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 650px) {
          div[style*='max-width: 600px'] { max-width: 100% !important; border-radius: 0 !important; }
          div[style*='padding:0 32px'] { padding: 0 8px !important; }
          img[width='72'] { width: 100% !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationPremium;
 