import React from "react";

// Responsive, modern luxury confirmation page (Luxe-Gold Edition)
// Color palette: #0D0D0D (charcoal), #D4AF37 (gold), #fff (white)
// All product images, order details, and user info are shown

const ConfirmationPremium = ({
  order = {},
  user = {},
  onViewOrder = () => {},
}) => {
  // Fallbacks for demo
  const {
    items = [
      {
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
    </div>
  );
};

export default ConfirmationPremium;
