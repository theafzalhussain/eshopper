import React from "react";

// Responsive, modern luxury confirmation page (Luxe-Gold Edition)
// Color palette: #0D0D0D (charcoal), #D4AF37 (gold), #fff (white)
// All product images, order details, and user info are shown

<<<<<<< HEAD
=======

// --- Luxe Order Confirmation (Gold/Green, Table Layout, All Sections) ---
>>>>>>> parent of 9973d6f (Fixed railway workflow build error)
const ConfirmationPremium = ({
  order = {},
  user = {},
  onViewOrder = () => {},
}) => {
  // Fallbacks for demo
  const {
    items = [
      {
<<<<<<< HEAD
        name: "Gold Luxe Watch",
        price: 12999,
        image: "https://eshopperr.me/assets/images/sample-watch.jpg",
      },
      {
        name: "Champagne Silk Scarf",
        price: 3499,
        image: "https://eshopperr.me/assets/images/sample-scarf.jpg",
      },
    ],
    subtotal = 16498,
    tax = 0,
    total = 16498,
    shipping = 0,
    shippingAddress = "A-101, Luxe Residency, Mumbai, 400001",
    paymentDetails = "Credit Card (**** 1234)",
    expectedDate = "Wednesday, 11th March",
    orderId = "ORD1234567",
  } = order;

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
                  <div style={{ fontSize: 15, color: "#d4af37", fontWeight: 600, marginTop: 2 }}>₹{item.price}</div>
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
        {/* Footer */}
        <div style={{ padding: "0 32px 32px 32px", textAlign: "center" }}>
          <button
            onClick={onViewOrder}
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
            View Order
          </button>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <a href="https://instagram.com/eshopperr" style={{ color: "#d4af37", textDecoration: "none", marginRight: 18 }}>
              Instagram
            </a>
            <a href="mailto:support@eshopperr.me" style={{ color: "#fff", textDecoration: "none" }}>
              Support
            </a>
          </div>
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
=======
        name: "mens formal shirts",
        price: 2500,
        image: "https://i.imgur.com/0y8Ftya.jpg",
        size: "S",
        color: "green",
        qty: 1,
      },
    ],
    subtotal = 2500,
    tax = 450,
    total = 2500,
    shipping = 0,
    shippingAddress = "23, Street Number 23 dass garden baporla vihar, Delhi, New Delhi 110043",
    paymentDetails = "COD",
    expectedDate = "14 March 2026",
    orderId = "ESHP-2026-0038",
    orderDate = "7 March 2026",
    transactionId = "TXN1772884951521",
    email = "theafzalfhussain786@gmail.com",
    phone = "8447859784",
    customer = "Afzal Hussain",
  } = order;

  return (
    <div style={{ background: "#111", minHeight: "100vh", padding: "40px 0", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <table width="600" cellPadding="0" cellSpacing="0" style={{ background: "#000", borderRadius: 16, overflow: "hidden", fontFamily: 'Segoe UI, Arial, sans-serif', color: "#fff", boxShadow: "0 4px 32px #0008" }}>
        <tbody>
          {/* Header Section */}
          <tr>
            <td colSpan={3} style={{ background: "#4CAF50", padding: 0, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "18px 32px" }}>
                <span style={{ fontSize: 28, marginRight: 16 }}>🎉</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: "#fff", letterSpacing: 1 }}>ORDER CONFIRMED!</span>
                <span style={{ marginLeft: "auto", background: "#388e3c", color: "#fff", borderRadius: 16, padding: "4px 16px", fontWeight: 600, fontSize: 14 }}>CONFIRMED</span>
              </div>
              <div style={{ background: "#222", color: "#fff", fontSize: 14, padding: "0 32px 12px 32px" }}>
                Order #{orderId} &nbsp;|&nbsp; {orderDate}
              </div>
            </td>
          </tr>

          {/* Hero Text */}
          <tr>
            <td colSpan={3} style={{ padding: "32px 32px 0 32px" }}>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Hi {customer}! <span role="img" aria-label="wave">👋</span></div>
              <div style={{ fontSize: 16, color: "#bbb", marginBottom: 18 }}>
                Your order has been <span style={{ color: "#4CAF50", fontWeight: 600 }}>confirmed</span> and is now being prepared by our expert team. Every item will undergo our strict 10-point quality inspection before dispatch.
              </div>
            </td>
          </tr>

          {/* Expected Arrival Box */}
          <tr>
            <td colSpan={3} style={{ padding: "0 32px 24px 32px" }}>
              <div style={{ background: "#ffe066", border: "2px solid #D4AF37", borderRadius: 12, padding: 18, textAlign: "center", margin: "0 auto", maxWidth: 340 }}>
                <div style={{ color: "#bfa13a", fontWeight: 700, fontSize: 15, letterSpacing: 1, marginBottom: 4 }}>EXPECTED ARRIVAL</div>
                <div style={{ color: "#000", fontWeight: 800, fontSize: 26, letterSpacing: 1 }}>{expectedDate}</div>
                <div style={{ color: "#555", fontSize: 13, marginTop: 2 }}>3-5 Business Days</div>
              </div>
            </td>
          </tr>

          {/* Luxe Promise */}
          <tr>
            <td colSpan={3} style={{ padding: "0 32px 24px 32px" }}>
              <table width="100%" style={{ background: "#101010", borderRadius: 10, margin: "0 auto" }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "center", padding: 16 }}>
                      <div style={{ fontSize: 28, color: "#D4AF37" }}>🔍</div>
                      <div style={{ fontWeight: 600, color: "#4CAF50", marginTop: 6 }}>Quality Check</div>
                      <div style={{ color: "#bbb", fontSize: 13 }}>10-point inspection by experts</div>
                    </td>
                    <td style={{ textAlign: "center", padding: 16 }}>
                      <div style={{ fontSize: 28, color: "#D4AF37" }}>📦</div>
                      <div style={{ fontWeight: 600, color: "#4CAF50", marginTop: 6 }}>Premium Packaging</div>
                      <div style={{ color: "#bbb", fontSize: 13 }}>Eco-friendly luxury boxes</div>
                    </td>
                    <td style={{ textAlign: "center", padding: 16 }}>
                      <div style={{ fontSize: 28, color: "#4CAF50" }}>🛡️</div>
                      <div style={{ fontWeight: 600, color: "#4CAF50", marginTop: 6 }}>100% Authentic</div>
                      <div style={{ color: "#bbb", fontSize: 13 }}>Guaranteed genuine products</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Order Details Table */}
          <tr>
            <td colSpan={3} style={{ padding: "0 32px 0 32px" }}>
              <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 16, margin: "18px 0 8px 0" }}>ORDER DETAILS</div>
              <table width="100%" style={{ background: "#181818", borderRadius: 10, overflow: "hidden" }}>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ width: 70, padding: 12, verticalAlign: "middle" }}>
                        <img src={item.image} alt="Product" width="56" height="56" style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #333" }} />
                      </td>
                      <td style={{ padding: 12, verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>{item.name}</div>
                        <div style={{ color: "#bbb", fontSize: 13 }}>Size: {item.size} &nbsp; | &nbsp; Color: {item.color}</div>
                      </td>
                      <td style={{ textAlign: "right", padding: 12, verticalAlign: "middle", fontWeight: 700, color: "#FFD700", fontSize: 16 }}>
                        ₹{item.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>

          {/* Amount Breakdown */}
          <tr>
            <td colSpan={3} style={{ padding: "0 32px 0 32px" }}>
              <table width="100%" style={{ color: "#fff", fontSize: 15, marginTop: 8 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#bbb" }}>Item Price</td>
                    <td style={{ textAlign: "right" }}>₹{subtotal}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#bbb" }}>Shipping Charges</td>
                    <td style={{ textAlign: "right" }}>₹{shipping}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#bbb" }}>GST (Included)</td>
                    <td style={{ textAlign: "right" }}>₹{tax}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: "#FFD700", fontSize: 17, paddingTop: 8 }}>Total Amount Paid</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#FFD700", fontSize: 18, paddingTop: 8 }}>₹{total} <span style={{ color: "#4CAF50", fontSize: 15, fontWeight: 600, marginLeft: 8 }}>✔ PAID</span></td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888", fontSize: 12, paddingTop: 2 }}>Payment Mode: {paymentDetails}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Shipping & Billing Info */}
          <tr>
            <td colSpan={3} style={{ padding: "24px 32px 0 32px" }}>
              <table width="100%" style={{ borderSpacing: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ background: "#181818", borderRadius: 10, padding: 16, color: "#fff", width: "50%", verticalAlign: "top" }}>
                      <div style={{ color: "#4CAF50", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>SHIPPING TO</div>
                      <div style={{ fontWeight: 600 }}>{customer}</div>
                      <div style={{ color: "#bbb", fontSize: 14 }}>{shippingAddress}<br />Phone: {phone}</div>
                    </td>
                    <td style={{ background: "#181818", borderRadius: 10, padding: 16, color: "#fff", width: "50%", verticalAlign: "top" }}>
                      <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>BILLING INFO</div>
                      <div style={{ fontWeight: 600 }}>{customer}</div>
                      <div style={{ color: "#bbb", fontSize: 14 }}>Email: {email}<br />Transaction ID: <span style={{ color: "#FFD700", fontWeight: 700 }}>{transactionId}</span></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Buttons */}
          <tr>
            <td colSpan={3} style={{ padding: "32px 32px 0 32px", textAlign: "center" }}>
              <a href="#" style={{ background: "#4CAF50", color: "#fff", padding: "12px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: "none", marginRight: 12, display: "inline-block" }}>TRACK YOUR ORDER</a>
              <a href="#" style={{ background: "#181818", color: "#fff", border: "2px solid #fff", padding: "12px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: "none", marginLeft: 12, display: "inline-block" }}>VIEW RECEIPT</a>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td colSpan={3} style={{ padding: "40px 32px 0 32px" }}>
              <div style={{ background: "#101010", borderRadius: 10, padding: 24, textAlign: "center", marginBottom: 18 }}>
                <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Join our 50,000+ Luxe community</div>
                <div style={{ fontSize: 22, color: "#FFD700", marginBottom: 8 }}>★★★★★</div>
                <a href="#" style={{ background: "linear-gradient(90deg,#fd5,#f36,#f0f,#4f5dff)", color: "#fff", padding: "10px 28px", borderRadius: 24, fontWeight: 700, fontSize: 16, textDecoration: "none", display: "inline-block", marginBottom: 8 }}>Follow us on Instagram</a>
                <div style={{ marginTop: 16 }}>
                  <a href="#" style={{ background: "#25D366", color: "#fff", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", marginRight: 10, display: "inline-block" }}>WhatsApp Us</a>
                  <a href="#" style={{ background: "#222", color: "#fff", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1px solid #fff", display: "inline-block" }}>Email Support</a>
                </div>
              </div>
              <div style={{ color: "#bbb", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
                © 2026 eShopper Luxe. All rights reserved.<br />Shop 3, Sahid Marg, Near Power, Lucknow – 226001, UP, India<br />GSTIN: 09XXXX1234X1ZS | CIN: U51909UP2020PTC123456
              </div>
              <div style={{ color: "#888", fontSize: 12, textAlign: "center" }}>
                <a href="#" style={{ color: "#FFD700", textDecoration: "underline", marginRight: 12 }}>Privacy</a>
                <a href="#" style={{ color: "#FFD700", textDecoration: "underline", marginRight: 12 }}>Terms</a>
                <a href="#" style={{ color: "#FFD700", textDecoration: "underline" }}>Unsubscribe</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
>>>>>>> parent of 9973d6f (Fixed railway workflow build error)
    </div>
  );
};

export default ConfirmationPremium;
