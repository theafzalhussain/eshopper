import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { motion } from 'framer-motion'
import { datadogRum } from '@datadog/browser-rum'
import { BASE_URL } from '../constants'
import { ChevronRight } from 'lucide-react'

const STEPS = ['Ordered', 'Packed', 'Shipped', 'Delivered']
const STATUS_COLOR = {
  Ordered: '#0ea5e9',       // blue-500
  Packed: '#f59e0b',        // amber-500
  Shipped: '#ca8a04',       // text-yellow-600 (amber-700)
  Delivered: '#16a34a'      // green-600
}

const STATUS_ICON = {
  Ordered: '📦',
  Packed: '📋',
  Shipped: '🚚',
  Delivered: '✅'
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

  const activeIndex = useMemo(() => Math.max(0, STEPS.indexOf(status)), [status])
  const progressPercent = useMemo(() => (activeIndex / (STEPS.length - 1)) * 100, [activeIndex])

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
        setStatus(data?.orderStatus || 'Ordered')
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
        if (payload?.orderId === orderId && STEPS.includes(payload?.status)) {
          if (mounted) {
            setStatus(payload.status)
            datadogRum.addAction('orderStatusUpdated', {
              orderId,
              newStatus: payload.status,
              timestamp: payload.updatedAt
            })
            console.log('🔄 Status updated to:', payload.status)
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
          style={{ border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
        >
          {/* ORDER INFO */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: '2px solid #f0f0f0' }}>
            <div>
              <p className="text-muted small mb-1">Order ID</p>
              <p className="font-weight-bold" style={{ fontSize: '16px', color: '#111' }}>{orderId}</p>
            </div>
            <div className="text-right">
              <div
                className="px-3 py-2 rounded-pill text-white font-weight-bold"
                style={{
                  background: socketConnected ? '#10b981' : '#ef4444',
                  fontSize: '12px',
                  boxShadow: socketConnected ? '0 0 10px rgba(16,185,129,0.3)' : 'none'
                }}
              >
                {socketConnected ? '🟢 Live Connected' : '🔴 Connecting...'}
              </div>
            </div>
          </div>

          {/* PROGRESS BAR WITH ANIMATION */}
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
                background: `linear-gradient(90deg, ${STATUS_COLOR.Ordered}, ${STATUS_COLOR.Packed}, ${STATUS_COLOR.Shipped}, ${STATUS_COLOR.Delivered})`,
                position: 'absolute',
                top: 0,
                left: 0,
                boxShadow: `0 0 20px ${STATUS_COLOR[status]}66`
              }}
            />
          </div>

          {/* STEPPER STEPS */}
          <div className="d-flex justify-content-between mt-4">
            {STEPS.map((s, i) => {
              const isActive = i === activeIndex
              const isDone = i <= activeIndex
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

                  {/* Step circle with pulse effect */}
                  <motion.div
                    animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={isActive ? { repeat: Infinity, duration: 1.8, type: 'spring' } : {}}
                    style={{
                      margin: '0 auto',
                      position: 'relative',
                      zIndex: 2 }}
                  >
                    {/* Outer pulse ring (only for active) */}
                    {isActive && (
                      <motion.div
                        animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{
                          position: 'absolute',
                          inset: -8,
                          borderRadius: '50%',
                          border: `2px solid ${STATUS_COLOR[s]}`,
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    )}

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
                        fontSize: '20px',
                        boxShadow: isActive ? `0 8px 25px ${STATUS_COLOR[s]}33` : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {isDone ? STATUS_ICON[s] : '○'}
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
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Active</div>
                  )}
                </div>
              )
            })}
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
              {STATUS_ICON[status]} {status}
            </h3>
            <p className="small text-muted mb-0">
              {status === 'Ordered' && '✅ Your order has been placed successfully'}
              {status === 'Packed' && '📦 Your order is being packed with care'}
              {status === 'Shipped' && '🚚 Your order is on its way to you'}
              {status === 'Delivered' && '🎉 Your order has been delivered! Thank you for shopping with us'}
            </p>
          </motion.div>

          {/* ORDER AMOUNT */}
          {order?.finalAmount && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-muted small mb-1">Order Amount</p>
              <p className="font-weight-bold" style={{ fontSize: '18px', color: '#111' }}>
                ₹ {order.finalAmount.toLocaleString('en-IN')}
              </p>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="mt-5 d-flex gap-2">
            <button
              className="btn btn-dark rounded-pill px-4 flex-grow-1"
              onClick={() => navigate('/profile')}
              style={{ fontWeight: '600', fontSize: '14px' }}
            >
              ← Back to Profile
            </button>
            <button
              className="btn btn-outline-dark rounded-pill px-4"
              onClick={() => window.location.reload()}
              style={{ fontWeight: '600', fontSize: '14px' }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* FOOTER NOTE */}
          <p className="text-center text-muted small mt-4 mb-0" style={{ fontSize: '12px' }}>
            Updates are live. Last known update: {order?.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'Fetching...'}
          </p>
        </motion.div>
      </div>

      {/* Mobile-friendly CSS */}
      <style>{`
        @media (max-width: 576px) {
          .container {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .p-md-5 {
            padding: 1.5rem !important;
          }
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
