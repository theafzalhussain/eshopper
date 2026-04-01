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

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const resolveItemImage = (item = {}) => {
  const raw =
    item?.image ||
    item?.pic ||
    item?.pic1 ||
    item?.thumbnail ||
    item?.productid?.pic1 ||
    ''

  if (!raw || typeof raw !== 'string') return ''
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw
  return `${BASE_URL}/productimages/${raw}`
}

const formatDateTimeShort = (value) => {
  if (!value) return 'Pending'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Pending'
  return dt.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatRelativeTime = (value) => {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const diffMs = Date.now() - dt.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

const formatDeliverySchedule = (deliverySchedule = null) => {
  if (!deliverySchedule) return ''
  const baseDate = deliverySchedule?.date || deliverySchedule?.estimatedDelivery
  if (!baseDate) return ''
  const dateLabel = formatDateTimeShort(baseDate)
  const timeLabel = deliverySchedule?.time ? ` • ${deliverySchedule.time}` : ''
  return `${dateLabel}${timeLabel}`
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

  const orderItemsDetailed = useMemo(
    () => orderItems.map((item, index) => {
      const quantityVal = Number(item?.quantity || item?.qty || item?.count || 1)
      const quantity = Number.isFinite(quantityVal) && quantityVal > 0 ? quantityVal : 1

      const priceVal = Number(
        item?.price ||
        item?.finalprice ||
        item?.salePrice ||
        item?.baseprice ||
        item?.productid?.finalprice ||
        item?.productid?.baseprice ||
        0
      )
      const unitPrice = Number.isFinite(priceVal) ? priceVal : 0

      const lineTotalVal = Number(item?.totalPrice || item?.total || unitPrice * quantity)
      const lineTotal = Number.isFinite(lineTotalVal) ? lineTotalVal : unitPrice * quantity

      return {
        id: String(item?._id || item?.id || item?.productid?._id || index),
        name: item?.title || item?.name || item?.productName || item?.productid?.name || `Item ${index + 1}`,
        description: item?.description || item?.productid?.description || '',
        quantity,
        unitPrice,
        lineTotal,
        image: resolveItemImage(item)
      }
    }),
    [orderItems]
  )

  const totalItemCount = useMemo(
    () => orderItemsDetailed.reduce((sum, item) => sum + item.quantity, 0),
    [orderItemsDetailed]
  )

  const subtotalAmount = useMemo(() => {
    const fromOrder = Number(order?.totalAmount)
    if (Number.isFinite(fromOrder) && fromOrder > 0) return fromOrder
    return orderItemsDetailed.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
  }, [order?.totalAmount, orderItemsDetailed])

  const shippingAmount = useMemo(() => {
    const parsed = Number(order?.shippingAmount || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [order?.shippingAmount])

  const discountAmount = useMemo(() => {
    const parsed = Number(order?.couponDiscount || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [order?.couponDiscount])

  const finalAmount = useMemo(() => {
    const parsed = Number(order?.finalAmount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return Math.max(subtotalAmount + shippingAmount - discountAmount, 0)
  }, [order?.finalAmount, subtotalAmount, shippingAmount, discountAmount])

  const paymentStatusLabel = useMemo(() => {
    const raw = String(order?.paymentStatus || '').toLowerCase()
    if (raw === 'paid') return 'Paid'
    if (raw === 'pending') return 'Pending'
    if (raw === 'failed') return 'Failed'
    return order?.paymentStatus || 'Pending'
  }, [order?.paymentStatus])

  const timelineEventMap = useMemo(() => {
    const map = {}
    ;(statusTimeline || []).forEach((entry) => {
      const normalized = normalizeStatus(entry?.status || '')
      const entryTime = new Date(entry?.timestamp || 0).getTime()
      const existingTime = new Date(map[normalized]?.timestamp || 0).getTime()
      if (!map[normalized] || entryTime >= existingTime) {
        map[normalized] = {
          ...entry,
          status: normalized
        }
      }
    })
    return map
  }, [statusTimeline])

  const timelineSteps = useMemo(
    () => STEPS.map((step, index) => ({
      step,
      index,
      isReached: index <= activeIndex,
      timestamp: timelineEventMap[step]?.timestamp,
      details: timelineEventMap[step] || null
    })),
    [activeIndex, timelineEventMap]
  )

  const lastTimelineUpdate = useMemo(() => {
    const entries = Object.values(timelineEventMap || {})
    if (!entries.length) return ''
    const latest = entries.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())[0]
    return latest?.timestamp || ''
  }, [timelineEventMap])

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
    <div className="tracking-luxe-page" style={{ minHeight: '100vh', background: '#f6f6f4', padding: '100px 16px 40px' }}>
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
          className="p-4 p-md-5 shadow-lg rounded-3xl bg-white tracking-main-card"
          style={{ 
            border: '1.5px solid rgba(212,175,55,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
            position: 'relative'
          }}
        >
          {/* ORDER INFO - PREMIUM LAYOUT WITH ENHANCED DETAILS */}
          <div className="p-4 rounded-xl mb-4 order-finance-luxe-card">
            <div className="row">
              <div className="col-md-7 mb-3 mb-md-0">
                <div className="d-flex flex-column payment-core-wrap">
                  <p className="finance-kicker">Payment Status</p>
                  <span className={`payment-status-chip status-${String(paymentStatusLabel).toLowerCase()}`}>
                    {paymentStatusLabel === 'Paid' ? '✅ Paid' : paymentStatusLabel === 'Pending' ? '⏳ Pending' : paymentStatusLabel}
                  </span>

                  <p className="finance-kicker mt-3">Payment Method</p>
                  <p className="finance-value mb-0">{order?.paymentMethod || 'N/A'}</p>

                  <div className="finance-mini-grid mt-3">
                    <div className="finance-mini-item">
                      <span>Items</span>
                      <strong>{totalItemCount}</strong>
                    </div>
                    <div className="finance-mini-item">
                      <span>Order Ref</span>
                      <strong>{String(orderId || '').slice(-8)}</strong>
                    </div>
                    <div className="finance-mini-item full">
                      <span>Last Sync</span>
                      <strong>{formatDateTimeShort(lastTimelineUpdate || order?.updatedAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-5 text-md-right">
                <div className="d-flex flex-column align-items-md-end finance-amount-panel">
                  <div className="finance-amount-row">
                    <span>Subtotal</span>
                    <strong>{formatMoney(subtotalAmount)}</strong>
                  </div>
                  <div className="finance-amount-row">
                    <span>Shipping</span>
                    <strong>{formatMoney(shippingAmount)}</strong>
                  </div>
                  {discountAmount > 0 && (
                    <div className="finance-amount-row discount">
                      <span>Coupon Discount</span>
                      <strong>- {formatMoney(discountAmount)}</strong>
                    </div>
                  )}
                  <div className="finance-amount-row total">
                    <span>Total Amount</span>
                    <strong>{formatMoney(finalAmount)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DELIVERY SECTION - EXPECTED OR DELIVERED PREMIUM MESSAGE */}
          {status === 'Delivered' ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="p-4 rounded-xl mb-4 delivery-luxe-card delivered"
            >
              <div className="d-flex align-items-start align-items-md-center">
                <div className="delivery-icon">✅</div>
                <div>
                  <p className="delivery-kicker">Delivery Completed</p>
                  <p className="delivery-headline mb-1">
                    Your order has been successfully delivered.
                  </p>
                  <p className="delivery-copy mb-1">
                    Thank you for shopping with Boutique Luxe. We hope your premium experience was exceptional.
                  </p>
                  <p className="delivery-meta mb-0">
                    Delivered on {new Date(order?.updatedAt || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                    {order?.shippingAddress?.city ? ` • Destination: ${order.shippingAddress.city}` : ''}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : getDeliveryInfo ? (
            <motion.div
              key={getDeliveryInfo.date}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="p-4 rounded-xl mb-4 delivery-luxe-card expected"
            >
              <div className="d-flex align-items-center">
                <div className="delivery-icon">📅</div>
                <div>
                  <p className="delivery-kicker">Expected Delivery</p>
                  <p className="delivery-headline mb-0">
                    {formatDeliveryDate(getDeliveryInfo.date)}
                    {getDeliveryInfo.time && (
                      <span className="delivery-time"> at {getDeliveryInfo.time}</span>
                    )}
                  </p>
                  <p className="delivery-meta mb-0">
                    {new Date(getDeliveryInfo.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                    {order?.shippingAddress?.city ? ` • Delivering to ${order.shippingAddress.city}` : ''}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}

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

          {/* ORDERED ITEMS - SHOW ALL PRODUCTS */}
          {orderItemsDetailed.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 p-3 rounded-lg all-items-luxe"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap" style={{ gap: '8px' }}>
                <p className="small text-muted mb-0" style={{ letterSpacing: '0.4px' }}>Ordered Items</p>
                <span className="items-count-pill">{totalItemCount} items</span>
              </div>

              <div className="order-items-grid">
                {orderItemsDetailed.map((item) => (
                  <div key={item.id} className="order-item-card">
                    {item.image ? (
                      <div className="order-item-image-wrap">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="order-item-image"
                        />
                      </div>
                    ) : (
                      <div className="order-item-image-wrap no-image">No Image</div>
                    )}
                    <div className="order-item-content">
                      <p className="order-item-name">{item.name}</p>
                      {item.description ? (
                        <p className="order-item-description">{item.description}</p>
                      ) : null}
                      <p className="order-item-meta">
                        Qty {item.quantity} × {formatMoney(item.unitPrice)}
                      </p>
                      <p className="order-item-line-total">Line Total: {formatMoney(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
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
            className="mt-5 p-4 rounded-xl timeline-luxe-shell"
          >
            <div className="timeline-head-row mb-4">
              <h5 className="timeline-main-title mb-0">📍 Status Timeline</h5>
              <div className="timeline-head-meta">
                <span className={`timeline-live-chip ${socketConnected ? 'on' : 'off'}`}>
                  {socketConnected ? 'Live Updates On' : 'Reconnecting'}
                </span>
                <span className="timeline-count-chip">{statusTimeline.length || timelineSteps.length} updates</span>
              </div>
            </div>

            <div className="timeline-track-wrap">
              {timelineSteps.map((event, idx) => {
                const timelineEvent = event.details
                return (
                  <motion.div
                    key={event.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className={`timeline-event-card ${event.isReached ? 'reached' : 'pending'} ${idx === activeIndex ? 'active' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div
                      className="timeline-dot"
                      style={{
                        background: event.isReached ? (STATUS_COLOR[event.step] || '#d1a84a') : '#d1d5db',
                        boxShadow: `0 0 0 2px ${event.isReached ? (STATUS_COLOR[event.step] || '#d1a84a') : '#d1d5db'}33`
                      }}
                    />
                    {/* Timeline line */}
                    {idx < timelineSteps.length - 1 && (
                      <div className="timeline-line" />
                    )}
                    <div className="timeline-event-content">
                      <div className="timeline-event-head">
                        <p className="timeline-step-name mb-0">{event.step}</p>
                        <span className={`timeline-step-state ${event.isReached ? 'done' : 'wait'}`}>
                          {idx === activeIndex ? 'Current' : event.isReached ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                      <p className="timeline-step-text mb-1">
                        {STATUS_SUBTEXT[event.step]}
                      </p>

                      {/* Enhanced timeline with delivery schedule */}
                      {timelineEvent?.deliverySchedule && (
                        <div className="timeline-info-chip delivery mt-2">
                          📅 Delivery Window: {formatDeliverySchedule(timelineEvent.deliverySchedule)}
                        </div>
                      )}

                      {/* Admin notes */}
                      {timelineEvent?.adminNote && (
                        <div className="timeline-info-chip admin mt-2">
                          💼 Admin Note: {timelineEvent.adminNote}
                        </div>
                      )}

                      <div className="timeline-time-row">
                        <span>{formatDateTimeShort(event.timestamp)}</span>
                        {event.timestamp ? <span>{formatRelativeTime(event.timestamp)}</span> : null}
                      </div>
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

        .tracking-luxe-page {
          background: radial-gradient(circle at 15% 10%, #fffaf0 0%, #f6f6f4 38%, #eef3f8 100%);
        }

        .tracking-main-card {
          border-radius: 26px !important;
        }

        .order-finance-luxe-card {
          background: linear-gradient(145deg, #fafaf8, #f9f7f4);
          border: 2px solid #d4af37;
          box-shadow: 0 12px 26px rgba(212, 175, 55, 0.14);
        }

        .finance-kicker {
          margin: 0;
          color: #5b6474;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .payment-status-chip {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          min-height: 32px;
          padding: 0 12px;
          font-size: 13px;
          font-weight: 800;
          width: fit-content;
          border: 1px solid;
        }

        .payment-status-chip.status-paid {
          color: #106a3a;
          background: #def7e8;
          border-color: #9fe1be;
        }

        .payment-status-chip.status-pending {
          color: #a35d08;
          background: #fff2d9;
          border-color: #ebc57b;
        }

        .payment-status-chip.status-failed {
          color: #9e1c35;
          background: #ffe4ea;
          border-color: #f2b3c2;
        }

        .finance-value {
          margin-top: 6px;
          color: #1a202b;
          font-size: 22px;
          line-height: 1.2;
          font-weight: 800;
        }

        .finance-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .finance-mini-item {
          border: 1px solid #d7e2ef;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.86);
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .finance-mini-item.full {
          grid-column: 1 / -1;
        }

        .finance-mini-item span {
          color: #607087;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .finance-mini-item strong {
          color: #1b324f;
          font-size: 12px;
          font-weight: 800;
        }

        .finance-amount-panel {
          border: 1px solid #d8e2ef;
          border-radius: 12px;
          background: #ffffff;
          padding: 10px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .finance-amount-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #4b5e78;
          font-size: 13px;
          padding: 5px 0;
        }

        .finance-amount-row strong {
          color: #1b2e45;
          font-weight: 800;
        }

        .finance-amount-row.discount {
          color: #166534;
        }

        .finance-amount-row.total {
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px dashed #d4af37;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 11px;
          font-weight: 700;
        }

        .finance-amount-row.total strong {
          text-transform: none;
          letter-spacing: normal;
          font-size: 30px;
          background: linear-gradient(135deg, #d4af37, #b8860b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .timeline-luxe-shell {
          background: linear-gradient(150deg, #f9fbff, #f4f7fc);
          border: 1px solid #d8e1ee;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }

        .timeline-head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .timeline-main-title {
          color: #111;
          font-size: 17px;
          letter-spacing: 0.5px;
          font-weight: 800;
        }

        .timeline-head-meta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .timeline-live-chip,
        .timeline-count-chip {
          border-radius: 999px;
          min-height: 28px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          display: inline-flex;
          align-items: center;
        }

        .timeline-live-chip.on {
          background: #d7f7e6;
          color: #106a3a;
          border: 1px solid #98dfbb;
        }

        .timeline-live-chip.off {
          background: #ffe3e7;
          color: #9d1e37;
          border: 1px solid #f1b3bf;
        }

        .timeline-count-chip {
          background: #edf3fb;
          color: #24466d;
          border: 1px solid #c9d9ee;
        }

        .timeline-track-wrap {
          position: relative;
          padding-left: 20px;
        }

        .timeline-event-card {
          position: relative;
          margin-bottom: 20px;
          border: 1px solid #dbe4f1;
          border-radius: 12px;
          background: #fff;
          padding: 10px 12px;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .timeline-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.09);
        }

        .timeline-event-card.active {
          border-color: #d4af37;
          box-shadow: 0 10px 22px rgba(212, 175, 55, 0.16);
        }

        .timeline-dot {
          position: absolute;
          left: -28px;
          top: 12px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 3px solid white;
        }

        .timeline-line {
          position: absolute;
          left: -23px;
          top: 24px;
          width: 2px;
          height: calc(100% + 8px);
          background: #e3e8f0;
        }

        .timeline-event-content {
          min-width: 0;
        }

        .timeline-event-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .timeline-step-name {
          color: #111;
          font-size: 14px;
          font-weight: 800;
        }

        .timeline-step-state {
          border-radius: 999px;
          min-height: 24px;
          padding: 0 9px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
        }

        .timeline-step-state.done {
          background: #e4f3ff;
          color: #1f5f95;
          border: 1px solid #b9d6f2;
        }

        .timeline-step-state.wait {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #d8e0ea;
        }

        .timeline-step-text {
          color: #677588;
          font-size: 12px;
          line-height: 1.45;
        }

        .timeline-info-chip {
          border-radius: 9px;
          padding: 8px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.35;
        }

        .timeline-info-chip.delivery {
          background: #e0f2fe;
          color: #0c4a6e;
          border: 1px solid #93c5fd;
        }

        .timeline-info-chip.admin {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        .timeline-time-row {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #6b7280;
          font-size: 11px;
          border-top: 1px dashed #e1e7ef;
          padding-top: 7px;
        }

        .delivery-luxe-card {
          border: 1.5px solid #d4af37;
          box-shadow: 0 12px 30px rgba(212, 175, 55, 0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.55);
        }

        .delivery-luxe-card.delivered {
          border-color: #1f8f54;
          background: linear-gradient(135deg, #f0fbf4, #e7f8ef);
          box-shadow: 0 14px 34px rgba(31, 143, 84, 0.16);
        }

        .delivery-icon {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          margin-right: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          background: linear-gradient(135deg, #f9eed0, #f4dfac);
          box-shadow: inset 0 0 0 1px rgba(180, 136, 11, 0.2);
          flex-shrink: 0;
        }

        .delivery-luxe-card.delivered .delivery-icon {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          box-shadow: inset 0 0 0 1px rgba(31, 143, 84, 0.25);
        }

        .delivery-kicker {
          color: #7b652d;
          font-size: 11px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 3px;
          font-weight: 700;
        }

        .delivery-luxe-card.delivered .delivery-kicker {
          color: #1d7e4a;
        }

        .delivery-headline {
          font-size: 20px;
          line-height: 1.35;
          color: #5f4b1b;
          font-weight: 800;
        }

        .delivery-luxe-card.delivered .delivery-headline {
          color: #14532d;
          font-size: 22px;
        }

        .delivery-copy {
          font-size: 13px;
          color: #36534a;
          line-height: 1.45;
          max-width: 560px;
        }

        .delivery-time {
          font-size: 15px;
          color: #8b7355;
          margin-left: 8px;
        }

        .delivery-meta {
          font-size: 12px;
          color: #8b7355;
          margin-top: 6px;
        }

        .all-items-luxe {
          background: linear-gradient(145deg, #f9fbff, #f6f8fc) !important;
          border: 1px solid #d9e2ee !important;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
        }

        .items-count-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          background: linear-gradient(120deg, #0f4f89, #238d81);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        .order-items-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .order-item-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: 13px;
          background: #fff;
          border: 1px solid #dbe5f2;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .order-item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
        }

        .order-item-image-wrap {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #cbd5e1;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          flex-shrink: 0;
        }

        .order-item-image-wrap.no-image {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
        }

        .order-item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .order-item-content {
          min-width: 0;
          flex: 1;
        }

        .order-item-name {
          margin: 0;
          color: #111;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .order-item-description {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.35;
        }

        .order-item-meta {
          margin: 5px 0 0;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
        }

        .order-item-line-total {
          margin: 3px 0 0;
          color: #14532d;
          font-size: 12px;
          font-weight: 700;
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

          .tracking-main-card {
            border-radius: 20px !important;
          }

          .delivery-icon {
            width: 46px;
            height: 46px;
            font-size: 22px;
            margin-right: 10px;
          }

          .delivery-headline {
            font-size: 17px;
          }

          .delivery-luxe-card.delivered .delivery-headline {
            font-size: 18px;
          }

          .order-items-grid {
            grid-template-columns: 1fr;
          }

          .order-item-image-wrap {
            width: 60px;
            height: 60px;
          }

          .finance-mini-grid {
            grid-template-columns: 1fr;
          }

          .finance-amount-row.total strong {
            font-size: 24px;
          }

          .timeline-track-wrap {
            padding-left: 16px;
          }

          .timeline-dot {
            left: -22px;
            top: 14px;
          }

          .timeline-line {
            left: -17px;
          }

          .timeline-time-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 3px;
          }

          .timeline-event-card {
            padding: 9px 10px;
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
