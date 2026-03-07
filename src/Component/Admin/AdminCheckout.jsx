import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import LefNav from './LefNav'
import { getCheckout, updateCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { BASE_URL } from '../../constants'
import { ShoppingBag, Truck, AlertCircle, ChevronDown, Send } from 'lucide-react'
import io from 'socket.io-client'

// 📦 All available order statuses (must match server ALLOWED_ORDER_STATUS)
const ALLOWED_ORDER_STATUS = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed']

// 🎨 Status badge colors
const STATUS_BADGE_COLORS = {
    'Ordered': 'badge-warning',
    'Order Placed': 'badge-warning',
    'Packed': 'badge-info',
    'Shipped': 'badge-primary',
    'Out for Delivery': 'badge-success',
    'Delivered': 'badge-success',
    'Return Initiated': 'badge-danger',
    'Return Completed': 'badge-danger',
    'Refund Initiated': 'badge-warning',
    'Refund Completed': 'badge-success'
}

const QUICK_ETA_OPTIONS = [
    { label: 'Today', days: 0 },
    { label: '+1d', days: 1 },
    { label: '+2d', days: 2 },
    { label: '+3d', days: 3 },
    { label: '+5d', days: 5 }
]

const toInputDate = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()
    const [updating, setUpdating] = useState(null)
    const [notification, setNotification] = useState(null)
    const [expandedRow, setExpandedRow] = useState(null)
    const [socket, setSocket] = useState(null)
    const [etaDateByOrder, setEtaDateByOrder] = useState({})

    const getDateFromDays = (days) => {
        const next = new Date()
        next.setHours(0, 0, 0, 0)
        next.setDate(next.getDate() + Number(days || 0))
        return toInputDate(next)
    }

    const setQuickEta = (orderKey, days) => {
        setEtaDateByOrder((prev) => ({
            ...prev,
            [orderKey]: getDateFromDays(days)
        }))
    }

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    // 🔄 Socket.io setup for real-time updates
    useEffect(() => {
        const newSocket = io(BASE_URL)
        setSocket(newSocket)

        newSocket.on('statusUpdate', (payload) => {
            console.log('📡 Real-time update received:', payload)
            // Refresh orders list when update happens
            setTimeout(() => {
                dispatch(getCheckout())
            }, 300)
        })

        return () => {
            if (newSocket) newSocket.disconnect()
        }
    }, [dispatch])

    // 🔴 HANDLE STATUS UPDATE VIA SOCKET.IO API
    const handleStatusUpdate = async (item, newStatus) => {
        if (!newStatus) {
            setNotification({ type: 'warning', message: '⚠️ Please select a status' })
            return
        }

        try {
            setUpdating(item.id || item._id)
            const orderKey = item.id || item._id || item.orderId
            const etaDate = etaDateByOrder[orderKey] || ''
            
            const response = await axios.post(`${BASE_URL}/api/update-order-status`, {
                orderId: orderKey,
                status: newStatus,
                ...(etaDate ? { estimatedArrival: etaDate } : {})
            }, { timeout: 10000 })

            if (response.data?.success) {
                // Show success notification
                setNotification({ type: 'success', message: `✅ Order updated to ${newStatus}` })
                setExpandedRow(null)
                
                // Refresh orders list
                setTimeout(() => {
                    dispatch(getCheckout())
                }, 500)

                // Clear notification after 3s
                setTimeout(() => setNotification(null), 3000)
            }
        } catch (error) {
            console.error('❌ Status update error:', error.message)
            const errorMsg = error.response?.data?.message || 'Failed to update order status'
            setNotification({ type: 'error', message: `❌ ${errorMsg}` })
            setTimeout(() => setNotification(null), 4000)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        {/* NOTIFICATION */}
                        {notification && (
                            <div className={`alert alert-${notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show mb-4`} role="alert">
                                <AlertCircle size={16} className="d-inline mr-2" />
                                {notification.message}
                                <button type="button" className="close" onClick={() => setNotification(null)}>&times;</button>
                            </div>
                        )}

                        <div className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center">
                                <ShoppingBag className="mr-2 text-info" /> Manage All Orders
                            </h4>
                            
                            {/* 📌 Quick Status Legend */}
                            <div className="alert alert-info mb-4" role="alert">
                                <strong>💡 Tip:</strong> Click the dropdown arrow on any order to view all available status options. Update status instantly without database access!
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="bg-light small">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer ID</th>
                                            <th>Current Status</th>
                                            <th>Amount</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checkouts.map((item, index) => (
                                            <React.Fragment key={index}>
                                                <tr>
                                                    <td className="align-middle font-weight-bold small text-info">{item.id || item._id}</td>
                                                    <td className="align-middle small">{item.userid}</td>
                                                    <td className="align-middle">
                                                        <span className={`badge px-3 py-2 rounded-pill ${STATUS_BADGE_COLORS[item.orderstatus] || 'badge-secondary'}`}>
                                                            {item.orderstatus}
                                                        </span>
                                                    </td>
                                                    <td className="align-middle font-weight-bold">₹{item.finalAmount}</td>
                                                    <td className="align-middle text-right">
                                                        <button
                                                            onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                                                            className="btn btn-sm btn-outline-primary rounded-pill d-flex align-items-center"
                                                            title="Click to see all status options"
                                                        >
                                                            Update Status
                                                            <ChevronDown 
                                                                size={16} 
                                                                className="ml-2" 
                                                                style={{ 
                                                                    transform: expandedRow === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.3s'
                                                                }}
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* 📋 EXPANDED STATUS OPTIONS */}
                                                {expandedRow === index && (
                                                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                                                        <td colSpan="5" className="p-4">
                                                            <div className="row">
                                                                <div className="col-12 mb-3">
                                                                    <h6 className="text-muted mb-3">
                                                                        <Send size={14} className="mr-2" />
                                                                        Select new status for Order <strong>{item.id || item._id}</strong>:
                                                                    </h6>
                                                                    <div className="mb-3" style={{ maxWidth: 300 }}>
                                                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                                                            <label className="small font-weight-bold text-muted d-block mb-0">Expected Delivery Date (Optional)</label>
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-link btn-sm p-0"
                                                                                style={{ fontSize: '11px', fontWeight: 700 }}
                                                                                onClick={() => {
                                                                                    const orderKey = item.id || item._id || item.orderId
                                                                                    setEtaDateByOrder((prev) => ({ ...prev, [orderKey]: '' }))
                                                                                }}
                                                                            >
                                                                                Clear
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            type="date"
                                                                            className="form-control form-control-sm"
                                                                            value={etaDateByOrder[item.id || item._id || item.orderId] || ''}
                                                                            onChange={(e) => {
                                                                                const orderKey = item.id || item._id || item.orderId
                                                                                setEtaDateByOrder((prev) => ({
                                                                                    ...prev,
                                                                                    [orderKey]: e.target.value
                                                                                }))
                                                                            }}
                                                                        />
                                                                        <div className="mt-2 d-flex flex-wrap" style={{ gap: '6px' }}>
                                                                            {QUICK_ETA_OPTIONS.map((opt) => (
                                                                                <button
                                                                                    key={`${item.id || item._id || item.orderId}-${opt.days}`}
                                                                                    type="button"
                                                                                    className="btn btn-sm btn-outline-primary rounded-pill"
                                                                                    style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px' }}
                                                                                    onClick={() => {
                                                                                        const orderKey = item.id || item._id || item.orderId
                                                                                        setQuickEta(orderKey, opt.days)
                                                                                    }}
                                                                                >
                                                                                    {opt.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="row g-2">
                                                                {ALLOWED_ORDER_STATUS.map((status) => (
                                                                    <div key={status} className="col-md-4 col-lg-3 mb-2">
                                                                        <button
                                                                            onClick={() => handleStatusUpdate(item, status)}
                                                                            disabled={
                                                                                updating === (item.id || item._id) ||
                                                                                item.orderstatus === status
                                                                            }
                                                                            className={`btn btn-sm w-100 rounded-2 ${
                                                                                item.orderstatus === status
                                                                                    ? 'btn-secondary disabled'
                                                                                    : 'btn-outline-success'
                                                                            }`}
                                                                            title={item.orderstatus === status ? 'Current status' : `Set to ${status}`}
                                                                        >
                                                                            {updating === (item.id || item._id) ? (
                                                                                <>
                                                                                    <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
                                                                                    Updating...
                                                                                </>
                                                                            ) : item.orderstatus === status ? (
                                                                                <>
                                                                                    ✓ {status}
                                                                                </>
                                                                            ) : (
                                                                                status
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}