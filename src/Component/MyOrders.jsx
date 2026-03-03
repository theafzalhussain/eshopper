import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { datadogRum } from '@datadog/browser-rum'
import { BASE_URL } from '../constants'
import { ArrowRight, ExternalLink, Clock3, PackageSearch, FileDown } from 'lucide-react'

const FILTERS = ['All', 'In Transit', 'Delivered']

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase()
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
  if (raw === 'packed') return 'Packed'
  if (raw === 'shipped') return 'Shipped'
  if (raw === 'delivered') return 'Delivered'
  return 'Ordered'
}

const getStatusStyles = (status) => {
  const s = normalizeStatus(status)
  if (s === 'Ordered') return { bg: '#e0f2fe', color: '#0ea5e9' }
  if (s === 'Packed') return { bg: '#fef3c7', color: '#f59e0b' }
  if (s === 'Shipped') return { bg: '#fef9c3', color: '#ca8a04' }
  return { bg: '#dcfce7', color: '#16a34a' }
}

export default function MyOrders() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('userid')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchOrderId, setSearchOrderId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [downloadingInvoice, setDownloadingInvoice] = useState('')

  const downloadInvoice = async (orderId) => {
    if (!orderId || !userId) return
    try {
      setDownloadingInvoice(orderId)
      const response = await axios.get(`${BASE_URL}/api/order/${orderId}/invoice?userId=${userId}`, {
        responseType: 'blob',
        timeout: 30000
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError('Unable to download invoice right now')
    } finally {
      setDownloadingInvoice('')
    }
  }

  useEffect(() => {
    datadogRum.setGlobalContextProperty('myOrdersPage', true)
    return () => datadogRum.removeGlobalContextProperty('myOrdersPage')
  }, [])

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
          <button className="btn btn-dark rounded-pill px-4 mt-2 mt-md-0" onClick={() => navigate('/profile')}>
            Back to Profile
          </button>
        </div>

        <div className="d-flex flex-wrap mb-4">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setActiveFilter(item)}
              className="btn rounded-pill mr-2 mb-2"
              style={{
                background: activeFilter === item ? '#111' : '#fff',
                color: activeFilter === item ? '#fff' : '#444',
                border: '1px solid #ddd',
                minWidth: 110
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* SEARCH BOX - Simple Clean Design */}
        <div className="p-3 p-md-4 bg-white rounded-xl shadow-sm mb-4" style={{ border: '1px solid #ededed' }}>
          <div className="row align-items-center">
            <div className="col-12 col-md-8 mb-2 mb-md-0">
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                className="form-control"
                placeholder="🔍 Search by Order ID"
                style={{ borderRadius: '8px', padding: '10px 14px' }}
              />
            </div>
            <div className="col-12 col-md-4 d-flex gap-2">
              {(searchOrderId || fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOrderId('')
                    setFromDate('')
                    setToDate('')
                  }}
                  className="btn btn-outline-secondary flex-grow-1"
                  style={{ fontSize: '13px' }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const allFilled = searchOrderId || fromDate || toDate
                  if (allFilled) {
                    setFromDate('')
                    setToDate('')
                  }
                }}
                className="btn btn-outline-dark flex-grow-1"
                style={{ fontSize: '13px' }}
                title="Show/Hide Advanced Filters"
              >
                {fromDate || toDate ? '📅 Clear Dates' : '⚙️ Filters'}
              </button>
            </div>
          </div>
          
          {/* Advanced Date Filters - Show only if needed */}
          {(fromDate || toDate) && (
            <div className="row mt-3">
              <div className="col-md-6 mb-2 mb-md-0">
                <label className="small text-muted mb-1" style={{ display: 'block' }}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="form-control"
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <div className="col-md-6">
                <label className="small text-muted mb-1" style={{ display: 'block' }}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="form-control"
                  style={{ borderRadius: '8px' }}
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-center bg-white rounded-xl shadow-sm text-muted">Loading orders...</div>
        ) : error ? (
          <div className="p-4 text-center bg-white rounded-xl shadow-sm text-danger">{error}</div>
        ) : filteredOrders.length ? (
          filteredOrders.map((item) => {
            const badge = getStatusStyles(item.orderStatus)
            const label = normalizeStatus(item.orderStatus)
            return (
              <motion.div
                key={item.orderId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 mb-3 bg-white rounded-lg shadow-sm"
                style={{ 
                  border: '1px solid #ededed',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {/* Header Row */}
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 pb-3" style={{ borderBottom: '1px dashed #eee' }}>
                  <div className="flex-grow-1">
                    <div className="font-weight-bold" style={{ fontSize: '16px', color: '#111' }}>
                      {item.orderId}
                    </div>
                    <div className="small text-muted mt-1 d-flex align-items-center">
                      <Clock3 size={13} className="mr-1" /> 
                      {new Date(item.updatedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <span 
                    className="px-3 py-2 rounded-pill font-weight-bold small" 
                    style={{ 
                      background: badge.bg, 
                      color: badge.color,
                      whiteSpace: 'nowrap',
                      marginLeft: '12px'
                    }}
                  >
                    {label}
                  </span>
                </div>

                {/* Details Row - Amount & Payment */}
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4" style={{ gap: '16px' }}>
                  <div>
                    <div className="small text-muted mb-1">Amount</div>
                    <div className="font-weight-bold" style={{ fontSize: '18px', color: '#111' }}>
                      ₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid #eee', paddingLeft: '16px' }}>
                    <div className="small text-muted mb-1">Payment Method</div>
                    <div className="font-weight-bold" style={{ fontSize: '14px', color: '#666' }}>
                      {item.paymentMethod || 'COD'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                    className="btn btn-dark btn-sm rounded-pill px-3 flex-grow-1"
                    style={{ minWidth: '140px' }}
                  >
                    🔍 Track Order
                  </button>
                  <button
                    onClick={() => downloadInvoice(item.orderId)}
                    disabled={downloadingInvoice === item.orderId}
                    className="btn btn-outline-warning btn-sm rounded-pill px-3"
                    style={{ 
                      borderColor: '#d1a84a', 
                      color: '#7d6122',
                      minWidth: '110px'
                    }}
                  >
                    {downloadingInvoice === item.orderId ? '⏳' : '📄'} Invoice
                  </button>
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
