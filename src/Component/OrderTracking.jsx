import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { BASE_URL } from '../constants'
import { Package, Archive, Truck, MapPin, BadgeCheck } from 'lucide-react'

const STEPS = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']
const STATUS_COLOR = {
  Ordered: '#8b6c2f',
  Packed: '#b48b2a',
  Shipped: '#d1a84a',
  'Out for Delivery': '#a89646',
  Delivered: '#1f8f54'
}

const STATUS_ICON = {
  Ordered: Package,
  Packed: Archive,
  Shipped: Truck,
  'Out for Delivery': MapPin,
  Delivered: BadgeCheck
}

const STATUS_SUBTEXT = {
  Ordered: 'Your order has been confirmed and moved to our luxury processing desk.',
  Packed: 'Your item has been sanitized and packed with premium care.',
  Shipped: 'Your luxury package is in transit via our elite courier partner.',
  'Out for Delivery': 'Your order is out for delivery and will reach you today.',
  Delivered: 'Delivered at your doorstep. We hope your Luxe experience was exceptional.'
}

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase()
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
  if (raw === 'packed') return 'Packed'
  if (raw === 'shipped') return 'Shipped'
  if (raw === 'out for delivery') return 'Out for Delivery'
  if (raw === 'delivered') return 'Delivered'
  return 'Ordered'
}

