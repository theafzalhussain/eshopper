import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { CheckCircle2, ShoppingBag, User, MessageCircle, Truck, MapPin, Calendar } from 'lucide-react';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, FRONTEND_URL } from '../constants';

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

        {/* Premium Info Cards - Equal Size & Responsive */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          {/* Order ID Card - Premium Purple Theme */}
          <div
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>ORDER ID</p>
              <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                {order.orderId?.split('-').pop() || '0000'}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: '0', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                {order.orderId}
              </p>
            </div>
          </div>

          {/* Estimated Arrival Card - Premium Green Theme */}
          <div
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Est. Arrival</p>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                {estimatedArrival.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: '0', fontWeight: '600' }}>
                Free Premium Delivery
              </p>
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
