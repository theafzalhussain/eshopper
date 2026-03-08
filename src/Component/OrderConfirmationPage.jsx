import React from "react";

const OrderConfirmationPage = ({
  order = {},
  user = {},
  onTrackOrder = () => {},
  onViewReceipt = () => {},
}) => {
  // Demo data fallback
  const {
    items = [
      {
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
              <button onClick={onTrackOrder} style={{ background: "#4CAF50", color: "#fff", padding: "12px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16, border: "none", marginRight: 12, cursor: "pointer" }}>TRACK YOUR ORDER</button>
              <button onClick={onViewReceipt} style={{ background: "#181818", color: "#fff", border: "2px solid #fff", padding: "12px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16, marginLeft: 12, cursor: "pointer" }}>VIEW RECEIPT</button>
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
    </div>
  );
};

export default OrderConfirmationPage;
