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
  const [downloadingOrderId, setDownloadingOrderId] = useState('')

  const openWhatsAppSupport = (orderId) => {
    const message = `Hi Luxe Support, I need assistance with my Order: ${orderId}`
    window.open(`https://wa.me/918447859784?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const getDocumentLabel = (status) => {
    const normalized = normalizeStatus(status)
    if (normalized === 'Delivered') return 'Download Tax Invoice'
    if (normalized === 'Ordered') return 'Download Receipt'
    return 'Download Proforma'
  }

  const downloadOrderDocument = async (orderId) => {
    if (!orderId || !userId) return

    try {
      setDownloadingOrderId(orderId)
      const response = await axios.get(`${BASE_URL}/api/orders/${encodeURIComponent(orderId)}/download-invoice?userId=${encodeURIComponent(userId)}`, {
        responseType: 'blob',
        timeout: 45000
      })

      const disposition = response.headers?.['content-disposition'] || ''
      const filenameMatch = disposition.match(/filename="?([^\";]+)"?/i)
      const fileName = filenameMatch?.[1] || `Invoice-${orderId}.pdf`
      const objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))

      const link = document.createElement('a')
      link.href = objectUrl
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(objectUrl)
    } catch (e) {
      console.error('Failed to download order document:', e)
      window.alert('Unable to download document right now. Please try again.')
    } finally {
      setDownloadingOrderId('')
    }
  }

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) {
        setError('Please login to view your orders')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data } = await axios.get(`${BASE_URL}/api/orders/${userId}`, { timeout: 15000 })
        setOrders(Array.isArray(data?.orders) ? data.orders : [])
      } catch (e) {
        setError('Unable to load your orders right now')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [userId])

  // 🔴 INITIALIZE SOCKET.IO FOR REAL-TIME STATUS UPDATES
  useEffect(() => {
    if (!userId) return

    let mounted = true
    const socketRef_local = io(BASE_URL, {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socketRef.current = socketRef_local

    socketRef_local.on('connect', () => {
      if (mounted) {
        setSocketConnected(true)
        console.log('✅ MyOrders Socket connected, room:', `user:${userId}`)
      }
    })

    socketRef_local.on('disconnect', () => {
      if (mounted) {
        setSocketConnected(false)
        console.log('❌ MyOrders Socket disconnected')
      }
    })

    // 🔴 LISTEN FOR STATUS UPDATES AND UPDATE ORDERS IN REAL-TIME
    socketRef_local.on('statusUpdate', (payload) => {
      if (payload?.orderId && payload?.status && mounted) {
        console.log('🔄 Real-time status update received:', payload)
        setOrders((prevOrders) => {
          return prevOrders.map((order) => {
            if (order.orderId === payload.orderId) {
              return {
                ...order,
                orderStatus: payload.status,
                estimatedArrival: payload.estimatedArrival || payload.estimatedDelivery || order.estimatedArrival || order.estimatedDelivery || null,
                estimatedDelivery: payload.estimatedDelivery || payload.estimatedArrival || order.estimatedDelivery || order.estimatedArrival || null,
                updatedAt: payload.updatedAt || new Date().toISOString()
              }
            }
            return order
          })
        })
      }
    })

    socketRef_local.on('error', (error) => {
      console.error('❌ Socket error in MyOrders:', error)
    })

    return () => {
      mounted = false
      if (socketRef_local) {
        socketRef_local.disconnect()
      }
    }
  }, [userId])


  const filteredOrders = useMemo(() => {
    let result = [...orders]

    if (activeFilter === 'Delivered') {
      result = result.filter((item) => normalizeStatus(item.orderStatus) === 'Delivered')
    } else if (activeFilter === 'In Transit') {
      result = result.filter((item) => {
        const st = normalizeStatus(item.orderStatus)
        return st === 'Ordered' || st === 'Packed' || st === 'Shipped'
      })
    }

    if (searchOrderId.trim()) {
      const query = searchOrderId.trim().toLowerCase()
      result = result.filter((item) => String(item.orderId || '').toLowerCase().includes(query))
    }

    if (fromDate) {
      const from = new Date(fromDate)
      from.setHours(0, 0, 0, 0)
      result = result.filter((item) => new Date(item.updatedAt) >= from)
    }

    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999)
      result = result.filter((item) => new Date(item.updatedAt) <= to)
    }

    return result
  }, [orders, activeFilter, searchOrderId, fromDate, toDate])

  return (
    <div style={{ minHeight: '100vh', background: '#f6f6f4', padding: '100px 16px 40px' }}>
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
          <div>
            <h2 className="font-weight-bold mb-1" style={{ color: '#111' }}>My Orders</h2>
            <p className="text-muted mb-0">Track all your recent and past orders in one place</p>
          </div>
          <div className="d-flex align-items-center mt-2 mt-md-0" style={{ gap: '12px' }}>
            <span
              className="px-3 py-2 rounded-pill"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                background: socketConnected ? '#10b981' : '#ef4444',
                boxShadow: socketConnected ? '0 4px 12px rgba(16,185,129,0.28)' : 'none'
              }}
            >
              {socketConnected ? '🟢 Live Connected' : '🔴 Connecting...'}
            </span>
            <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/profile')}>
              Back to Profile
            </button>
          </div>
        </div>

        {/* 🌟 PREMIUM FILTER BUTTONS */}
        <div className="d-flex flex-wrap mb-4" style={{ gap: '8px' }}>
          {FILTERS.map((item) => (
            <motion.button
              key={item}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(item)}
              className="btn rounded-pill"
              style={{
                background: activeFilter === item 
                  ? 'linear-gradient(135deg, #1a1a1a, #3a3a3a)' 
                  : 'linear-gradient(135deg, #fff, #f9f9f9)',
                color: activeFilter === item ? '#fff' : '#333',
                border: activeFilter === item ? '1.5px solid #555' : '1.5px solid #ddd',
                minWidth: 120,
                fontWeight: 700,
                letterSpacing: '0.3px',
                padding: '8px 18px',
                boxShadow: activeFilter === item 
                  ? '0 6px 16px rgba(0,0,0,0.2)' 
                  : '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
            >
              {item}
            </motion.button>
          ))}
        </div>

        {/* 💎 PREMIUM SEARCH BOX */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ 
            background: 'linear-gradient(135deg, #ffffff, #fbfbfb)',
            border: '1.5px solid #e0e0e0',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="row align-items-center">
            <div className="col-12 col-md-8 mb-3 mb-md-0">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>🔍</span>
                <input
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="form-control"
                  placeholder="Search by Order ID..."
                  style={{ 
                    borderRadius: '12px', 
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    fontWeight: 500,
                    background: '#fff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b6c2f'
                    e.target.style.boxShadow = '0 4px 16px rgba(139,108,47,0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#ddd'
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                />
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex gap-2">
              {(searchOrderId || fromDate || toDate) && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setSearchOrderId('')
                    setFromDate('')
                    setToDate('')
                  }}
                  className="btn btn-outline-secondary flex-grow-1"
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  ✕ Clear
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="btn rounded-pill flex-grow-1"
                style={{ 
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #8b6c2f, #a88344)',
                  color: '#fff',
                  border: '1.5px solid #9d7d3f',
                  boxShadow: '0 4px 12px rgba(139,108,47,0.2)',
                  letterSpacing: '0.2px'
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
                <label className="small font-weight-bold mb-2" style={{ display: 'block', color: '#333' }}>📅 From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="form-control"
                  style={{ borderRadius: '12px', border: '1.5px solid #ddd', fontWeight: 500 }}
                />
              </div>
              <div className="col-md-6">
                <label className="small font-weight-bold mb-2" style={{ display: 'block', color: '#333' }}>📅 To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="form-control"
                  style={{ borderRadius: '12px', border: '1.5px solid #ddd', fontWeight: 500 }}
                />
              </div>
              <div className="col-12 mt-4 d-flex justify-content-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setFromDate('')
                    setToDate('')
                  }}
                  className="btn btn-sm rounded-pill"
                  style={{
                    background: 'linear-gradient(135deg, #e0e0e0, #d0d0d0)',
                    color: '#333',
                    fontWeight: 600,
                    border: '1.5px solid #ccc',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  ✕ Clear Dates
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {loading ? (
          <div className="p-4 text-center bg-white rounded-xl shadow-sm text-muted">Loading orders...</div>
        ) : error ? (
          <div className="p-4 text-center bg-white rounded-xl shadow-sm text-danger">{error}</div>
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
                whileHover={{ y: -6, boxShadow: '0 24px 50px rgba(212,175,55,0.15)' }}
                className="mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
                  border: '1.5px solid rgba(212,175,55,0.2)',
                  borderRadius: '18px',
                  padding: '24px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative'
                }}
              >
                {/* Header Row - Premium Layout */}
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1.5px solid #f0f0f0' }}>
                  <div className="flex-grow-1">
                    <div className="font-weight-bold" style={{ fontSize: '18px', color: '#0f0f10', letterSpacing: '0.2px' }}>
                      {item.orderId}
                    </div>
                    <div className="small mt-2 d-flex align-items-center" style={{ color: '#888' }}>
                      <Clock3 size={14} className="mr-2" /> 
                      {new Date(item.updatedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
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
                    {(() => {
                      const eta = item.estimatedArrival || item.estimatedDelivery
                      if (!eta) return null
                      return (
                        <>
                          <div className="small mt-3" style={{ color: '#999', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            Expected Delivery
                          </div>
                          <div className="font-weight-bold mt-2" style={{ fontSize: '14px', color: '#8b6c2f', letterSpacing: '0.2px' }}>
                            {new Date(eta).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </>
                      )
                    })()}
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

                  <motion.button
                    whileHover={{
                      scale: 1.03,
                      boxShadow: '0 20px 40px rgba(212,175,55,0.26)',
                      y: -3
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => downloadOrderDocument(item.orderId)}
                    disabled={downloadingOrderId === item.orderId}
                    className="btn btn-sm rounded-pill"
                    style={{
                      flex: '1 1 auto',
                      minWidth: '170px',
                      background: 'linear-gradient(135deg, #d4af37, #b08a2c)',
                      color: '#111',
                      border: '1.5px solid #9b7a22',
                      fontWeight: '800',
                      fontSize: '12px',
                      padding: '11px 16px',
                      letterSpacing: '0.3px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 8px 18px rgba(212,175,55,0.22)',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: downloadingOrderId === item.orderId ? 0.7 : 1
                    }}
                    title="Download status-based order document"
                  >
                    <span style={{ position: 'relative', zIndex: 2 }}>
                      {downloadingOrderId === item.orderId ? 'Preparing PDF...' : `📄 ${getDocumentLabel(item.orderStatus)}`}
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