export default function OrderTracking() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const userId = localStorage.getItem('userid')

  const [status, setStatus] = useState('Ordered')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [toasts, setToasts] = useState([])
  const [didCelebrate, setDidCelebrate] = useState(false)
  const [statusTimeline, setStatusTimeline] = useState([])

  const activeIndex = useMemo(() => Math.max(0, STEPS.indexOf(status)), [status])
  const progressPercent = useMemo(() => (activeIndex / (STEPS.length - 1)) * 100, [activeIndex])
  const orderItems = useMemo(() => {
    if (Array.isArray(order?.orderItems) && order.orderItems.length) return order.orderItems
    if (Array.isArray(order?.products) && order.products.length) return order.products
    return []
  }, [order])

  const primaryItem = useMemo(() => orderItems[0] || null, [orderItems])

  const primaryImage = useMemo(() => {
    return (
      primaryItem?.image ||
      primaryItem?.pic ||
      primaryItem?.pic1 ||
      primaryItem?.thumbnail ||
      ''
    )
  }, [primaryItem])

  const timelineMap = useMemo(() => {
    const map = {}
    ;(statusTimeline || []).forEach((entry) => {
      const normalized = normalizeStatus(entry?.status)
      if (!map[normalized]) map[normalized] = entry?.timestamp
    })
    return map
  }, [statusTimeline])

  const timelineSteps = useMemo(
    () => STEPS.map((step, index) => ({
      step,
      index,
      isReached: index <= activeIndex,
      timestamp: timelineMap[step]
    })),
    [activeIndex, timelineMap]
  )

  const showStatusToast = (nextStatus) => {
    const statusText = normalizeStatus(nextStatus)
    const messages = {
      Ordered: '✅ Order Confirmed - Processing started',
      Packed: '📦 Luxe Parcel Ready - Beautiful packaging in progress',
      Shipped: '🚚 White-Glove Delivery - On its divine journey',
      Delivered: '🎉 Luxury Experience Complete - Thank you!'
    }

    const newToast = {
      id: Date.now(),
      title: '📨 Status Updated',
      message: messages[nextStatus] || `Status: ${statusText}`,
      type: 'status'
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id))
    }, 3500)

    // Status update notification
    console.log(`📊 Status Updated: ${nextStatus}`)
  }

  const showDeliveryUpdateToast = (deliverySchedule) => {
    if (!deliverySchedule?.date) return

    const deliveryDate = new Date(deliverySchedule.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateText = deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    if (deliveryDate.toDateString() === today.toDateString()) {
      dateText = 'Today'
    } else if (deliveryDate.toDateString() === tomorrow.toDateString()) {
      dateText = 'Tomorrow'
    }

    const timeText = deliverySchedule.time ? ` at ${deliverySchedule.time}` : ''

    const newToast = {
      id: Date.now() + 1, // Different ID to show alongside status toast
      title: '📅 Delivery Updated',
      message: `🚚 Expected delivery: ${dateText}${timeText}`,
      type: 'delivery'
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id))
    }, 3500)

    console.log(`📅 Delivery Date Updated: ${dateText}${timeText}`)
  }

  // Smart Date Formatter - Shows "Today", "Tomorrow", or full date
  const formatDeliveryDate = (dateString) => {
    if (!dateString) return null

    const deliveryDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const deliveryDateOnly = new Date(deliveryDate)
    deliveryDateOnly.setHours(0, 0, 0, 0)

    if (deliveryDateOnly.getTime() === today.getTime()) {
      return 'Today'
    } else if (deliveryDateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return deliveryDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  // Get the most recent delivery date from deliverySchedule or estimatedDelivery
  const getDeliveryInfo = useMemo(() => {
    // Priority: deliverySchedule.date > estimatedDelivery
    if (order?.deliverySchedule?.date) {
      return {
        date: order.deliverySchedule.date,
        time: order.deliverySchedule.time,
        source: 'schedule'
      }
    } else if (order?.estimatedDelivery) {
      return {
        date: order.estimatedDelivery,
        time: null,
        source: 'estimate'
      }
    }
    return null
  }, [order])

  // Track page visit
  useEffect(() => {
    console.log('Tracking order:', orderId)
    return () => {}
  }, [orderId, userId])

  // 🔴 FETCH ORDER + SOCKET.IO SETUP
  useEffect(() => {
    if (!userId || !orderId) {
      setError('❌ Invalid tracking link. Please login and try again.')
      setLoading(false)
      return
    }

    let mounted = true
    let socketRef

    const init = async () => {
      try {
        // Fetch initial order data
        const { data } = await axios.get(
          `${BASE_URL}/api/order/${orderId}?userId=${userId}`,
          { timeout: 15000 }
        )
        if (!mounted) return

        setOrder(data)
        const initialStatus = normalizeStatus(data?.orderStatus)
        setStatus(initialStatus)
        
        // Initialize status timeline from order
        if (data?.statusHistory && Array.isArray(data.statusHistory)) {
          setStatusTimeline(data.statusHistory)
        } else {
          // Create default timeline if not available
          setStatusTimeline([
            { status: 'Ordered', timestamp: data?.createdAt || new Date().toISOString() }
          ])
        }
        console.log('✅ Order fetched:', data)
      } catch (e) {
        if (!mounted) return
        console.error('❌ Order fetch error:', e.message)
        const errorMsg = e.response?.status === 404
          ? '❌ Order not found. Please check the tracking link.'
          : '❌ Failed to load order. Please try again.'
        setError(errorMsg)
      } finally {
        if (mounted) setLoading(false)
      }

      // 🔴 SOCKET.IO CONNECTION - Real-time status updates
      socketRef = io(BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: { userId }
      })

      socketRef.on('connect', () => {
        if (mounted) {
          setSocketConnected(true)
          console.log('✅ Socket connected, room:', `user:${userId}`)
        }
      })

      socketRef.on('disconnect', () => {
        if (mounted) {
          setSocketConnected(false)
          console.log('❌ Socket disconnected')
        }
      })

      // 🔴 LISTEN FOR STATUS UPDATES
      socketRef.on('statusUpdate', (payload) => {
        if (payload?.orderId === orderId && payload?.status) {
          if (mounted) {
            const nextStatus = normalizeStatus(payload.status)
            setStatus((prev) => {
              if (prev !== nextStatus) {
                showStatusToast(nextStatus)
              }
              return nextStatus
            })

            // Update order with new delivery information if provided
            setOrder((prev) => {
              const updated = {
                ...(prev || {}),
                updatedAt: payload.updatedAt || new Date().toISOString(),
                // Update delivery schedule if provided in payload
                ...(payload.deliverySchedule && { deliverySchedule: payload.deliverySchedule })
              }

              // If deliverySchedule has a date, also update estimatedDelivery
              if (payload.deliverySchedule?.date) {
                updated.estimatedDelivery = payload.deliverySchedule.scheduledAt || payload.deliverySchedule.date
              } else if (payload.deliverySchedule?.estimatedDelivery) {
                updated.estimatedDelivery = payload.deliverySchedule.estimatedDelivery
              } else if (payload.estimatedDelivery) {
                updated.estimatedDelivery = payload.estimatedDelivery
              }

              return updated
            })

            // Add to timeline with enhanced information
            setStatusTimeline((prev) => [
              ...prev,
              {
                status: nextStatus,
                timestamp: payload.updatedAt || new Date().toISOString(),
                deliverySchedule: payload.deliverySchedule || null,
                adminNote: payload.adminNote || null
              }
            ])

            // Show delivery update notification if delivery date changed
            if (payload.deliverySchedule?.date) {
              showDeliveryUpdateToast(payload.deliverySchedule)
            }

            console.log('🔄 Status updated to:', nextStatus, payload.deliverySchedule ? 'with delivery update' : '')
          }
        }
      })

      socketRef.on('error', (error) => {
        console.error('❌ Socket error:', error)
      })
    }

    init()

    return () => {
      mounted = false
      if (socketRef) socketRef.disconnect()
    }
  }, [orderId, userId])

  useEffect(() => {
    if (status !== 'Delivered' || didCelebrate) return

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#D4AF37', '#F5E7B2', '#ffffff', '#1f8f54']
    })

    setDidCelebrate(true)
  }, [status, didCelebrate, orderId, userId, order])

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f6f6f4' }}>
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
            <div style={{ fontSize: '48px' }}>📦</div>
          </motion.div>
          <p className="mt-3 text-muted">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f6f6f4' }}>
        <div className="text-center">
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <p className="mt-3 text-danger font-weight-bold">{error}</p>
          <button className="btn btn-dark rounded-pill px-4 mt-4" onClick={() => navigate('/profile')}>
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f6f4', padding: '100px 16px 40px' }}>
      {/* ENHANCED MULTIPLE TOASTS DISPLAY */}
      <div style={{ position: 'fixed', top: 24, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, x: 18 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: 20 }}
            style={{
              minWidth: 280,
              background: toast.type === 'delivery'
                ? 'linear-gradient(135deg, #1e3a8a, #1e40af)'
                : '#111111',
              border: toast.type === 'delivery'
                ? '1px solid #3b82f6'
                : '1px solid #d4af37',
              color: '#f8e8c7',
              borderRadius: 14,
              boxShadow: toast.type === 'delivery'
                ? '0 14px 34px rgba(59,130,246,0.35)'
                : '0 14px 34px rgba(0,0,0,0.35)',
              padding: '12px 14px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Premium shimmer effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(90deg, transparent, ${toast.type === 'delivery' ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.1)'}, transparent)`,
                animation: 'toast-shimmer 2s infinite',
                pointerEvents: 'none'
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: 12,
                letterSpacing: '.9px',
                textTransform: 'uppercase',
                color: toast.type === 'delivery' ? '#60a5fa' : '#d4af37',
                fontWeight: 700
              }}>
                {toast.title}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: '#f4eee0' }}>{toast.message}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container" style={{ maxWidth: 900 }}>
        {/* HEADER */}
        <div className="mb-5 text-center">
          <h1 className="font-weight-bold mb-2" style={{ fontSize: '32px', letterSpacing: '.5px', color: '#111' }}>
            ✨ Boutique Luxe Order Tracking
          </h1>
          <p className="mb-1" style={{ color: '#333', fontWeight: 700, fontSize: '16px', letterSpacing: '.3px' }}>
            Order #{orderId}
          </p>
          <p style={{ color: '#666', fontSize: '15px' }}>
            Track your premium order in real-time
          </p>
        </div>

        {/* MAIN CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-4 p-md-5 shadow-lg rounded-3xl bg-white"
          style={{ 
            border: '1.5px solid rgba(212,175,55,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
            position: 'relative'
          }}
        >
          {/* ORDER INFO - PREMIUM LAYOUT WITH ENHANCED DETAILS */}
          <div className="p-4 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, #fafaf8, #f9f7f4)', border: '2px solid #d4af37' }}>
            <div className="row">
              <div className="col-md-6 mb-3 mb-md-0">
                <div className="d-flex flex-column">
                  <p className="text-muted small mb-1" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Payment Status</p>
                  <p className="font-weight-bold mb-3" style={{ fontSize: '14px', color: order?.paymentStatus === 'Paid' ? '#27ae60' : '#ff9500' }}>
                    {order?.paymentStatus === 'Paid' ? '✅ Paid' : order?.paymentStatus === 'Pending' ? '⏳ Pending' : order?.paymentStatus}
                  </p>
                  <p className="text-muted small mb-1" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Payment Method</p>
                  <p className="font-weight-bold" style={{ fontSize: '14px', color: '#2c2c2c' }}>
                    {order?.paymentMethod || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="col-md-6 text-md-right">
                <div className="d-flex flex-column align-items-md-end">
                  {order?.totalAmount && (
                    <>
                      <p className="text-muted small mb-1" style={{ fontSize: '11px' }}>Subtotal</p>
                      <p className="mb-2" style={{ fontSize: '13px', color: '#666' }}>₹{Number(order.totalAmount).toLocaleString('en-IN')}</p>
                    </>
                  )}
                  {order?.shippingAmount > 0 && (
                    <>
                      <p className="text-muted small mb-1" style={{ fontSize: '11px' }}>Shipping</p>
                      <p className="mb-2" style={{ fontSize: '13px', color: '#666' }}>₹{Number(order.shippingAmount).toLocaleString('en-IN')}</p>
                    </>
                  )}
                  {order?.finalAmount && (
                    <>
                      <hr style={{ margin: '8px 0', borderColor: '#d4af37', borderWidth: '1.5px' }} />
                      <p className="text-muted small mb-1" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700' }}>Total Amount</p>
                      <p className="font-weight-bold" style={{ fontSize: '22px', background: 'linear-gradient(135deg, #d4af37, #b8860b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        ₹{Number(order.finalAmount).toLocaleString('en-IN')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ESTIMATED DELIVERY - ENHANCED WITH SMART DATE FORMATTING */}
          {getDeliveryInfo && (
            <motion.div
              key={getDeliveryInfo.date} // Key ensures re-render on date change
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="p-4 rounded-xl mb-4"
              style={{
                background: 'rgba(255, 255, 255, 0.55)',
                border: '1.5px solid #D4AF37',
                boxShadow: '0 12px 30px rgba(212,175,55,0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            >
              <div className="d-flex align-items-center">
                <div style={{ fontSize: '32px', marginRight: '16px' }}>📅</div>
                <div>
                  <p className="text-muted small mb-1" style={{ color: '#6b5b2b', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Expected Delivery
                  </p>
                  <p className="font-weight-bold mb-0" style={{ fontSize: '20px', color: '#5f4b1b', lineHeight: '1.3' }}>
                    {formatDeliveryDate(getDeliveryInfo.date)}
                    {getDeliveryInfo.time && (
                      <span style={{ fontSize: '16px', color: '#8b7355', marginLeft: '8px' }}>
                        at {getDeliveryInfo.time}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: '#8b7355', marginTop: '4px', marginBottom: '0' }}>
                    {new Date(getDeliveryInfo.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  {order?.shippingAddress?.city && (
                    <p style={{ fontSize: '12px', color: '#6b5b2b', marginTop: '6px', marginBottom: '0' }}>
                      📍 Delivering to {order.shippingAddress.city}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* LIVE CONNECTED BADGE - WITH PULSE ANIMATION */}
          <div className="d-flex justify-content-center mb-4">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {socketConnected && (
                <span className="live-ping" />
              )}
              <div
                className="px-4 py-2 rounded-full text-white font-weight-bold d-inline-block"
                style={{
                  background: socketConnected ? '#10b981' : '#ef4444',
                  fontSize: '13px',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: socketConnected ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                  letterSpacing: '0.5px'
                }}
              >
                {socketConnected ? '🟢 Live Connected' : '🔴 Connecting...'}
              </div>
            </div>
          </div>

          {/* PRODUCT THUMBNAIL */}
          {primaryItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 p-3 rounded-lg"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <p className="small text-muted mb-2">Ordered Item</p>
              <div className="d-flex align-items-center">
                {primaryImage ? (
                  <div style={{
                    width: '72px',
                    height: '72px',
                    marginRight: '12px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.12)'
                  }}>
                    <img 
                      src={primaryImage}
                      alt={primaryItem?.title || primaryItem?.name || 'Ordered product'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '72px',
                    height: '72px',
                    marginRight: '12px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    No Image
                  </div>
                )}
                <div className="flex-grow-1">
                  <p className="font-weight-bold small mb-1" style={{ color: '#111', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {primaryItem?.title || primaryItem?.name || 'Order Item'}
                  </p>
                  <p className="small text-muted mb-0">
                    ₹{Number(primaryItem?.price || primaryItem?.finalprice || 0).toLocaleString('en-IN')}
                    {primaryItem?.quantity && ` × ${primaryItem.quantity}`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          <div style={{ position: 'relative', margin: '50px 0 30px' }}>
            {/* Background bar */}
            <div style={{ height: 10, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }} />

            {/* Animated progress bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 15, delay: 0.2 }}
              style={{
                height: 10,
                borderRadius: 99,
                background: `linear-gradient(90deg, #7f5f1f, #b48b2a, #d7b15a, #1f8f54)`,
                position: 'absolute',
                top: 0,
                left: 0,
                boxShadow: `0 0 20px ${STATUS_COLOR[status]}66`
              }}
            />
          </div>

          {/* STEPPER STEPS */}
          <div className="stepper-scroll mt-4">
          <div className="d-flex justify-content-between min-stepper-width">
            {STEPS.map((s, i) => {
              const isActive = i === activeIndex
              const isDone = i <= activeIndex
              const StepIcon = STATUS_ICON[s]
              return (
                <div key={s} className="text-center flex-grow-1" style={{ position: 'relative' }}>
                  {/* Connecting line */}
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 19,
                        left: '50%',
                        width: '50%',
                        height: 3,
                        background: i < activeIndex ? STATUS_COLOR[s] : '#e5e7eb',
                        transition: 'background 0.6s ease'
                      }}
                    />
                  )}

                  {/* Step circle (non-blinking premium style) */}
                  <motion.div
                    animate={{ scale: isActive ? 1.06 : 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{
                      margin: '0 auto',
                      position: 'relative',
                      zIndex: 2 }}
                  >
                    {/* Main circle */}
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: isDone ? STATUS_COLOR[s] : '#f3f4f6',
                        border: `3px solid ${isDone ? STATUS_COLOR[s] : '#e5e7eb'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDone ? '#fff' : '#9ca3af',
                        boxShadow: isActive ? `0 8px 25px ${STATUS_COLOR[s]}33` : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <StepIcon size={20} />
                    </div>
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                    style={{
                      marginTop: 12,
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '600',
                      color: s === 'Shipped' ? '#ca8a04' : (isDone ? STATUS_COLOR[s] : '#9ca3af'),
                      transition: 'color 0.4s ease'
                    }}
                  >
                    {s}
                  </motion.div>
                  {isActive && (
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Current</div>
                  )}
                </div>
              )
            })}
          </div>
          </div>

          {/* STATUS DISPLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 p-4 rounded-xl"
            style={{
              background: `${STATUS_COLOR[status]}0f`,
              border: `2px solid ${STATUS_COLOR[status]}33`,
              textAlign: 'center'
            }}
          >
            <p className="text-muted small mb-2">Current Status</p>
            <h3
              className="font-weight-bold mb-1"
              style={{ color: status === 'Shipped' ? '#ca8a04' : STATUS_COLOR[status], fontSize: '24px' }}
            >
              {status}
            </h3>
            <p className="small text-muted mb-0">
              {status === 'Ordered' && '✅ Your order has been placed successfully'}
              {status === 'Packed' && '📦 Your order is being packed with care'}
              {status === 'Shipped' && '🚚 Your order is on its way to you'}
              {status === 'Delivered' && '🎉 Delivered! Thank you for choosing Boutique Luxe. Your premium order is complete.'}
            </p>
          </motion.div>

          {/* STATUS TIMELINE - ENHANCED WITH ADMIN NOTES AND DELIVERY UPDATES */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-5 p-4 rounded-xl"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
          >
            <h5 className="font-weight-bold mb-4" style={{ color: '#111', fontSize: '16px', letterSpacing: '0.5px' }}>
              📍 Status Timeline
            </h5>
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              {timelineSteps.map((event, idx) => {
                const timelineEvent = statusTimeline.find(t => t.status === event.step)
                return (
                  <motion.div
                    key={event.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    style={{ marginBottom: idx < timelineSteps.length - 1 ? '20px' : 0, position: 'relative' }}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-28px',
                        top: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: event.isReached ? (STATUS_COLOR[event.step] || '#d1a84a') : '#d1d5db',
                        border: '3px solid white',
                        boxShadow: `0 0 0 2px ${event.isReached ? (STATUS_COLOR[event.step] || '#d1a84a') : '#d1d5db'}33`
                      }}
                    />
                    {/* Timeline line */}
                    {idx < timelineSteps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '-23px',
                          top: '12px',
                          width: '2px',
                          height: '20px',
                          background: '#e5e7eb'
                        }}
                      />
                    )}
                    <div>
                      <p className="font-weight-bold small mb-1" style={{ color: '#111', fontSize: '13px' }}>
                        {event.step}
                      </p>
                      <p className="small mb-1" style={{ color: '#6b7280', fontSize: '12px' }}>
                        {STATUS_SUBTEXT[event.step]}
                      </p>

                      {/* Enhanced timeline with delivery schedule */}
                      {timelineEvent?.deliverySchedule && (
                        <div className="mt-2 p-2 rounded" style={{ background: '#e0f2fe', border: '1px solid #0284c7' }}>
                          <p className="small mb-0" style={{ color: '#0c4a6e', fontSize: '11px', fontWeight: '600' }}>
                            📅 Delivery Scheduled: {timelineEvent.deliverySchedule.date}
                            {timelineEvent.deliverySchedule.time && ` at ${timelineEvent.deliverySchedule.time}`}
                          </p>
                        </div>
                      )}

                      {/* Admin notes */}
                      {timelineEvent?.adminNote && (
                        <div className="mt-2 p-2 rounded" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                          <p className="small mb-0" style={{ color: '#92400e', fontSize: '11px', fontWeight: '600' }}>
                            💼 Admin Note: {timelineEvent.adminNote}
                          </p>
                        </div>
                      )}

                      <p className="text-muted small mb-0" style={{ fontSize: '12px' }}>
                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'Pending'}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ACTION BUTTONS - PREMIUM ANIMATIONS */}
          <div className="mt-5">
            {/* Primary Action - Centered Back Button */}
            <div className="row mb-4">
              <div className="col-12">
                <motion.button
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: '0 20px 40px rgba(15,15,16,0.3)'
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/my-orders')}
                  className="btn btn-block rounded-pill"
                  style={{ 
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto',
                    fontWeight: '700', 
                    fontSize: '15px', 
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #0f0f10, #1a1f26)',
                    color: '#fff',
                    border: '1.5px solid #2b3138',
                    letterSpacing: '0.4px',
                    boxShadow: '0 10px 30px rgba(15,15,16,0.2)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    display: 'block'
                  }}
                >
                  ← Back to My Orders
                </motion.button>
              </div>
            </div>

            {/* Secondary Actions - Enhanced Premium Buttons */}
            <div className="d-flex flex-wrap gap-3" style={{ rowGap: '12px' }}>
              {/* Chat Support Button */}
              <motion.button
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: '0 16px 36px rgba(37,211,102,0.3)',
                  y: -2
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const message = `Hi Luxe Support, I need assistance with my Order: ${orderId}`
                  window.open(`https://wa.me/918447859784?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
                }}
                className="btn btn-sm rounded-pill"
                style={{
                  flex: '1 1 auto',
                  minWidth: '150px',
                  background: 'linear-gradient(135deg, #25D366, #1aa84f)',
                  color: '#fff',
                  border: '1.5px solid #1ea952',
                  fontWeight: '700',
                  fontSize: '13px',
                  padding: '12px 20px',
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 20px rgba(37,211,102,0.25)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                title="Chat with our Luxe Concierge"
              >
                <span style={{ position: 'relative', zIndex: 2 }}>
                  💬 Chat Support
                </span>
              </motion.button>
            </div>
          </div>

          {/* FOOTER NOTE */}
          <p className="text-center text-muted small mt-4 mb-0" style={{ fontSize: '12px' }}>
            Updates are live. Last known update: {order?.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'Fetching...'}
          </p>
        </motion.div>
      </div>

      {/* Mobile-friendly CSS & Animations */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.3;
          }
        }

        .live-ping {
          position: absolute;
          width: 100%;
          height: 100%;
          left: 0;
          top: 0;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.45);
          animation: ping-live 1.25s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: 0;
        }

        @keyframes ping-live {
          75%, 100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        /* Premium Toast Shimmer Animation */
        @keyframes toast-shimmer {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Premium Button Shimmer Animation */
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .btn:hover::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 0.6s ease-in-out;
          pointer-events: none;
        }

        /* Premium Card Glow on Hover */
        @keyframes card-glow {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
          }
          50% {
            box-shadow: 0 15px 50px rgba(212,175,55,0.12);
          }
        }

        .btn {
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 576px) {
          .container {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .stepper-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 8px;
          }
          .min-stepper-width {
            min-width: 520px;
          }
          .p-md-5 {
            padding: 1.5rem !important;
          }
          h1 {
            font-size: 24px !important;
          }
          .btn-block {
            display: block;
            width: 100%;
          }
          .text-md-right {
            text-align: left;
          }
          .d-flex.gap-3 {
            gap: 8px !important;
          }
        }

        @media (min-width: 768px) {
          .text-md-right {
            text-align: right;
          }
          .flex-md-grow {
            flex-grow: 1;
          }
        }
      `}</style>
    </div>
  )
}
