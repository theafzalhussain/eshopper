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

        <div className="p-3 p-md-4 bg-white rounded-xl shadow-sm mb-4" style={{ border: '1px solid #ededed' }}>
          <div className="row">
            <div className="col-md-5 mb-2 mb-md-0">
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                className="form-control"
                placeholder="Search by Order ID"
              />
            </div>
            <div className="col-md-3 mb-2 mb-md-0">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-md-3 mb-2 mb-md-0">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-md-1 d-flex align-items-center">
              <button
                type="button"
                onClick={() => {
                  setSearchOrderId('')
                  setFromDate('')
                  setToDate('')
                }}
                className="btn btn-outline-secondary btn-block"
                title="Clear filters"
              >
                ✕
              </button>
            </div>
          </div>
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
                className="p-4 mb-3 bg-white rounded-xl shadow-sm"
                style={{ border: '1px solid #ededed' }}
              >
                <div className="d-flex flex-wrap align-items-center justify-content-between">
                  <div>
                    <div className="font-weight-bold" style={{ fontSize: 16 }}>{item.orderId}</div>
                    <div className="small text-muted mt-1 d-flex align-items-center">
                      <Clock3 size={13} className="mr-1" /> {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="px-3 py-2 rounded-pill font-weight-bold small mt-2 mt-md-0" style={{ background: badge.bg, color: badge.color }}>
                    {label}
                  </span>
                </div>

                <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px dashed #eee' }}>
                  <div className="small text-muted">
                    Amount: <span className="font-weight-bold text-dark">₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}</span>
                    <span className="mx-2">•</span>
                    Payment: <span className="font-weight-bold text-dark">{item.paymentMethod || 'COD'}</span>
                  </div>
                  <div className="d-flex mt-2 mt-md-0">
                    <button
                      onClick={() => downloadInvoice(item.orderId)}
                      disabled={downloadingInvoice === item.orderId}
                      className="btn btn-outline-warning btn-sm rounded-pill px-3 mr-2"
                      style={{ borderColor: '#d1a84a', color: '#7d6122' }}
                    >
                      {downloadingInvoice === item.orderId ? 'Preparing...' : 'Invoice'} <FileDown size={13} className="ml-1" />
                    </button>
                    <button
                      onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                      className="btn btn-dark btn-sm rounded-pill px-3 mr-2"
                    >
                      Track Now <ArrowRight size={14} className="ml-1" />
                    </button>
                    <button
                      onClick={() => window.open(`/order-tracking/${item.orderId}`, '_blank')}
                      className="btn btn-outline-dark btn-sm rounded-pill px-3"
                    >
                      Full Screen <ExternalLink size={13} className="ml-1" />
                    </button>
                  </div>
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
