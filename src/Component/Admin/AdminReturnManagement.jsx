import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, TrendingUp, Clock, CheckCircle2, X, MoreVertical,
  ChevronDown, Search, Filter, Calendar, MapPin, Truck, DollarSign,
  AlertCircle, Loader, Send, Edit, Eye
} from 'lucide-react'
import { BASE_URL } from '../../constants'
import { useToast } from '../ToastNotification'
import '../../styles/AdminReturnManagement.css'

const AdminReturnManagement = () => {
  const { showToast } = useToast()
  const [returns, setReturns] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState(null)
  const [actionData, setActionData] = useState({})
  const [adminSecret] = useState(localStorage.getItem('adminSecret') || process.env.REACT_APP_ADMIN_SECRET)

  const returnStatuses = [
    { value: 'all', label: '📋 All Returns', color: '#9A9490' },
    { value: 'REQUESTED', label: '📝 Requested', color: '#1A8C8C' },
    { value: 'APPROVED', label: '✅ Approved', color: '#16A34A' },
    { value: 'PICKED_UP', label: '🚚 Picked Up', color: '#F59E0B' },
    { value: 'IN_TRANSIT', label: '📦 In Transit', color: '#3B82F6' },
    { value: 'RECEIVED', label: '📥 Received', color: '#8B5CF6' },
    { value: 'REFUND_COMPLETED', label: '💰 Refunded', color: '#10B981' },
    { value: 'REJECTED', label: '❌ Rejected', color: '#DC2626' }
  ]

  // Fetch returns data
  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { orderId: searchQuery })
      })

      const response = await axios.get(
        `${BASE_URL}/api/admin/returns?${params}`,
        {
          headers: { 'x-admin-secret': adminSecret }
        }
      )

      if (response.data.success) {
        setReturns(response.data.returns)
      }
    } catch (error) {
      showToast('Failed to fetch returns', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, page, adminSecret, showToast])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/admin/returns/stats`,
        {
          headers: { 'x-admin-secret': adminSecret }
        }
      )

      if (response.data.success) {
        setStats(response.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [adminSecret])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Real-time updates: listen for return status changes via Socket.IO (forwarded through window event)
  useEffect(() => {
    const handleRealTimeUpdate = () => {
      fetchReturns()
      fetchStats()
    }
    window.addEventListener('admin:returnStatusUpdate', handleRealTimeUpdate)
    return () => window.removeEventListener('admin:returnStatusUpdate', handleRealTimeUpdate)
  }, [fetchReturns, fetchStats])

  // Handle return status update
  const handleUpdateStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/returns/${orderId}/status`,
        { status: newStatus, ...extraData },
        { headers: { 'x-admin-secret': adminSecret } }
      )

      if (response.data.success) {
        showToast(`Return status updated to ${newStatus}`, 'success')
        fetchReturns()
        fetchStats()
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error')
    }
  }

  // Handle mark as received
  const handleMarkReceived = async (orderId) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/admin/returns/${orderId}/mark-received`,
        { adminInspectionNotes: actionData.notes || '' },
        { headers: { 'x-admin-secret': adminSecret } }
      )

      if (response.data.success) {
        showToast('Item marked as received. Refund scheduled for 24 hours later.', 'success')
        fetchReturns()
        fetchStats()
        setShowActionModal(false)
        setActionData({})
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to mark as received', 'error')
    }
  }

  // Handle process refund
  const handleProcessRefund = async (orderId) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/admin/returns/${orderId}/refund`,
        { adminNotes: actionData.notes || '' },
        { headers: { 'x-admin-secret': adminSecret } }
      )

      if (response.data.success) {
        showToast('Refund processed successfully!', 'success')
        fetchReturns()
        fetchStats()
        setShowActionModal(false)
        setActionData({})
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to process refund', 'error')
    }
  }

  // Handle schedule pickup (APPROVED → PICKED_UP)
  const handleSchedulePickup = async (orderId) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/returns/${orderId}/status`,
        { 
          status: 'PICKED_UP',
          pickupDate: actionData.pickupDate || new Date().toISOString(),
          pickupAgent: actionData.pickupAgent || '',
          riderPhone: actionData.riderPhone || ''
        },
        { headers: { 'x-admin-secret': adminSecret } }
      )

      if (response.data.success) {
        showToast('Pickup scheduled successfully!', 'success')
        fetchReturns()
        fetchStats()
        setShowActionModal(false)
        setActionData({})
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to schedule pickup', 'error')
    }
  }

  const getStatusColor = (status) => {
    const statusObj = returnStatuses.find((s) => s.value === status)
    return statusObj?.color || '#9A9490'
  }

  const getStatusLabel = (status) => {
    const statusObj = returnStatuses.find((s) => s.value === status)
    return statusObj?.label || status
  }

  return (
    <div className="arm-container">
      {/* Header */}
      <div className="arm-header">
        <div className="arm-header-content">
          <h1 className="arm-page-title">Return Management</h1>
          <p className="arm-page-desc">Manage customer returns and process refunds efficiently</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="arm-stats-grid">
          <motion.div className="arm-stat-card" whileHover={{ y: -4 }}>
            <div className="arm-stat-icon" style={{ background: 'rgba(26, 140, 140, 0.1)', color: '#1A8C8C' }}>
              <Package size={24} />
            </div>
            <div className="arm-stat-content">
              <p className="arm-stat-label">Total Requests</p>
              <p className="arm-stat-value">{stats.totalRequests}</p>
            </div>
          </motion.div>

          <motion.div className="arm-stat-card" whileHover={{ y: -4 }}>
            <div className="arm-stat-icon" style={{ background: 'rgba(26, 140, 140, 0.1)', color: '#1A8C8C' }}>
              <Clock size={24} />
            </div>
            <div className="arm-stat-content">
              <p className="arm-stat-label">Pending Approval</p>
              <p className="arm-stat-value">{stats.pending}</p>
            </div>
          </motion.div>

          <motion.div className="arm-stat-card" whileHover={{ y: -4 }}>
            <div className="arm-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="arm-stat-content">
              <p className="arm-stat-label">Refunded</p>
              <p className="arm-stat-value">{stats.refundCompleted}</p>
            </div>
          </motion.div>

          <motion.div className="arm-stat-card" whileHover={{ y: -4 }}>
            <div className="arm-stat-icon" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#22C55E' }}>
              <DollarSign size={24} />
            </div>
            <div className="arm-stat-content">
              <p className="arm-stat-label">Total Refunded</p>
              <p className="arm-stat-value">₹{(stats.totalRefundAmount || 0).toLocaleString('en-IN')}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Controls */}
      <div className="arm-controls">
        <div className="arm-search-box">
          <Search size={18} className="arm-search-icon" />
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="arm-search-input"
          />
        </div>

        <div className="arm-filter-group">
          {returnStatuses.map((status) => (
            <button
              key={status.value}
              className={`arm-filter-btn ${statusFilter === status.value ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(status.value)
                setPage(1)
              }}
              style={{
                ...(statusFilter === status.value && {
                  background: status.color,
                  color: '#FFFFFF',
                  borderColor: status.color
                })
              }}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="arm-table-container">
        {loading && (
          <div className="arm-loading">
            <Loader size={32} className="arm-loading-spinner" />
            <p>Loading returns...</p>
          </div>
        )}

        {!loading && returns.length === 0 && (
          <div className="arm-empty">
            <Package size={48} className="arm-empty-icon" />
            <p className="arm-empty-title">No returns found</p>
            <p className="arm-empty-desc">No returns match your current filter</p>
          </div>
        )}

        {!loading && returns.length > 0 && (
          <motion.div className="arm-returns-grid">
            <AnimatePresence>
              {returns.map((item) => (
                <motion.div
                  key={item.orderId}
                  className="arm-return-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Card Header */}
                  <div className="arm-card-header">
                    <div className="arm-order-info">
                      <p className="arm-order-id">#{item.orderId}</p>
                      <p className="arm-user-name">{item.userName}</p>
                    </div>
                    <div className="arm-status-badge" style={{ background: getStatusColor(item.return.status) }}>
                      {getStatusLabel(item.return.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="arm-card-body">
                    <div className="arm-detail-row">
                      <span className="arm-detail-label">Amount:</span>
                      <span className="arm-detail-value">₹{item.finalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="arm-detail-row">
                      <span className="arm-detail-label">Reason:</span>
                      <span className="arm-detail-value">{item.return.reason || 'N/A'}</span>
                    </div>
                    <div className="arm-detail-row">
                      <span className="arm-detail-label">Requested:</span>
                      <span className="arm-detail-value">
                        {item.return.requestedAt ? new Date(item.return.requestedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="arm-card-actions">
                    <button
                      className="arm-action-btn arm-view-btn"
                      onClick={() => {
                        setSelectedReturn(item)
                        setShowDetailsModal(true)
                      }}
                    >
                      <Eye size={16} />
                      View
                    </button>

                    {item.return.status === 'REQUESTED' && (
                      <>
                        <button
                          className="arm-action-btn arm-approve-btn"
                          onClick={() => handleUpdateStatus(item.orderId, 'APPROVED')}
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          className="arm-action-btn arm-reject-btn"
                          onClick={() => {
                            setSelectedReturn(item)
                            setActionType('reject')
                            setShowActionModal(true)
                          }}
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </>
                    )}

                    {item.return.status === 'APPROVED' && (
                      <button
                        className="arm-action-btn arm-pickup-btn"
                        onClick={() => {
                          setSelectedReturn(item)
                          setActionType('schedule-pickup')
                          setShowActionModal(true)
                        }}
                      >
                        <Truck size={16} />
                        Schedule Pickup
                      </button>
                    )}

                    {item.return.status === 'PICKED_UP' && (
                      <button
                        className="arm-action-btn arm-transit-btn"
                        onClick={() => handleUpdateStatus(item.orderId, 'IN_TRANSIT')}
                      >
                        <MapPin size={16} />
                        Mark In Transit
                      </button>
                    )}

                    {item.return.status === 'IN_TRANSIT' && (
                      <button
                        className="arm-action-btn arm-receive-btn"
                        onClick={() => {
                          setSelectedReturn(item)
                          setActionType('mark-received')
                          setShowActionModal(true)
                        }}
                      >
                        <Package size={16} />
                        Mark Received
                      </button>
                    )}

                    {item.return.status === 'RECEIVED' && (
                      <button
                        className="arm-action-btn arm-refund-btn"
                        onClick={() => {
                          setSelectedReturn(item)
                          setActionType('process-refund')
                          setShowActionModal(true)
                        }}
                      >
                        <DollarSign size={16} />
                        Process Refund
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedReturn && (
          <div className="arm-modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <motion.div
              className="arm-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="arm-modal-header">
                <h2>Return Details - {selectedReturn.orderId}</h2>
                <button onClick={() => setShowDetailsModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="arm-modal-body">
                {/* Timeline */}
                <div className="arm-timeline">
                  <div className={`arm-timeline-item ${selectedReturn.return.status !== 'NOT_INITIATED' ? 'done' : ''}`}>
                    <div className="arm-timeline-marker"></div>
                    <div className="arm-timeline-content">
                      <p className="arm-timeline-title">Request Submitted</p>
                      <p className="arm-timeline-time">
                        {selectedReturn.return.requestedAt ? new Date(selectedReturn.return.requestedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className={`arm-timeline-item ${['APPROVED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'REFUND_COMPLETED'].includes(selectedReturn.return.status) ? 'done' : ''}`}>
                    <div className="arm-timeline-marker"></div>
                    <div className="arm-timeline-content">
                      <p className="arm-timeline-title">Request Approved</p>
                      <p className="arm-timeline-time">
                        {selectedReturn.return.approvedAt ? new Date(selectedReturn.return.approvedAt).toLocaleString() : 'Pending...'}
                      </p>
                    </div>
                  </div>

                  <div className={`arm-timeline-item ${['IN_TRANSIT', 'RECEIVED', 'REFUND_COMPLETED'].includes(selectedReturn.return.status) ? 'done' : ''}`}>
                    <div className="arm-timeline-marker"></div>
                    <div className="arm-timeline-content">
                      <p className="arm-timeline-title">Item In Transit</p>
                      <p className="arm-timeline-time">Being returned to warehouse</p>
                    </div>
                  </div>

                  <div className={`arm-timeline-item ${['RECEIVED', 'REFUND_COMPLETED'].includes(selectedReturn.return.status) ? 'done' : ''}`}>
                    <div className="arm-timeline-marker"></div>
                    <div className="arm-timeline-content">
                      <p className="arm-timeline-title">Item Received & Inspected</p>
                      <p className="arm-timeline-time">
                        {selectedReturn.return.deliveredBackDate ? new Date(selectedReturn.return.deliveredBackDate).toLocaleString() : 'Pending...'}
                      </p>
                    </div>
                  </div>

                  <div className={`arm-timeline-item ${selectedReturn.return.status === 'REFUND_COMPLETED' ? 'done' : ''}`}>
                    <div className="arm-timeline-marker"></div>
                    <div className="arm-timeline-content">
                      <p className="arm-timeline-title">Refund Processed</p>
                      <p className="arm-timeline-time">
                        {selectedReturn.refund?.processedAt ? new Date(selectedReturn.refund.processedAt).toLocaleString() : 'Pending...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="arm-details-section">
                  <h3>Return Information</h3>
                  <div className="arm-details-grid">
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Reason:</span>
                      <span className="arm-detail-value">{selectedReturn.return.reason}</span>
                    </div>
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Condition:</span>
                      <span className="arm-detail-value">{selectedReturn.return.condition}</span>
                    </div>
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Return Amount:</span>
                      <span className="arm-detail-value">₹{selectedReturn.return.returnRefundAmount || selectedReturn.finalAmount}</span>
                    </div>
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Refund Status:</span>
                      <span className="arm-detail-value" style={{ color: getStatusColor(selectedReturn.refund?.status) }}>
                        {selectedReturn.refund?.status || 'NOT_APPLICABLE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="arm-details-section">
                  <h3>Customer Information</h3>
                  <div className="arm-details-grid">
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Name:</span>
                      <span className="arm-detail-value">{selectedReturn.userName}</span>
                    </div>
                    <div className="arm-detail-item">
                      <span className="arm-detail-label">Email:</span>
                      <span className="arm-detail-value">{selectedReturn.userEmail}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && selectedReturn && (
          <div className="arm-modal-overlay" onClick={() => setShowActionModal(false)}>
            <motion.div
              className="arm-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="arm-modal-header">
                <h2>
                  {actionType === 'mark-received' && 'Mark Item as Received'}
                  {actionType === 'process-refund' && 'Process Refund'}
                  {actionType === 'reject' && 'Reject Return Request'}
                  {actionType === 'schedule-pickup' && 'Schedule Pickup'}
                </h2>
                <button onClick={() => setShowActionModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="arm-modal-body">
                <div className="arm-action-form">

                  {/* Rejection reason field */}
                  {actionType === 'reject' && (
                    <div className="arm-form-group">
                      <label>Rejection Reason *</label>
                      <textarea
                        value={actionData.rejectionReason || ''}
                        onChange={(e) => setActionData({ ...actionData, rejectionReason: e.target.value })}
                        placeholder="Enter reason for rejecting this return request..."
                        rows={3}
                        style={{ borderColor: !actionData.rejectionReason ? '#fecaca' : undefined }}
                      />
                    </div>
                  )}

                  {/* Pickup scheduling fields */}
                  {actionType === 'schedule-pickup' && (
                    <>
                      <div className="arm-form-group">
                        <label>Pickup Date</label>
                        <input
                          type="date"
                          value={actionData.pickupDate || ''}
                          onChange={(e) => setActionData({ ...actionData, pickupDate: e.target.value })}
                          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                      <div className="arm-form-group">
                        <label>Pickup Agent Name</label>
                        <input
                          type="text"
                          value={actionData.pickupAgent || ''}
                          onChange={(e) => setActionData({ ...actionData, pickupAgent: e.target.value })}
                          placeholder="Enter agent/rider name..."
                          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                      <div className="arm-form-group">
                        <label>Agent Phone (Optional)</label>
                        <input
                          type="tel"
                          value={actionData.riderPhone || ''}
                          onChange={(e) => setActionData({ ...actionData, riderPhone: e.target.value })}
                          placeholder="Enter agent phone number..."
                          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Admin notes field (for mark-received and process-refund) */}
                  {(actionType === 'mark-received' || actionType === 'process-refund') && (
                    <div className="arm-form-group">
                      <label>Admin Notes (Optional)</label>
                      <textarea
                        value={actionData.notes || ''}
                        onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                        placeholder="Add inspection notes or additional details..."
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Info boxes */}
                  <div className="arm-form-info">
                    <AlertCircle size={18} />
                    <div>
                      <p className="arm-form-info-title">
                        {actionType === 'mark-received' && 'Auto-Refund Schedule'}
                        {actionType === 'process-refund' && 'Process Refund'}
                        {actionType === 'reject' && 'Reject Return'}
                        {actionType === 'schedule-pickup' && 'Pickup Scheduling'}
                      </p>
                      <p className="arm-form-info-text">
                        {actionType === 'mark-received' && 'Once marked as received, refund will be automatically processed after 24 hours.'}
                        {actionType === 'process-refund' && `Refund of ₹${(selectedReturn.return?.returnRefundAmount || selectedReturn.finalAmount || 0).toLocaleString('en-IN')} will be processed to the customer's payment method.`}
                        {actionType === 'reject' && 'The customer will be notified that their return request has been rejected with the reason provided.'}
                        {actionType === 'schedule-pickup' && 'Pickup will be scheduled and customer will be notified. Status will change to PICKED_UP.'}
                      </p>
                    </div>
                  </div>

                  <div className="arm-form-actions">
                    <button
                      className="arm-form-btn arm-form-cancel"
                      onClick={() => { setShowActionModal(false); setActionData({}); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="arm-form-btn arm-form-submit"
                      style={actionType === 'reject' ? { background: '#DC2626' } : {}}
                      onClick={() => {
                        if (actionType === 'mark-received') {
                          handleMarkReceived(selectedReturn.orderId)
                        } else if (actionType === 'process-refund') {
                          handleProcessRefund(selectedReturn.orderId)
                        } else if (actionType === 'reject') {
                          if (!actionData.rejectionReason?.trim()) {
                            showToast('Please provide a rejection reason', 'error')
                            return
                          }
                          handleUpdateStatus(selectedReturn.orderId, 'REJECTED', { rejectionReason: actionData.rejectionReason.trim() })
                          setShowActionModal(false)
                          setActionData({})
                        } else if (actionType === 'schedule-pickup') {
                          handleSchedulePickup(selectedReturn.orderId)
                        }
                      }}
                    >
                      <Send size={16} />
                      {actionType === 'mark-received' && 'Mark as Received'}
                      {actionType === 'process-refund' && 'Process Refund'}
                      {actionType === 'reject' && 'Reject Return'}
                      {actionType === 'schedule-pickup' && 'Schedule Pickup'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminReturnManagement
