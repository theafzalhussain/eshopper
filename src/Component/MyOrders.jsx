import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { io } from 'socket.io-client'
import { BASE_URL } from '../constants'
import { Clock3, MessageCircle, PackageSearch } from 'lucide-react'

const FILTERS = ['All', 'In Transit', 'Delivered']

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase()
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
  if (raw === 'packed') return 'Packed'
  if (raw === 'shipped') return 'Shipped'
  if (raw === 'out for delivery') return 'Out for Delivery'
  if (raw === 'delivered') return 'Delivered'
  return 'Ordered'
}

const getStatusStyles = (status) => {
  const s = normalizeStatus(status)
  if (s === 'Ordered') return { bg: '#e0f2fe', color: '#0ea5e9' }
  if (s === 'Packed') return { bg: '#fef3c7', color: '#f59e0b' }
  if (s === 'Shipped') return { bg: '#fef9c3', color: '#ca8a04' }
  if (s === 'Out for Delivery') return { bg: '#fefce8', color: '#a89646' }
  return { bg: '#dcfce7', color: '#16a34a' }
}

export default function MyOrders() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('userid')
  const socketRef = useRef(null)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchOrderId, setSearchOrderId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)

  const openWhatsAppSupport = (orderId) => {
    const message = `Hi Luxe Support, I need assistance with my Order: ${orderId}`
    window.open(`https://wa.me/918447859784?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) {
        return (
          <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f6ef 0%, #f6e7c5 100%)', padding: '100px 16px 40px' }}>
            <div className="container" style={{ maxWidth: 980 }}>
              {/* Header with gold accent */}
              <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                <div>
                  <h2 className="font-weight-bold mb-1" style={{ color: '#a88344', letterSpacing: '0.5px', textShadow: '0 2px 8px #f6e7c5' }}>My Orders</h2>
                  <p className="text-muted mb-0" style={{ fontWeight: 500 }}>Track all your recent and past orders in one place</p>
                </div>
                <div className="d-flex align-items-center mt-2 mt-md-0" style={{ gap: '12px' }}>
                  <span
                    className="px-3 py-2 rounded-pill"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#fff',
                      background: socketConnected ? 'linear-gradient(90deg, #d4af37 60%, #10b981 100%)' : '#ef4444',
                      boxShadow: socketConnected ? '0 4px 16px #d4af3760' : 'none',
                      border: socketConnected ? '1.5px solid #d4af37' : '1.5px solid #ef4444',
                      letterSpacing: '0.2px',
                      textShadow: socketConnected ? '0 1px 4px #fff7e0' : 'none'
                    }}
                  >
                    {socketConnected ? '🟢 Luxe Live' : '🔴 Connecting...'}
                  </span>
                  <button className="btn rounded-pill px-4" style={{
                    background: 'linear-gradient(90deg, #fffbe6 0%, #f6e7c5 100%)',
                    color: '#a88344',
                    fontWeight: 700,
                    border: '1.5px solid #d4af37',
                    boxShadow: '0 2px 8px #d4af3720',
                    letterSpacing: '0.2px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} onClick={() => navigate('/profile')}>
                    ← Back to Profile
                  </button>
                </div>
              </div>

              {/* 🌟 PREMIUM FILTER BUTTONS - Gold accent, tactile */}
              <div className="d-flex flex-wrap mb-4" style={{ gap: '10px' }}>
                {FILTERS.map((item) => (
                  <motion.button
                    key={item}
                    whileHover={{ scale: 1.08, boxShadow: '0 6px 24px #d4af3730' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveFilter(item)}
                    className="btn rounded-pill"
                    style={{
                      background: activeFilter === item 
                        ? 'linear-gradient(135deg, #d4af37 60%, #fffbe6 100%)' 
                        : 'linear-gradient(135deg, #fff, #f9f9f9)',
                      color: activeFilter === item ? '#fff' : '#a88344',
                      border: activeFilter === item ? '2px solid #d4af37' : '1.5px solid #e0c98d',
                      minWidth: 120,
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      padding: '10px 22px',
                      boxShadow: activeFilter === item 
                        ? '0 8px 24px #d4af3730' 
                        : '0 2px 8px #d4af3710',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      textShadow: activeFilter === item ? '0 1px 4px #fff7e0' : 'none'
                    }}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>

              {/* 💎 PREMIUM SEARCH BOX - Glassy, gold border */}
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ 
                  background: 'linear-gradient(135deg, #fffbe6 0%, #f6e7c5 100%)',
                  border: '2px solid #d4af37',
                  borderRadius: '18px',
                  padding: '22px 28px',
                  boxShadow: '0 8px 32px #d4af3720',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="row align-items-center">
                  <div className="col-12 col-md-8 mb-3 mb-md-0">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#d4af37', fontSize: 18 }}>🔍</span>
                      <input
                        type="text"
                        value={searchOrderId}
                        onChange={(e) => setSearchOrderId(e.target.value)}
                        className="form-control"
                        placeholder="Search by Order ID..."
                        style={{ 
                          borderRadius: '14px', 
                          padding: '13px 13px 13px 44px',
                          border: '2px solid #e0c98d',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'rgba(255,255,255,0.85)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 12px #d4af3710',
                          color: '#a88344',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#d4af37'
                          e.target.style.boxShadow = '0 4px 16px #d4af3720'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e0c98d'
                          e.target.style.boxShadow = '0 2px 12px #d4af3710'
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-md-4 d-flex gap-2">
                    {(searchOrderId || fromDate || toDate) && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => {
                          setSearchOrderId('')
                          setFromDate('')
                          setToDate('')
                        }}
                        className="btn btn-outline-secondary flex-grow-1"
                        style={{ fontSize: '14px', fontWeight: 700, color: '#a88344', border: '1.5px solid #d4af37', background: '#fffbe6' }}
                      >
                        ✕ Clear
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowAdvancedFilters((prev) => !prev)}
                      className="btn rounded-pill flex-grow-1"
                      style={{ 
                        fontSize: '14px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #d4af37 60%, #a88344 100%)',
                        color: '#fff',
                        border: '2px solid #d4af37',
                        boxShadow: '0 4px 16px #d4af3720',
                        letterSpacing: '0.2px',
                        textShadow: '0 1px 4px #fff7e0'
                      }}
                      title="Show/Hide Advanced Filters"
                    >
                      {showAdvancedFilters ? '⬆ Hide' : '⚙️ Filters'}
                    </motion.button>
                  </div>
                </div>
                {/* Advanced Date Filters - Show only if needed */}
                {showAdvancedFilters && (
                  <motion.div 
                    className="row mt-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="small font-weight-bold mb-2" style={{ display: 'block', color: '#a88344' }}>📅 From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="form-control"
                        style={{ borderRadius: '12px', border: '2px solid #e0c98d', fontWeight: 600, color: '#a88344', background: '#fffbe6' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="small font-weight-bold mb-2" style={{ display: 'block', color: '#a88344' }}>📅 To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="form-control"
                        style={{ borderRadius: '12px', border: '2px solid #e0c98d', fontWeight: 600, color: '#a88344', background: '#fffbe6' }}
                      />
                    </div>
                    <div className="col-12 mt-4 d-flex justify-content-end">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => {
                          setFromDate('')
                          setToDate('')
                        }}
                        className="btn btn-sm rounded-pill"
                        style={{
                          background: 'linear-gradient(135deg, #fffbe6, #f6e7c5)',
                          color: '#a88344',
                          fontWeight: 700,
                          border: '2px solid #d4af37',
                          boxShadow: '0 2px 8px #d4af3710'
                        }}
                      >
                        ✕ Clear Dates
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Order List - Premium Card Design */}
              {loading ? (
                <div className="p-4 text-center bg-white rounded-xl shadow-sm text-muted" style={{ border: '2px solid #d4af37', background: '#fffbe6' }}>Loading orders...</div>
              ) : error ? (
                <div className="p-4 text-center bg-white rounded-xl shadow-sm text-danger" style={{ border: '2px solid #d4af37', background: '#fffbe6' }}>{error}</div>
              ) : filteredOrders.length ? (
                filteredOrders.map((item, idx) => {
                  const badge = getStatusStyles(item.orderStatus)
                  const label = normalizeStatus(item.orderStatus)
                  return (
                    <motion.div
                      key={item.orderId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.4 }}
                      whileHover={{ y: -8, boxShadow: '0 32px 80px #d4af3730' }}
                      className="mb-4"
                      style={{ 
                        background: 'linear-gradient(135deg, #fffbe6 0%, #f6e7c5 100%)',
                        border: '2.5px solid #d4af37',
                        borderRadius: '22px',
                        padding: '30px',
                        boxShadow: '0 16px 48px #d4af3720, inset 0 1px 0 #fff7e0',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(12px)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Header Row - Luxe Layout */}
                      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '2px solid #f6e7c5' }}>
                        <div className="flex-grow-1">
                          <div className="font-weight-bold" style={{ fontSize: '20px', color: '#a88344', letterSpacing: '0.3px', textShadow: '0 1px 4px #fff7e0' }}>
                            <span style={{ marginRight: 8 }}>🛒</span>{item.orderId}
                          </div>
                          <div className="small mt-2 d-flex align-items-center" style={{ color: '#a88344', fontWeight: 600 }}>
                            <Clock3 size={15} className="mr-2" /> 
                            {new Date(item.updatedAt).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="px-3 py-2 rounded-pill"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              fontWeight: 700,
                              fontSize: '14px',
                              letterSpacing: '0.3px',
                              border: `2px solid ${badge.color}`,
                              boxShadow: '0 2px 8px #d4af3710',
                              textShadow: '0 1px 4px #fff7e0'
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      </div>

                      {/* Order Details Row - Luxe Info */}
                      <div className="row align-items-center mb-3">
                        <div className="col-12 col-md-8 mb-2 mb-md-0">
                          <div className="d-flex flex-wrap align-items-center gap-3">
                            <span className="font-weight-bold" style={{ color: '#a88344', fontSize: '16px', textShadow: '0 1px 4px #fff7e0' }}>₹{item.totalAmount}</span>
                            <span className="text-muted small" style={{ color: '#a88344', fontWeight: 600 }}>{item.products?.length || 0} items</span>
                            <span className="text-muted small" style={{ color: '#a88344', fontWeight: 600 }}>{item.paymentMethod}</span>
                          </div>
                        </div>
                        <div className="col-12 col-md-4 text-md-right">
                          <span className="text-muted small" style={{ color: '#a88344', fontWeight: 600 }}>{item.shippingAddress?.address}</span>
                        </div>
                      </div>

                      {/* Premium Action Buttons - Luxe Animations */}
                      <div className="d-flex gap-3 flex-wrap align-items-center" style={{ rowGap: '10px' }}>
                        {/* Track Order Button */}
                        <motion.button
                          whileHover={{ 
                            scale: 1.06,
                            boxShadow: '0 24px 48px #d4af3730',
                            y: -4
                          }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                          className="btn btn-sm rounded-pill"
                          style={{
                            flex: '1 1 auto',
                            minWidth: '160px',
                            background: 'linear-gradient(135deg, #d4af37 60%, #a88344 100%)',
                            color: '#fff',
                            border: '2px solid #d4af37',
                            fontWeight: 700,
                            fontSize: '14px',
                            letterSpacing: '0.3px',
                            padding: '13px 20px',
                            boxShadow: '0 8px 24px #d4af3720',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            textShadow: '0 1px 4px #fff7e0'
                          }}
                        >
                          <span style={{ position: 'relative', zIndex: 2 }}>
                            <span style={{ marginRight: 6 }}>🔎</span>Track Order
                          </span>
                        </motion.button>
                        {/* Chat Support Button */}
                        <motion.button
                          whileHover={{ 
                            scale: 1.06,
                            boxShadow: '0 24px 48px #25D36640',
                            y: -4
                          }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => openWhatsAppSupport(item.orderId)}
                          className="btn btn-sm rounded-pill"
                          style={{
                            flex: '1 1 auto',
                            minWidth: '150px',
                            background: 'linear-gradient(135deg, #25D366 60%, #a88344 100%)',
                            color: '#fff',
                            border: '2px solid #25D366',
                            fontWeight: 700,
                            fontSize: '14px',
                            padding: '13px 20px',
                            letterSpacing: '0.3px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 8px 24px #25D36620',
                            position: 'relative',
                            overflow: 'hidden',
                            textShadow: '0 1px 4px #fff7e0'
                          }}
                          title="Chat with Luxe Support"
                        >
                          <span style={{ position: 'relative', zIndex: 2 }}>
                            <span style={{ marginRight: 6 }}>💬</span>Chat Support
                          </span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="p-5 text-center bg-white rounded-xl shadow-sm" style={{ border: '2px solid #d4af37', background: '#fffbe6' }}>
                  <PackageSearch size={40} className="text-muted opacity-50" />
                  <p className="mt-3 mb-0 text-muted">No orders found for selected filters.</p>
                </div>
              )}
            </div>
          </div>
        )
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <motion.span 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-4 py-2 rounded-pill font-weight-bold" 
                    style={{ 
                      background: badge.bg, 
                      color: badge.color,
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      boxShadow: `0 4px 12px ${badge.color}25`
                    }}
                  >
                    {label}
                  </motion.span>
                </div>

                {/* Details Grid - Enhanced Layout */}
                <div className="row mb-4" style={{ gap: 0 }}>
                  <div className="col-md-6 mb-3 mb-md-0">
                    <div className="small" style={{ color: '#999', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Amount</div>
                    <div className="font-weight-bold mt-2" style={{ fontSize: '22px', color: '#8b6c2f', letterSpacing: '-0.5px' }}>
                      ₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="col-md-6" style={{ borderLeft: '1.5px solid #f0f0f0', paddingLeft: '20px' }}>
                    <div className="small" style={{ color: '#999', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Payment Method</div>
                    <div className="font-weight-bold mt-2" style={{ fontSize: '16px', color: '#333', letterSpacing: '0.2px' }}>
                      {item.paymentMethod || 'Cash on Delivery'}
                    </div>
                  </div>
                </div>

                {(Array.isArray(item.orderItems) && item.orderItems.length > 0) || (Array.isArray(item.products) && item.products.length > 0) ? (
                  <div
                    className="d-flex align-items-center mb-4"
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  >
                    {(() => {
                      const firstItem = (item.orderItems && item.orderItems[0]) || (item.products && item.products[0]) || {}
                      const image = firstItem.image || firstItem.pic || firstItem.pic1 || ''
                      const title = firstItem.title || firstItem.name || 'Ordered Item'
                      const price = Number(firstItem.price || firstItem.finalprice || 0)
                      return (
                        <>
                          <div
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                              marginRight: '12px',
                              background: '#fff'
                            }}
                          >
                            {image ? (
                              <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div className="d-flex align-items-center justify-content-center h-100" style={{ color: '#64748b', fontSize: '11px', fontWeight: 700 }}>
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <p className="font-weight-bold small mb-1" style={{ color: '#111' }}>{title}</p>
                            <p className="small text-muted mb-0">₹{price.toLocaleString('en-IN')}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : null}

                {/* Premium Action Buttons - Enhanced Animations */}
                <div className="d-flex gap-3 flex-wrap align-items-center" style={{ rowGap: '10px' }}>
                  {/* Track Order Button */}
                  <motion.button
                    whileHover={{ 
                      scale: 1.03,
                      boxShadow: '0 20px 40px rgba(15,15,16,0.3)',
                      y: -3
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                    className="btn btn-sm rounded-pill"
                    style={{
                      flex: '1 1 auto',
                      minWidth: '150px',
                      background: 'linear-gradient(135deg, #0f0f10, #1a1f26)',
                      color: '#fff',
                      border: '1.5px solid #353b44',
                      fontWeight: '700',
                      fontSize: '13px',
                      letterSpacing: '0.3px',
                      padding: '11px 18px',
                      boxShadow: '0 8px 20px rgba(15,15,16,0.25)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{ position: 'relative', zIndex: 2 }}>
                      🔎 Track Order
                    </span>
                  </motion.button>
                  
                  {/* Chat Support Button */}
                  <motion.button
                    whileHover={{ 
                      scale: 1.03,
                      boxShadow: '0 20px 40px rgba(37,211,102,0.3)',
                      y: -3
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openWhatsAppSupport(item.orderId)}
                    className="btn btn-sm rounded-pill"
                    style={{
                      flex: '1 1 auto',
                      minWidth: '140px',
                      background: 'linear-gradient(135deg, #25D366, #1aa84f)',
                      color: '#fff',
                      border: '1.5px solid #1ea952',
                      fontWeight: '700',
                      fontSize: '13px',
                      padding: '11px 18px',
                      letterSpacing: '0.3px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 8px 18px rgba(37,211,102,0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    title="Chat with Luxe Support"
                  >
                    <span style={{ position: 'relative', zIndex: 2 }}>
                      💬 Chat Support
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )
          })
        ) : (
          <div className="p-5 text-center bg-white rounded-xl shadow-sm">
            <PackageSearch size={40} className="text-muted opacity-50" />
            <p className="mt-3 mb-0 text-muted">No orders found for selected filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
