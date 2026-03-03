import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { motion } from 'framer-motion'
import { datadogRum } from '@datadog/browser-rum'
import confetti from 'canvas-confetti'
import { BASE_URL } from '../constants'
import { Package, Archive, Truck, BadgeCheck } from 'lucide-react'

const STEPS = ['Ordered', 'Packed', 'Shipped', 'Delivered']
const STATUS_COLOR = {
  Ordered: '#8b6c2f',
  Packed: '#b48b2a',
  Shipped: '#d1a84a',
  Delivered: '#1f8f54'
}

const STATUS_ICON = {
  Ordered: Package,
  Packed: Archive,
  Shipped: Truck,
  Delivered: BadgeCheck
}

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase()
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
  if (raw === 'packed') return 'Packed'
  if (raw === 'shipped') return 'Shipped'
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
  const [toast, setToast] = useState(null)
  const [didCelebrate, setDidCelebrate] = useState(false)
  const [statusTimeline, setStatusTimeline] = useState([])
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  const activeIndex = useMemo(() => Math.max(0, STEPS.indexOf(status)), [status])
  const progressPercent = useMemo(() => (activeIndex / (STEPS.length - 1)) * 100, [activeIndex])

  const viewInvoiceInline = () => {
    if (!orderId || !userId) return
    const invoiceUrl = `${BASE_URL}/api/order/${encodeURIComponent(orderId)}/invoice?userId=${encodeURIComponent(userId)}&disposition=inline`
    const opened = window.open(invoiceUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      setToast({
        id: Date.now(),
        title: '⚠️ Popup Blocked',
        message: 'Please allow popups to view invoice in browser.'
      })
    }
  }

  const downloadInvoice = async () => {
    if (!orderId || !userId) return
    try {
      setDownloadingInvoice(true)
      const response = await axios.get(`${BASE_URL}/api/order/${orderId}/invoice?userId=${userId}`, {
        responseType: 'arraybuffer',
        timeout: 30000
      })

      const contentType = String(response.headers?.['content-type'] || '').toLowerCase()
      const bytes = new Uint8Array(response.data)
      const header = String.fromCharCode(...bytes.slice(0, 4))
      const isPdf = contentType.includes('application/pdf') && header === '%PDF'

      if (!isPdf) {
        let errorMessage = 'Unable to generate invoice right now'
        try {
          const text = new TextDecoder('utf-8').decode(bytes)
          const parsed = JSON.parse(text)
          errorMessage = parsed?.message || errorMessage
        } catch (_) {
          errorMessage = 'Invoice response invalid. Please try again.'
        }
        setToast({
          id: Date.now(),
          title: '❌ Download Failed',
          message: errorMessage
        })
        return
      }

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)

      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (!previewWindow) {
        console.warn('Popup blocked while opening invoice preview')
      }

      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => window.URL.revokeObjectURL(url), 45000)
      setToast({
        id: Date.now(),
        title: '✅ Invoice Ready',
        message: 'Invoice downloaded and opened in new tab.'
      })
    } catch (e) {
      setToast({
        id: Date.now(),
        title: '❌ Download Failed',
        message: e?.response?.data?.message || 'Unable to download invoice right now'
      })
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const showStatusToast = (nextStatus) => {
    const statusText = normalizeStatus(nextStatus)
    const messages = {
      Ordered: '✅ Order Confirmed - Processing started',
      Packed: '📦 Luxe Parcel Ready - Beautiful packaging in progress',
      Shipped: '🚚 White-Glove Delivery - On its divine journey',
      Delivered: '🎉 Luxury Experience Complete - Thank you!'
    }

    setToast({
      id: Date.now(),
      title: '📨 Status Updated',
      message: messages[nextStatus] || `Status: ${statusText}`
    })

    // 🔴 DATADOG RUM CONVERSION TRACKING
    datadogRum.addAction('orderStatusUpdate', {
      orderId,
      userId,
      newStatus: statusText,
      message: messages[nextStatus],
      timestamp: new Date().toISOString(),
      orderAmount: order?.finalAmount || 0
    })

    console.log(`📊 Datadog tracked: ${nextStatus}`)
  }

  // 🔴 DATADOG CONTEXT - Track order tracking page visit
  useEffect(() => {
    datadogRum.setGlobalContextProperty('orderTracking', true)
    datadogRum.setGlobalContextProperty('orderId', orderId || '')
    datadogRum.setGlobalContextProperty('userId', userId || '')
    datadogRum.addAction('orderTrackingPageLoad', { orderId, userId })

    return () => {
      datadogRum.removeGlobalContextProperty('orderTracking')
      datadogRum.removeGlobalContextProperty('orderId')
      datadogRum.removeGlobalContextProperty('userId')
    }
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
        datadogRum.addError(new Error(errorMsg), { orderId })
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
          datadogRum.addAction('socketConnected', { userId })
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
            setOrder((prev) => ({ ...(prev || {}), updatedAt: payload.updatedAt || new Date().toISOString() }))
            
            // Add to timeline
            setStatusTimeline((prev) => [
              ...prev,
              {
                status: nextStatus,
                timestamp: payload.updatedAt || new Date().toISOString()
              }
            ])
            
            datadogRum.addAction('orderStatusUpdated', {
              orderId,
              newStatus: nextStatus,
              timestamp: payload.updatedAt
            })
            console.log('🔄 Status updated to:', nextStatus)
          }
        }
      })

      socketRef.on('error', (error) => {
        console.error('❌ Socket error:', error)
        datadogRum.addError(new Error(error), { orderId })
      })
    }

    init()

    return () => {
      mounted = false
      if (socketRef) socketRef.disconnect()
    }
  }, [orderId, userId])

  useEffect(() => {
    if (!toast?.id) return undefined
    const timeout = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (status !== 'Delivered' || didCelebrate) return

    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.7 },
      colors: ['#f5deb3', '#d4af37', '#111111', '#ffffff']
    })

    datadogRum.addAction('orderDeliveredConversion', {
      orderId,
      userId,
      deliveredAt: new Date().toISOString(),
      orderAmount: Number(order?.finalAmount || 0)
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
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16, x: 18 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -10, x: 20 }}
          className="position-fixed"
          style={{
            top: 24,
            right: 20,
            zIndex: 1000,
            minWidth: 260,
            background: '#111111',
            border: '1px solid #d4af37',
            color: '#f8e8c7',
            borderRadius: 14,
            boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
            padding: '12px 14px'
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: '.9px', textTransform: 'uppercase', color: '#d4af37', fontWeight: 700 }}>
            {toast.title}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#f4eee0' }}>{toast.message}</div>
        </motion.div>
      )}

      <div className="container" style={{ maxWidth: 900 }}>
        {/* HEADER */}
        <div className="mb-5 text-center">
          <h1 className="font-weight-bold mb-2" style={{ fontSize: '32px', letterSpacing: '.5px', color: '#111' }}>
            ✨ Boutique Luxe Order Tracking
          </h1>
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
          style={{ border: '1px solid #f1e8d1', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
        >
          {/* ORDER INFO - PREMIUM LAYOUT */}
          <div className="p-4 rounded-xl mb-4" style={{ background: '#f9f9f7', border: '1px solid #f0e8d8' }}>
            <div className="row">
              <div className="col-md-6 mb-3 mb-md-0">
                <p className="text-muted small mb-1">Order ID</p>
                <p className="font-weight-bold" style={{ fontSize: '18px', color: '#111' }}>
                  {orderId}
                </p>
              </div>
              <div className="col-md-6 text-md-right">
                {order?.finalAmount && (
                  <div>
                    <p className="text-muted small mb-1">Total Amount</p>
                    <p className="font-weight-bold" style={{ fontSize: '18px', background: 'linear-gradient(135deg, #d4af37, #b8860b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      ₹{Number(order.finalAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ESTIMATED DELIVERY */}
          {order?.estimatedDelivery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl mb-4"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #fbbf24' }}
            >
              <div className="d-flex align-items-center">
                <div style={{ fontSize: '32px', marginRight: '16px' }}>📅</div>
                <div>
                  <p className="text-muted small mb-1" style={{ color: '#92400e' }}>Expected Delivery</p>
                  <p className="font-weight-bold mb-0" style={{ fontSize: '18px', color: '#78350f' }}>
                    {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {order?.shippingAddress?.city && (
                    <p style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
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
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.7, 0.3, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: '-8px',
                    background: '#10b981',
                    borderRadius: '9999px',
                    zIndex: 0
                  }}
                />
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
          {order?.products && order.products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 p-3 rounded-lg"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <p className="small text-muted mb-2">Ordered Item</p>
              <div className="d-flex align-items-center">
                {order.products[0]?.image ? (
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    marginRight: '12px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#fff',
                    border: '1px solid #ddd'
                  }}>
                    <img 
                      src={order.products[0].image} 
                      alt={order.products[0].title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    width: '60px', 
                    height: '60px',
                    marginRight: '12px',
                    borderRadius: '8px',
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    📦
                  </div>
                )}
                <div className="flex-grow-1">
                  <p className="font-weight-bold small mb-1" style={{ color: '#111', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.products[0]?.title || 'Order Item'}
                  </p>
                  <p className="small text-muted mb-0">
                    ₹{Number(order.products[0]?.price || 0).toLocaleString('en-IN')} 
                    {order.products[0]?.quantity && ` × ${order.products[0].quantity}`}
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

          {/* STATUS TIMELINE */}
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
              {statusTimeline.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  style={{ marginBottom: idx < statusTimeline.length - 1 ? '20px' : 0, position: 'relative' }}
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
                      background: STATUS_COLOR[event.status] || '#d1a84a',
                      border: '3px solid white',
                      boxShadow: `0 0 0 2px ${STATUS_COLOR[event.status] || '#d1a84a'}33`
                    }}
                  />
                  {/* Timeline line */}
                  {idx < statusTimeline.length - 1 && (
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
                      {event.status}
                    </p>
                    <p className="text-muted small mb-0" style={{ fontSize: '12px' }}>
                      {new Date(event.timestamp).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ACTION BUTTONS */}
          <div className="mt-5">
            <div className="row">
              <div className="col-md-6 mb-3">
                <button
                  className="btn btn-dark rounded-pill px-4 btn-block"
                  onClick={() => navigate('/profile')}
                  style={{ fontWeight: '600', fontSize: '14px', padding: '12px 20px' }}
                >
                  ← Back to My Orders
                </button>
              </div>
              <div className="col-md-6 mb-3">
                <button
                  className="btn btn-outline-dark rounded-pill px-4 btn-block"
                  onClick={() => window.location.reload()}
                  style={{ fontWeight: '600', fontSize: '14px', padding: '12px 20px' }}
                >
                  🔄 Refresh Status
                </button>
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="row mt-2">
              <div className="col-md-4 mb-3">
                <button
                  className="btn btn-outline-warning rounded-pill px-4 btn-block"
                  onClick={downloadInvoice}
                  disabled={downloadingInvoice}
                  style={{ 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    padding: '12px 20px',
                    borderColor: '#d1a84a',
                    color: '#7d6122'
                  }}
                >
                  {downloadingInvoice ? '⏳ Preparing...' : '📄 Download Invoice'}
                </button>
              </div>
              <div className="col-md-4 mb-3">
                <button
                  className="btn btn-outline-dark rounded-pill px-4 btn-block"
                  onClick={viewInvoiceInline}
                  style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    padding: '12px 20px'
                  }}
                >
                  👁 View Invoice
                </button>
              </div>
              <div className="col-md-4">
                <button
                  className="btn rounded-pill px-4 btn-block"
                  onClick={() => window.open('https://wa.me/918447859784', '_blank')}
                  style={{ 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    padding: '12px 20px',
                    background: '#25D366',
                    color: 'white',
                    border: 'none'
                  }}
                  title="Chat with our Luxe Concierge"
                >
                  💬 Chat Support
                </button>
              </div>
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
