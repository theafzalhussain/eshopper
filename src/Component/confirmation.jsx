import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { CheckCircle2, ShoppingBag, User, MessageCircle, Truck, MapPin, Calendar, FileDown } from 'lucide-react';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, FRONTEND_URL } from '../constants';

const Confirmation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
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
    const syncOrder = async () => {
      const locationState = window.history.state?.usr;
      let fallbackOrder = null;

      if (locationState?.order) {
        fallbackOrder = locationState.order;
      } else {
        const storedOrder = localStorage.getItem('lastPlacedOrder');
        if (storedOrder) {
          try {
            fallbackOrder = JSON.parse(storedOrder);
          } catch (e) {
            console.error('Failed to parse stored order:', e);
          }
        }
      }

      if (fallbackOrder) {
        setOrder(fallbackOrder);
      }

      const orderId = fallbackOrder?.orderId;
      const currentUserId = localStorage.getItem('userid');

      try {
        if (orderId && currentUserId) {
          const { data } = await axios.get(`${BASE_URL}/api/order/${encodeURIComponent(orderId)}?userId=${encodeURIComponent(currentUserId)}`, { timeout: 15000 });
          if (data?.orderId) {
            setOrder(data);
            localStorage.setItem('lastPlacedOrder', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error('Failed to sync order from backend:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    syncOrder();
  }, []);

  // Fire success animation on mount
  useEffect(() => {
    if (order) {
      console.log('✅ Order confirmation received');
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

  const safeNum = (value) => Number(value || 0);
  const money = (value) => `₹${safeNum(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Dynamic invoice label based on order status
  const getDocumentLabel = (status) => {
    if (!status) return 'Download Receipt';
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
    if (normalizedStatus === 'delivered') return 'Download Tax Invoice';
    if (normalizedStatus === 'confirmed') return 'Download Proforma Invoice';
    return 'Download Receipt';
  };

  // Download invoice with loading state
  const downloadOrderDocument = async () => {
    if (!order?.orderId || !userId) {
      alert('Order information missing. Please try again.');
      return;
    }

    setDownloadingInvoice(true);
    try {
      const response = await axios({
        method: 'GET',
        url: `${BASE_URL}/api/orders/${order.orderId}/download-invoice?userId=${userId}`,
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'invoice.pdf';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download invoice error:', error);
      alert(error.response?.data?.message || 'Failed to download invoice. Please try again later.');
    } finally {
      setDownloadingInvoice(false);
    }
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
    <>
      {/* Premium Order Summary Section - Redesigned */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbe6 0%, #f9f7f4 100%)',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(212,175,55,0.10)',
        border: '1.5px solid #f3e9c7',
        padding: '36px 36px 28px 36px',
        marginBottom: '36px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr',
        gap: '32px',
        alignItems: 'center',
      }}>
          {/* Amount Box - Premium, Full, Detailed */}
          <div style={{
            background: 'linear-gradient(135deg, #fff 60%, #f7e9c7 100%)',
            borderRadius: '14px',
            boxShadow: '0 2px 12px rgba(212,175,55,0.08)',
            border: '1.5px solid #f3e9c7',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: '140px',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: '#bfa13a', fontSize: '13px', letterSpacing: '1.2px' }}>AMOUNT</span>
              <span style={{ background: '#d4af37', color: 'white', fontWeight: 700, fontSize: '11px', borderRadius: '8px', padding: '2px 10px', marginLeft: '8px', letterSpacing: '1px' }}>PAID</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#bfa13a', letterSpacing: '-1px', marginBottom: '2px' }}>
              ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Order Type:</span>
              <span style={{ fontSize: '13px', color: '#222', fontWeight: 700 }}>{order.orderType || 'Standard'}</span>
              <span style={{ fontSize: '13px', color: '#bfa13a', fontWeight: 700, marginLeft: '8px' }}>{order.status || 'Confirmed'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
              Order ID: <span style={{ color: '#bfa13a', fontWeight: 700 }}>{order.orderId}</span>
            </div>
          </div>
          {/* Payment Method - Premium Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f7fafc 60%, #e6f7ff 100%)',
            borderRadius: '14px',
            boxShadow: '0 2px 12px rgba(16,185,129,0.08)',
            border: '1.5px solid #e0f2fe',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: '140px',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: '#089981', fontSize: '13px', letterSpacing: '1.2px' }}>PAYMENT METHOD</span>
              <span style={{ background: '#10b981', color: 'white', fontWeight: 700, fontSize: '11px', borderRadius: '8px', padding: '2px 10px', marginLeft: '8px', letterSpacing: '1px' }}>SECURE</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#089981', letterSpacing: '-1px', marginBottom: '2px' }}>
              {order.paymentMethod || 'Card'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Txn ID:</span>
              <span style={{ fontSize: '13px', color: '#222', fontWeight: 700 }}>{order.transactionId || 'N/A'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
              Status: <span style={{ color: '#10b981', fontWeight: 700 }}>{order.paymentStatus || 'Success'}</span>
            </div>
          </div>
          {/* Delivery - Premium Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fff4 60%, #e6fffa 100%)',
            borderRadius: '14px',
            boxShadow: '0 2px 12px rgba(16,185,129,0.08)',
            border: '1.5px solid #e0f2fe',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: '140px',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: '#089981', fontSize: '13px', letterSpacing: '1.2px' }}>EXPECTED DELIVERY</span>
              <span style={{ background: '#10b981', color: 'white', fontWeight: 700, fontSize: '11px', borderRadius: '8px', padding: '2px 10px', marginLeft: '8px', letterSpacing: '1px' }}>⚡ TODAY</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#089981', letterSpacing: '-1px', marginBottom: '2px' }}>
              {estimatedArrival.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
              Fastest Delivery Available
            </div>
          </div>
        </div>

        {/* Shipping Address Card - Full Width Premium */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            marginBottom: '40px',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: '0', right: '0', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '0 0 auto' }}>
              <MapPin size={36} style={{ color: '#d4af37' }} />
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px', color: '#d4af37', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Shipping To</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 10px 0' }}>
                {order.shippingAddress?.fullName}
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', margin: '0', lineHeight: '1.6' }}>
                {order.shippingAddress?.addressline1 || order.shippingAddress?.address || '-'}
                <br />
                {order.shippingAddress?.city || '-'}, {order.shippingAddress?.state || '-'} {order.shippingAddress?.pin || order.shippingAddress?.zipCode || '-'}
              </p>
            </div>
            <div style={{ flex: '0 0 auto', backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <p style={{ fontSize: '11px', color: '#d4af37', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: '600' }}>Payment</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: '0' }}>
                {order.paymentMethod || 'Card'}
              </p>
            </div>
          </div>
        </div>

        {/* Premium Products Section */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid #d4af37' }}>
            <ShoppingBag size={28} style={{ color: '#d4af37', marginRight: '12px' }} />
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
              Your Selection
            </h2>
            <span style={{ marginLeft: 'auto', backgroundColor: '#d4af37', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
              {order.products?.length || 0} {order.products?.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '25px',
            }}
          >
            {order.products?.map((product, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #f0f0f0',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(212, 175, 55, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                }}
              >
                {/* Premium Quality Badge */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2, background: 'linear-gradient(135deg, #d4af37 0%, #c9a961 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', boxShadow: '0 2px 10px rgba(212, 175, 55, 0.4)' }}>
                  Hand-inspected for quality
                </div>
                
                {/* Product Image */}
                <div style={{ position: 'relative', width: '100%', height: '280px', backgroundColor: '#f9f9f9', overflow: 'hidden' }}>
                  {product.pic ? (
                    <img
                      src={product.pic}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);">
                            <div style="text-align: center; color: #999;">
                              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              <p style="margin: 10px 0 0 0; font-size: 12px;">Image Unavailable</p>
                            </div>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)' }}>
                      <div style={{ textAlign: 'center', color: '#999' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>Product Image</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Product Details */}
                <div style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c2c2c', margin: '0 0 12px 0', minHeight: '44px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.name}
                  </h4>
                  
                  {/* Product Meta Info */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {product.size && (
                      <span style={{ backgroundColor: '#f5f5f5', color: '#666', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', border: '1px solid #e0e0e0' }}>
                        Size: {product.size}
                      </span>
                    )}
                    {product.color && (
                      <span style={{ backgroundColor: '#f5f5f5', color: '#666', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', border: '1px solid #e0e0e0' }}>
                        {product.color}
                      </span>
                    )}
                  </div>
                  
                  {/* Price & Quantity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</p>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                        {product.qty}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                        ₹{(product.total || product.qty * product.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary with Enhanced Left Section */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
            {/* Left Section - Order Benefits & Features */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c2c2c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>✨</span> Your Benefits
              </h3>
              
              {/* Benefit Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Free Shipping */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #10b98115 0%, #10b98125 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>🚚</span>
                  <div>
                    <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>Free Shipping</p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>No extra charges</p>
                  </div>
                </div>

                {/* Secure Packaging */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b25 100%)',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>📦</span>
                  <div>
                    <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>Premium Packaging</p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>Hand-wrapped with care</p>
                  </div>
                </div>

                {/* Quality Guarantee */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #8b5cf615 0%, #8b5cf625 100%)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6' }}>Quality Checked</p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>100% authentic products</p>
                  </div>
                </div>

                {/* Easy Returns */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #ef444415 0%, #ef444425 100%)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>🔄</span>
                  <div>
                    <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold', color: '#ef4444' }}>Easy Returns</p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>7-day return policy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Price Breakdown */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c2c2c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>💰</span> Order Summary
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#999', margin: '0' }}>Subtotal</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                    ₹{(order.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#999', margin: '0' }}>Shipping</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: order.shippingAmount > 0 ? '#2c2c2c' : '#10b981', margin: '0' }}>
                    {order.shippingAmount > 0 ? `₹${(order.shippingAmount || 0).toFixed(2)}` : 'FREE'}
                  </p>
                </div>
                
                <div style={{ 
                  borderTop: '2px solid #e0e0e0', 
                  paddingTop: '15px',
                  background: 'linear-gradient(135deg, #d4af3715, #d4af3725)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '15px', color: '#666', margin: '0', fontWeight: '600' }}>Total Amount</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                      ₹{(order.finalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0', textAlign: 'right' }}>
                    Payment: {order.paymentMethod || 'COD'}
                  </p>
                </div>
              </div>
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
            onClick={downloadOrderDocument}
            disabled={downloadingInvoice}
            style={{
              background: downloadingInvoice
                ? 'linear-gradient(135deg, #999 0%, #666 100%)'
                : 'linear-gradient(135deg, #d4af37 0%, #c9a961 100%)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: downloadingInvoice ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              boxShadow: downloadingInvoice ? 'none' : '0 4px 15px rgba(212, 175, 55, 0.3)',
              opacity: downloadingInvoice ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!downloadingInvoice) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingInvoice) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
              }
            }}
          >
            <FileDown size={20} />
            {downloadingInvoice ? 'Preparing PDF...' : getDocumentLabel(order?.status)}
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
            Questions? Contact us at <strong>support@eshopperr.me</strong> or call our customer service team
          </p>
        </div>
      </div>
    </>
  );
};

export default Confirmation;
