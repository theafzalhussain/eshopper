import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { CheckCircle2, ShoppingBag, Download, User, MessageCircle, Truck, MapPin, Calendar } from 'lucide-react';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS } from '../constants';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://eshopper-boutique-backend.up.railway.app';

const Confirmation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const users = useSelector((state) => state.UserStateData || []);

  const localUserId = localStorage.getItem('userid');
  const userId =
    order?.userid ||
    localUserId ||
    users.find((item) => String(item.id || item.userid || item._id) === String(localUserId))?.userid ||
    users[0]?.userid ||
    '';

  // Retrieve order from state or localStorage
  useEffect(() => {
    const locationState = window.history.state?.usr;
    
    if (locationState?.order) {
      setOrder(locationState.order);
    } else {
      const storedOrder = localStorage.getItem('lastPlacedOrder');
      if (storedOrder) {
        try {
          setOrder(JSON.parse(storedOrder));
        } catch (e) {
          console.error('Failed to parse stored order:', e);
        }
      }
    }
    setLoading(false);
  }, []);

  // Fire confetti animation on mount
  useEffect(() => {
    if (order) {
      // Left to right confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors: ['#d4af37', '#ffd700', '#ffed4e', '#ffd700', '#c9a961'],
        duration: 2200,
      });

      // Right to left confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors: ['#d4af37', '#ffd700', '#ffed4e', '#ffd700', '#c9a961'],
        duration: 2200,
      });
    }
  }, [order]);

  // Clear cart from Redux and backend
  useEffect(() => {
    if (order && userId) {
      // Clear from Redux
      dispatch(clearCart({ userid: userId }));
      
      // Clear from backend - optional for safety
      axios
        .post(`${BASE_URL}${API_ENDPOINTS.CLEAR_CART}/${userId}`)
        .catch((err) => console.log('Cart already cleared or error:', err));
    }
  }, [order, userId, dispatch]);

  // Generate PDF invoice
  const downloadInvoice = () => {
    if (!order) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with golden theme
    doc.setFontSize(24);
    doc.setTextColor(212, 175, 55); // Golden
    doc.text('eShopper Boutique', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Invoice', 20, 35);
    doc.text(`Order ID: ${order.orderId}`, 20, 42);
    doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, 20, 49);

    // Shipping Address
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text('Shipping Address:', 20, 62);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const address = order.shippingAddress;
    doc.text(`${address.fullName}`, 20, 70);
    doc.text(`${address.address}, ${address.city}, ${address.state} ${address.zipCode}`, 20, 77);
    doc.text(`Phone: ${address.phone}`, 20, 84);

    // Products Table
    const tableData = order.products.map((product) => [
      product.name || 'Product',
      product.qty || 1,
      `₹${(product.price || 0).toFixed(2)}`,
      `₹${(product.qty * product.price || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Product', 'Quantity', 'Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [80, 80, 80],
      },
      margin: 20,
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    // Totals Section
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Subtotal: ₹${(order.totalAmount || 0).toFixed(2)}`, pageWidth - 70, finalY);
    doc.text(`Shipping: ₹${(order.shippingAmount || 0).toFixed(2)}`, pageWidth - 70, finalY + 7);
    
    doc.setFontSize(13);
    doc.setTextColor(212, 175, 55);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ₹${(order.finalAmount || 0).toFixed(2)}`, pageWidth - 70, finalY + 16);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Thank you for shopping with eShopper Boutique. For any queries, contact support@eshopperboutique.com',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save PDF
    doc.save(`invoice-${order.orderId}.pdf`);
  };

  if (loading || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#d4af37', marginBottom: '10px' }}>✓</div>
          <p style={{ color: '#666', fontSize: '18px' }}>Loading your order...</p>
        </div>
      </div>
    );
  }

  const estimatedArrival = new Date(order.estimatedArrival || new Date().setDate(new Date().getDate() + 7));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f7f4', paddingTop: '80px', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Hero Section */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '60px',
            padding: '40px',
            background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
            borderRadius: '12px',
            color: 'white',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={80} style={{ margin: '0 auto', color: '#d4af37' }} />
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px', color: '#d4af37' }}>
            Order Confirmed!
          </h1>
          <p style={{ fontSize: '16px', color: '#ccc', marginBottom: '5px' }}>
            Thank you for your purchase from eShopper Boutique
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            A confirmation email has been sent to your registered email address
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          
          {/* Order ID & ETA Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <ShoppingBag size={32} style={{ color: '#d4af37', marginRight: '12px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>ORDER ID</p>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {order.orderId}
                </h3>
              </div>
            </div>
            <div style={{ paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0' }}>PAYMENT METHOD</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                {order.paymentMethod || 'Card'}
              </p>
            </div>
          </div>

          {/* ETA Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <Truck size={32} style={{ color: '#d4af37', marginRight: '12px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>ESTIMATED DELIVERY</p>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {estimatedArrival.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </h3>
              </div>
            </div>
            <div style={{ paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0' }}>STATUS</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#27ae60', margin: '0' }}>
                Confirmed & Processing
              </p>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px' }}>
              <MapPin size={32} style={{ color: '#d4af37', marginRight: '12px', marginTop: '3px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px 0' }}>SHIPPING TO</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {order.shippingAddress?.fullName}
                </p>
                <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                  {order.shippingAddress?.address}
                </p>
                <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c2c2c', marginBottom: '20px' }}>
            Order Items
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {order.products?.map((product, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0',
                }}
              >
                {product.pic && (
                  <img
                    src={product.pic}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      backgroundColor: '#f5f5f5',
                    }}
                  />
                )}
                <div style={{ padding: '15px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0 0 8px 0', minHeight: '40px' }}>
                    {product.name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                      Qty: <span style={{ fontWeight: 'bold' }}>{product.qty}</span>
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                      ₹{(product.total || product.qty * product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginBottom: '40px',
            border: '1px solid #e0e0e0',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '500px', marginLeft: 'auto' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Subtotal</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                ₹{(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Shipping</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                ₹{(order.shippingAmount || 0).toFixed(2)}
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e0e0e0', paddingTop: '15px' }}>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Total Amount</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                ₹{(order.finalAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
          }}
        >
          <button
            onClick={downloadInvoice}
            style={{
              backgroundColor: '#d4af37',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#c9a961')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#d4af37')}
          >
            <Download size={20} />
            Download Invoice
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#2c2c2c',
              color: '#d4af37',
              padding: '15px 30px',
              borderRadius: '8px',
              border: '2px solid #d4af37',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#d4af37';
              e.target.style.color = '#2c2c2c';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2c2c2c';
              e.target.style.color = '#d4af37';
            }}
          >
            <ShoppingBag size={20} />
            Continue Shopping
          </button>

          <button
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#f5f5f5',
              color: '#2c2c2c',
              padding: '15px 30px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
            }}
          >
            <User size={20} />
            Track in Profile
          </button>

          <button
            onClick={() => navigate('/?openChat=1')}
            style={{
              backgroundColor: '#d4af37',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#c9a961')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#d4af37')}
          >
            <MessageCircle size={20} />
            Ask AI Stylist
          </button>
        </div>

        {/* Footer Note */}
        <div
          style={{
            backgroundColor: '#f9f7f4',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e0e0e0',
          }}
        >
          <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
            Questions? Contact us at <strong>support@eshopperboutique.com</strong> or call our customer service team
          </p>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
