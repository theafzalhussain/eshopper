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
    <div className="tracking-luxe-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #1f1f1f 50%, #252525 75%, #1a1a1a 100%)', padding: '100px 16px 40px', position: 'relative', overflow: 'hidden' }}>
      {/* Premium animated background effect */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.05) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
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

      <div className="container" style={{ maxWidth: 900, position: 'relative', zIndex: 10 }}>
        {/* LUXURY HEADER */}
        <div className="mb-5 text-center premium-header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-weight-bold mb-2 luxury-title"
            style={{ fontSize: '40px', letterSpacing: '1.2px', color: '#d4af37', textShadow: '0 2px 20px rgba(212,175,55,0.3)', fontFamily: '"Playfair Display", serif' }}
          >
            ✨ BOUTIQUE LUXE
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{ height: '3px', width: '120px', background: 'linear-gradient(90deg, #d4af37, rgba(212,175,55,0.3))', margin: '12px auto 16px' }}
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-1"
            style={{ color: '#f8e8c7', fontWeight: 700, fontSize: '18px', letterSpacing: '0.3px' }}
          >
            Order Tracking #{orderId}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ color: '#b8a586', fontSize: '15px', letterSpacing: '0.5px' }}
          >
            Premium Real-Time Delivery Experience
          </motion.p>
        </div>

        {/* MAIN CARD - ULTRA PREMIUM DARK THEME */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-4 p-md-5 shadow-lg rounded-3xl bg-white tracking-main-card premium-card"
          style={{
            border: '2px solid #d4af37',
            boxShadow: '0 40px 80px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(35,35,40,0.95) 0%, rgba(40,40,50,0.98) 50%, rgba(35,35,40,0.95) 100%)',
            position: 'relative',
            color: '#f8e8c7'
          }}
        >
          {/* ORDER INFO - ULTRA PREMIUM DARK LAYOUT */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl mb-4 order-finance-luxe-card"
            style={{
              background: 'linear-gradient(135deg, rgba(60,60,70,0.8) 0%, rgba(55,55,65,0.8) 100%)',
              border: '1.5px solid #d4af37',
              boxShadow: '0 20px 50px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            <div className="row">
              <div className="col-md-7 mb-3 mb-md-0">
                <div className="d-flex flex-column payment-core-wrap">
                  <div className="finance-block">
                    <p className="finance-kicker" style={{ color: '#d4af37' }}>Payment Status</p>
                    <span className={`payment-status-chip status-${String(paymentStatusLabel).toLowerCase()}`}>
                      <span className="chip-dot" />
                      {paymentStatusLabel === 'Paid' ? 'Paid' : paymentStatusLabel === 'Pending' ? 'Pending' : paymentStatusLabel}
                    </span>
                  </div>

                  <div className="finance-block mt-3">
                    <p className="finance-kicker" style={{ color: '#d4af37' }}>Payment Method</p>
                    <p className="finance-method-value mb-0" style={{ color: '#d4af37', fontSize: '28px' }}>{order?.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-5 text-md-right">
                <div className="d-flex flex-column align-items-md-end finance-amount-panel" style={{ background: 'rgba(70,70,80,0.6)', border: '1.5px solid #d4af37', boxShadow: '0 12px 30px rgba(212,175,55,0.15)' }}>
                  <div className="finance-amount-row" style={{ color: '#b8a586' }}>
                    <span>Subtotal</span>
                    <strong style={{ color: '#f8e8c7' }}>{formatMoney(subtotalAmount)}</strong>
                  </div>
                  <div className="finance-amount-row" style={{ color: '#b8a586' }}>
                    <span>Shipping</span>
                    <strong style={{ color: '#f8e8c7' }}>{formatMoney(shippingAmount)}</strong>
                  </div>
                  {discountAmount > 0 && (
                    <div className="finance-amount-row discount" style={{ color: '#1f8f54' }}>
                      <span>Coupon Discount</span>
                      <strong style={{ color: '#4ade80' }}>- {formatMoney(discountAmount)}</strong>
                    </div>
                  )}
                  <div className="finance-amount-row total" style={{ borderTopColor: '#d4af3766' }}>
                    <span style={{ color: '#b8a586' }}>Total Amount</span>
                    <strong style={{ background: 'linear-gradient(135deg, #d4af37, #f5e6b3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{formatMoney(finalAmount)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* DELIVERY SECTION - EXPECTED OR DELIVERED PREMIUM MESSAGE */}
          {status === 'Delivered' ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="p-4 rounded-xl mb-4 delivery-luxe-card delivered"
              style={{ background: 'linear-gradient(135deg, rgba(31,143,84,0.2), rgba(31,143,84,0.1))', border: '1.5px solid #1f8f54', boxShadow: '0 20px 50px rgba(31,143,84,0.2)' }}
            >
              <div className="d-flex align-items-start align-items-md-center">
                <div className="delivery-icon" style={{ background: 'linear-gradient(135deg, rgba(31,143,84,0.3), rgba(79,233,136,0.2))', boxShadow: 'inset 0 0 0 1px rgba(31,143,84,0.5)' }}>✅</div>
                <div>
                  <p className="delivery-kicker" style={{ color: '#4ade80' }}>Delivery Completed</p>
                  <p className="delivery-headline mb-1" style={{ color: '#4ade80', fontSize: '24px' }}>
                    Your order has been successfully delivered.
                  </p>
                  <p className="delivery-copy mb-1" style={{ color: '#b8a586' }}>
                    Thank you for shopping with Boutique Luxe. We hope your premium experience was exceptional.
                  </p>
                  <p className="delivery-meta mb-0" style={{ color: '#8b7355' }}>
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
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="p-4 rounded-xl mb-4 delivery-luxe-card expected"
              style={{ background: 'linear-gradient(135deg, rgba(30,58,137,0.2), rgba(30,64,175,0.1))', border: '1.5px solid #3b82f6', boxShadow: '0 20px 50px rgba(59,130,246,0.2)' }}
            >
              <div className="d-flex align-items-center">
                <div className="delivery-icon" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(96,165,250,0.2))', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.5)' }}>📅</div>
                <div>
                  <p className="delivery-kicker" style={{ color: '#60a5fa' }}>Expected Delivery</p>
                  <p className="delivery-headline mb-0" style={{ color: '#60a5fa' }}>
                    {formatDeliveryDate(getDeliveryInfo.date)}
                    {getDeliveryInfo.time && (
                      <span className="delivery-time"> at {getDeliveryInfo.time}</span>
                    )}
                  </p>
                  <p className="delivery-meta mb-0" style={{ color: '#8b7355' }}>
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
              transition={{ delay: 0.2 }}
              className="mb-4 p-4 rounded-lg all-items-luxe"
              style={{ background: 'rgba(60,60,70,0.5)', border: '1.5px solid #d4af37', boxShadow: '0 12px 30px rgba(212,175,55,0.15)' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap" style={{ gap: '8px' }}>
                <p className="small mb-0" style={{ letterSpacing: '0.4px', color: '#d4af37', fontWeight: 700 }}>📦 Ordered Items</p>
                <span className="items-count-pill">{totalItemCount} items</span>
              </div>

              <div className="order-items-grid">
                {orderItemsDetailed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ staggerChildren: 0.05 }}
                    className="order-item-card"
                    style={{ background: 'rgba(80,80,90,0.7)', border: '1px solid #d4af3744', color: '#f8e8c7' }}
                  >
                    {item.image ? (
                      <div className="order-item-image-wrap">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="order-item-image"
                        />
                      </div>
                    ) : (
                      <div className="order-item-image-wrap no-image" style={{ background: '#555' }}>No Image</div>
                    )}
                    <div className="order-item-content">
                      <p className="order-item-name" style={{ color: '#f8e8c7' }}>{item.name}</p>
                      {item.description ? (
                        <p className="order-item-description" style={{ color: '#b8a586' }}>{item.description}</p>
                      ) : null}
                      <p className="order-item-meta" style={{ color: '#8b7355' }}>
                        Qty {item.quantity} × {formatMoney(item.unitPrice)}
                      </p>
                      <p className="order-item-line-total" style={{ color: '#d4af37' }}>Line Total: {formatMoney(item.lineTotal)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          <div style={{ position: 'relative', margin: '50px 0 30px' }}>
            {/* Background bar */}
            <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />

            {/* Animated progress bar - PREMIUM GRADIENT */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 15, delay: 0.2 }}
              style={{
                height: 12,
                borderRadius: 99,
                background: `linear-gradient(90deg, #d4af37, #f5e6b3, #1f8f54, #4ade80)`,
                position: 'absolute',
                top: 0,
                left: 0,
                boxShadow: `0 0 30px #d4af37aa, 0 0 60px #d4af3755`,
              }}
            />
          </div>

          {/* STEPPER STEPS - GOLD ACCENTS */}
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
                        top: 22,
                        left: '50%',
                        width: '50%',
                        height: 2,
                        background: i < activeIndex ? STATUS_COLOR[s] : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.6s ease',
                        boxShadow: i < activeIndex ? `0 0 10px ${STATUS_COLOR[s]}88` : 'none'
                      }}
                    />
                  )}

                  {/* Step circle */}
                  <motion.div
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{
                      margin: '0 auto',
                      position: 'relative',
                      zIndex: 2 }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: isDone ? `linear-gradient(135deg, ${STATUS_COLOR[s]}, ${STATUS_COLOR[s]}dd)` : 'rgba(255,255,255,0.05)',
                        border: `2.5px solid ${isDone ? STATUS_COLOR[s] : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDone ? '#fff' : '#b8a586',
                        boxShadow: isActive ? `0 0 30px ${STATUS_COLOR[s]}66, inset 0 1px 0 rgba(255,255,255,0.1)` : `0 0 0 1px rgba(255,255,255,0.05)`,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <StepIcon size={22} strokeWidth={2.5} />
                    </div>
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                    style={{
                      marginTop: 14,
                      fontSize: '12px',
                      fontWeight: isActive ? '800' : '600',
                      color: isDone ? STATUS_COLOR[s] : '#8b7355',
                      transition: 'color 0.4s ease',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {s}
                  </motion.div>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ fontSize: '9px', color: '#d4af37', marginTop: '3px', fontWeight: 700 }}
                    >
                      ◆ Current
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
          </div>

          {/* STATUS DISPLAY - PREMIUM DARK */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-5 p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${STATUS_COLOR[status]}15, ${STATUS_COLOR[status]}08)`,
              border: `2px solid ${STATUS_COLOR[status]}44`,
              textAlign: 'center',
              boxShadow: `0 12px 30px ${STATUS_COLOR[status]}22`
            }}
          >
            <p className="small mb-2" style={{ color: '#8b7355', letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>Current Status</p>
            <h3
              className="font-weight-bold mb-2"
              style={{ color: status === 'Shipped' ? '#ca8a04' : STATUS_COLOR[status], fontSize: '28px', letterSpacing: '0.5px' }}
            >
              {status}
            </h3>
            <p className="small mb-0" style={{ color: '#b8a586' }}>
              {status === 'Ordered' && '✅ Your order has been placed successfully'}
              {status === 'Packed' && '📦 Your order is being packed with care'}
              {status === 'Shipped' && '🚚 Your order is on its way to you'}
              {status === 'Delivered' && '🎉 Delivered! Thank you for choosing Boutique Luxe. Your premium order is complete.'}
            </p>
          </motion.div>

          {/* STATUS TIMELINE - ULTRA PREMIUM LUXURY WITH DETAILED UPDATES */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 p-5 rounded-2xl timeline-luxe-shell"
            style={{
              background: 'linear-gradient(135deg, rgba(50,50,60,0.7) 0%, rgba(45,45,55,0.7) 100%)',
              border: '2px solid #d4af37',
              boxShadow: '0 20px 60px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Premium header */}
            <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1.5px solid #d4af3744' }}>
              <h5 className="timeline-main-title mb-2" style={{ color: '#d4af37', fontSize: '20px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                📍 Journey Timeline
              </h5>
              <p style={{ color: '#8b7355', fontSize: '12px', margin: 0, letterSpacing: '0.3px' }}>
                Real-time tracking of your premium order
              </p>
            </div>

            <div className="timeline-track-wrap premium-timeline">
              {timelineSteps.map((event, idx) => {
                const timelineEvent = event.details
                const statusIcon = STATUS_ICON[event.step]
                const isCompleted = event.isReached && idx < activeIndex
                const isCurrent = idx === activeIndex

                return (
                  <motion.div
                    key={event.step}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.08 }}
                    className={`premium-timeline-event ${event.isReached ? 'reached' : 'pending'} ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    style={{
                      background: isCurrent ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))' : 'transparent',
                      borderRadius: '14px',
                      padding: isCurrent ? '16px' : '12px',
                      marginBottom: '20px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      {/* Timeline dot with premium styling */}
                      <div
                        style={{
                          position: 'relative',
                          flexShrink: 0,
                          width: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {/* Animated rings for current status */}
                        {isCurrent && (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.3, 0.8] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: `2px solid ${STATUS_COLOR[event.step]}`,
                              }}
                            />
                            <motion.div
                              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.1, 0.6] }}
                              transition={{ duration: 2.5, repeat: Infinity }}
                              style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: `1px solid ${STATUS_COLOR[event.step]}`,
                              }}
                            />
                          </>
                        )}

                        {/* Main dot */}
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: event.isReached
                              ? `linear-gradient(135deg, ${STATUS_COLOR[event.step]}, ${STATUS_COLOR[event.step]}cc)`
                              : 'rgba(255,255,255,0.08)',
                            border: `2.5px solid ${event.isReached ? STATUS_COLOR[event.step] : 'rgba(255,255,255,0.15)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: event.isReached ? '#fff' : '#b8a586',
                            boxShadow: isCurrent
                              ? `0 0 35px ${STATUS_COLOR[event.step]}88, inset 0 1px 0 rgba(255,255,255,0.2)`
                              : `0 0 0 1px rgba(255,255,255,0.08)`,
                            position: 'relative',
                            zIndex: 2,
                            fontSize: '20px'
                          }}
                        >
                          {statusIcon ? (
                            <statusIcon size={24} strokeWidth={2} />
                          ) : (
                            '✓'
                          )}
                        </div>

                        {/* Connector line to next event */}
                        {idx < timelineSteps.length - 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '2px',
                              height: '30px',
                              background: idx < activeIndex ? STATUS_COLOR[event.step] : 'rgba(255,255,255,0.08)',
                              zIndex: 0,
                              transition: 'background 0.5s ease'
                            }}
                          />
                        )}
                      </div>

                      {/* Event content */}
                      <div style={{ flex: 1, paddingTop: '6px' }}>
                        {/* Status name with badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <p
                            className="timeline-step-name"
                            style={{
                              color: '#d4af37',
                              fontSize: '16px',
                              fontWeight: 800,
                              margin: 0,
                              letterSpacing: '0.3px'
                            }}
                          >
                            {event.step}
                          </p>
                          {isCurrent && (
                            <motion.span
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              style={{
                                display: 'inline-block',
                                background: `linear-gradient(135deg, ${STATUS_COLOR[event.step]}, ${STATUS_COLOR[event.step]}dd)`,
                                color: '#fff',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              ◆ Current
                            </motion.span>
                          )}
                          {isCompleted && (
                            <span
                              style={{
                                display: 'inline-block',
                                background: 'rgba(74, 222, 128, 0.2)',
                                color: '#4ade80',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              ✓ Completed
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p
                          className="timeline-step-text"
                          style={{
                            color: '#b8a586',
                            fontSize: '13px',
                            margin: '8px 0',
                            lineHeight: '1.5'
                          }}
                        >
                          {STATUS_SUBTEXT[event.step]}
                        </p>

                        {/* Timestamp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', color: '#8b7355' }}>📅</span>
                          <p
                            className="timeline-event-time"
                            style={{
                              color: '#8b7355',
                              fontSize: '12px',
                              margin: 0,
                              fontWeight: 600,
                              letterSpacing: '0.2px'
                            }}
                          >
                            {formatDateTimeShort(event.timestamp)}
                          </p>
                        </div>

                        {/* Detailed info chips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Delivery schedule */}
                          {timelineEvent?.deliverySchedule && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="timeline-info-chip delivery"
                              style={{
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.1))',
                                border: '1.5px solid #3b82f6',
                                color: '#60a5fa',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                lineHeight: '1.5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span>🚚</span>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
                                  Delivery Window
                                </div>
                                <div>{formatDeliverySchedule(timelineEvent.deliverySchedule)}</div>
                              </div>
                            </motion.div>
                          )}

                          {/* Admin notes */}
                          {timelineEvent?.adminNote && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.55 }}
                              className="timeline-info-chip admin"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.1))',
                                border: '1.5px solid #f59e0b',
                                color: '#fbbf24',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                lineHeight: '1.5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span>💼</span>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
                                  Admin Update
                                </div>
                                <div>{timelineEvent.adminNote}</div>
                              </div>
                            </motion.div>
                          )}
                        </div>
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
                    boxShadow: '0 25px 50px rgba(212,175,55,0.4)'
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
                    background: 'linear-gradient(135deg, #d4af37, #f5e6b3)',
                    color: '#1a1a1a',
                    border: '1.5px solid #d4af37',
                    letterSpacing: '0.4px',
                    boxShadow: '0 12px 30px rgba(212,175,55,0.25)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    display: 'block',
                    fontWeight: 800
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
                  boxShadow: '0 20px 45px rgba(37,211,102,0.4)',
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
                  fontWeight: '800',
                  fontSize: '13px',
                  padding: '12px 20px',
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 10px 25px rgba(37,211,102,0.3)',
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
          <p className="text-center small mt-4 mb-0" style={{ fontSize: '12px', color: '#8b7355', letterSpacing: '0.3px' }}>
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
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #1f1f1f 50%, #252525 75%, #1a1a1a 100%);
        }

        .premium-header {
          animation: fadeInDown 0.8s ease;
        }

        .luxury-title {
          font-size: 40px !important;
          background: linear-gradient(135deg, #d4af37, #f5e6b3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .premium-card {
          border-radius: 28px !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-card:hover {
          box-shadow: 0 50px 100px rgba(212,175,55,0.35), 0 0 80px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }

        .order-finance-luxe-card {
          background: linear-gradient(135deg, rgba(60,60,70,0.7) 0%, rgba(55,55,65,0.7) 100%) !important;
          border: 1.5px solid #d4af37 !important;
          box-shadow: 0 20px 50px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.05) !important;
          transition: all 0.3s ease;
        }

        .order-finance-luxe-card:hover {
          box-shadow: 0 25px 60px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.08) !important;
        }

        .payment-core-wrap {
          height: 100%;
          justify-content: center;
          gap: 4px;
        }

        .finance-block {
          display: flex;
          flex-direction: column;
        }

        .finance-kicker {
          margin: 0;
          color: #d4af37;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .payment-status-chip {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          min-height: 34px;
          padding: 0 13px;
          font-size: 13px;
          font-weight: 800;
          width: fit-content;
          border: 1px solid;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.9;
        }

        .payment-status-chip.status-paid {
          color: #4ade80;
          background: rgba(31,143,84,0.2);
          border-color: #1f8f54;
        }

        .payment-status-chip.status-pending {
          color: #facc15;
          background: rgba(245,158,11,0.2);
          border-color: #f59e0b;
        }

        .payment-status-chip.status-failed {
          color: #ef4444;
          background: rgba(239,68,68,0.2);
          border-color: #dc2626;
        }

        .finance-method-value {
          margin-top: 6px;
          color: #d4af37 !important;
          font-size: 28px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.01em;
        }
          color: #1f2a37;
          font-size: 36px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.01em;
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
          border: 1px solid #ccd8e8;
          border-radius: 14px;
          background: #ffffff;
          padding: 12px;
          box-shadow: 0 8px 18px rgba(26, 43, 71, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .finance-amount-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #4b5e78;
          font-size: 14px;
          padding: 6px 0;
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
          padding-top: 10px;
          border-top: 1px dashed #d4af37;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 12px;
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
          background: rgba(60,60,70,0.5) !important;
          border: 1.5px solid #d4af37 !important;
          box-shadow: 0 12px 30px rgba(212,175,55,0.15) !important;
        }

        .timeline-main-title {
          color: #f8e8c7 !important;
          font-size: 18px !important;
          letter-spacing: 0.5px !important;
          font-weight: 800 !important;
        }

        .timeline-track-wrap {
          position: relative;
          padding-left: 20px;
        }

        .timeline-track-wrap::before {
          content: '';
          position: absolute;
          left: -17px;
          top: 10px;
          bottom: 10px;
          width: 2px;
          background: rgba(255,255,255,0.1);
          border-radius: 999px;
        }

        .timeline-event-card {
          position: relative;
          margin-bottom: 20px;
          border: none;
          border-radius: 0;
          background: transparent;
          padding: 2px 0 2px 6px;
          box-shadow: none;
          transition: none;
        }

        .timeline-event-card.active {
          background: linear-gradient(90deg, rgba(212, 175, 55, 0.12), transparent 75%);
        }

        .timeline-dot {
          position: absolute;
          left: -28px;
          top: 9px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 3px solid #2d2d35;
          background: #d4af37;
        }

        .timeline-line {
          position: absolute;
          left: -23px;
          top: 20px;
          width: 2px;
          height: calc(100% + 8px);
          background: rgba(255,255,255,0.08);
        }

        .timeline-step-name {
          color: #d4af37 !important;
          font-size: 14px !important;
          font-weight: 800 !important;
        }

        .timeline-step-text {
          color: #b8a586 !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
        }

        .timeline-info-chip {
          border-radius: 9px;
          padding: 8px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.35;
        }

        .timeline-event-time {
          margin-top: 8px;
          color: #8b7355;
          font-size: 11px;
          border-top: 1px dashed #d4af3744;
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
          background: linear-gradient(135deg, rgba(31,143,84,0.2), rgba(31,143,84,0.1));
          box-shadow: 0 14px 34px rgba(31,143,84,0.16);
        }

        .delivery-luxe-card.expected {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(30,58,137,0.2), rgba(30,64,175,0.1));
          box-shadow: 0 20px 50px rgba(59,130,246,0.2);
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
          background: linear-gradient(135deg, #d4af37, #f5e6b3);
          box-shadow: inset 0 0 0 1px rgba(180, 136, 11, 0.2);
          flex-shrink: 0;
        }

        .delivery-kicker {
          color: #d4af37;
          font-size: 11px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 3px;
          font-weight: 700;
        }

        .delivery-headline {
          font-size: 20px;
          line-height: 1.35;
          color: #d4af37;
          font-weight: 800;
        }

        .delivery-copy {
          font-size: 13px;
          color: #b8a586;
          line-height: 1.45;
          max-width: 560px;
        }

        .delivery-time {
          font-size: 15px;
          color: #d4af37;
          margin-left: 8px;
        }

        .delivery-meta {
          font-size: 12px;
          color: #8b7355;
          margin-top: 6px;
        }

        .all-items-luxe {
          background: rgba(60,60,70,0.5) !important;
          border: 1.5px solid #d4af37 !important;
          box-shadow: 0 12px 30px rgba(212,175,55,0.15) !important;
        }

        .items-count-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: linear-gradient(120deg, #d4af37, #f5e6b3);
          color: #1a1a1a;
          font-size: 12px;
          font-weight: 800;
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
          background: rgba(80,80,90,0.7);
          border: 1px solid #d4af3744;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .order-item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(212,175,55,0.15);
        }

        .order-item-image-wrap {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          overflow: hidden;
          background: #555;
          border: 1px solid #666;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          flex-shrink: 0;
        }

        .order-item-image-wrap.no-image {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #aaa;
          background: #555;
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
          color: #f8e8c7;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .order-item-description {
          margin: 5px 0 0;
          color: #b8a586;
          font-size: 12px;
          line-height: 1.35;
        }

        .order-item-meta {
          margin: 5px 0 0;
          color: #8b7355;
          font-size: 12px;
          font-weight: 600;
        }

        .order-item-line-total {
          margin: 3px 0 0;
          color: #d4af37;
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

          .finance-method-value {
            font-size: 30px;
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

          .timeline-track-wrap::before {
            left: -13px;
          }

          .timeline-event-card {
            padding: 9px 10px;
          }

          .timeline-event-time {
            font-size: 10px;
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
