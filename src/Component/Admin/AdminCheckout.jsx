import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import LefNav from './LefNav'
import { getCheckout, updateCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { BASE_URL, SOCKET_TRANSPORTS } from '../../constants'
import { ShoppingBag, Truck, AlertCircle, ChevronDown, Send, Search, Package } from 'lucide-react'
import io from 'socket.io-client'
import { motion } from 'framer-motion'

// 📦 All available order statuses (must match server ALLOWED_ORDER_STATUS)
const ALLOWED_ORDER_STATUS = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed']

// 🎨 Status badge colors
const LUX_STATUS_CLASSES = {
    'Ordered': 'lux-badge-warning',
    'Order Placed': 'lux-badge-warning',
    'Packed': 'lux-badge-info',
    'Shipped': 'lux-badge-primary',
    'Out for Delivery': 'lux-badge-purple',
    'Delivered': 'lux-badge-success',
    'Return Initiated': 'lux-badge-danger',
    'Return Completed': 'lux-badge-danger',
    'Refund Initiated': 'lux-badge-warning',
    'Refund Completed': 'lux-badge-success'
}

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()
    const [updating, setUpdating] = useState(null)
    const [notification, setNotification] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [socket, setSocket] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    const filteredCheckouts = useMemo(() => {
        let result = checkouts || []
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase()
            result = result.filter(c => 
                (c.id && c.id.toLowerCase().includes(lowerQuery)) ||
                (c._id && c._id.toLowerCase().includes(lowerQuery)) ||
                (c.userid && c.userid.toLowerCase().includes(lowerQuery))
            )
        }
        return result
    }, [checkouts, searchTerm])

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    // 🔄 Socket.io setup for real-time updates
    useEffect(() => {
        const userId = localStorage.getItem('userid');
        const newSocket = io(BASE_URL, {
            auth: { userId },
            transports: SOCKET_TRANSPORTS,
            reconnection: true,
            reconnectionDelay: 3000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 3,
            forceNew: false
        });
        setSocket(newSocket);

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
            
            const response = await axios.post(`${BASE_URL}/api/update-order-status`, {
                orderId: item.id || item._id || item.orderId,
                status: newStatus
            }, { timeout: 10000 })

            if (response.data?.success) {
                // Show success notification
                setNotification({ type: 'success', message: `✅ Order updated to ${newStatus}` })
                setExpandedId(null)
                
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
        <div className="lux-admin-page" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-4 py-4">
                    
                    {/* Luxury Header Banner */}
                    <motion.div 
                        className="lux-banner mb-4"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="lux-banner-content">
                            <div>
                                <div className="lux-eyebrow"><Package size={14} className="mr-1"/> Dispatch</div>
                                <h1 className="lux-banner-title">Order <span>Management</span></h1>
                                <p className="lux-banner-sub">Monitor and update customer checkout states.</p>
                            </div>
                            <div className="lux-banner-stats">
                                <div className="lux-stat-box">
                                    <span>Total Orders</span>
                                    <strong>{filteredCheckouts.length}</strong>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                        <div className="w-100">
                        {/* NOTIFICATION */}
                        {notification && (
                            <div className={`alert alert-${notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show mb-4`} role="alert">
                                <AlertCircle size={16} className="d-inline mr-2" />
                                {notification.message}
                                <button type="button" className="close" onClick={() => setNotification(null)}>&times;</button>
                            </div>
                        )}

                        <motion.div 
                            initial={{opacity:0, y:20}} 
                            animate={{opacity:1, y:0}} 
                            transition={{ delay: 0.2 }}
                            className="lux-card"
                        >
                            {/* Toolbar: Search */}
                            <div className="lux-toolbar">
                                <div className="lux-search-box">
                                    <Search size={16} className="lux-search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by Order ID or Customer ID..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* Responsive Table */}
                            <div className="lux-table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th className="hide-mobile">Customer ID</th>
                                            <th>Current Status</th>
                                            <th>Amount</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCheckouts.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5">
                                                    <div className="text-muted d-flex flex-column align-items-center">
                                                        <ShoppingBag size={32} className="mb-2 opacity-50" />
                                                        <span>No orders found matching your criteria.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                        filteredCheckouts.map((item, index) => {
                                            const rowId = item.id || item._id || String(index)
                                            return (
                                            <React.Fragment key={rowId}>
                                                <tr className="lux-table-row">
                                                    <td className="lux-td-id color-ink font-weight-bold">{String(item.id || item._id).slice(-8)}</td>
                                                    <td className="lux-td-id hide-mobile">{String(item.userid).slice(-8)}</td>
                                                    <td>
                                                        <span className={`lux-badge ${LUX_STATUS_CLASSES[item.orderstatus] || 'lux-badge-secondary'}`}>
                                                            {item.orderstatus}
                                                        </span>
                                                    </td>
                                                    <td><strong className="lux-price-tag">₹{item.finalAmount}</strong></td>
                                                    <td className="text-right">
                                                        <div className="lux-action-cell">
                                                        <button
                                                            onClick={() => setExpandedId(expandedId === rowId ? null : rowId)}
                                                            className="lux-btn-expand"
                                                            title="Click to see all status options"
                                                        >
                                                            <span>Update</span>
                                                            <ChevronDown 
                                                                size={14} 
                                                                className="ml-2" 
                                                                style={{ 
                                                                    transform: expandedId === rowId ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.3s'
                                                                }}
                                                            />
                                                        </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* 📋 EXPANDED STATUS OPTIONS */}
                                                {expandedId === rowId && (
                                                    <tr className="lux-expanded-bg">
                                                        <td colSpan="5" className="p-4" style={{borderBottom: '1px solid #e2e8f0'}}>
                                                            <div className="row">
                                                                <div className="col-12 mb-3 d-flex align-items-center text-muted" style={{fontSize: '13px', fontWeight: 600}}>
                                                                    <Send size={14} className="mr-2" color="#D4AF37"/>
                                                                    Select new status for Order <strong className="ml-1 color-ink">{item.id || item._id}</strong>
                                                                </div>
                                                            </div>
                                                            <div className="row g-2">
                                                                {ALLOWED_ORDER_STATUS.map((status) => (
                                                                    <div key={status} className="col-md-4 col-lg-3 mb-2">
                                                                        <button
                                                                            onClick={() => handleStatusUpdate(item, status)}
                                                                            disabled={
                                                                                updating === rowId ||
                                                                                item.orderstatus === status
                                                                            }
                                                                            className={`lux-status-btn ${
                                                                                item.orderstatus === status
                                                                                    ? 'active disabled'
                                                                                    : ''
                                                                            }`}
                                                                            title={item.orderstatus === status ? 'Current status' : `Set to ${status}`}
                                                                        >
                                                                            {updating === rowId ? (
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
                                            </React.Fragment>)
                                        }))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                        </div>
                    </div>
            </div>
            {/* Luxury Styles Embedded */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');
                .lux-admin-page { font-family: 'Jost', sans-serif; }
                .lux-banner { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 24px; padding: 32px 40px; color: white; box-shadow: 0 20px 40px rgba(15,23,42,0.12); border: 1px solid rgba(212,175,55,0.2); }
                .lux-banner-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
                .lux-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 8px; }
                .lux-banner-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #ffffff; margin: 0 0 4px; }
                .lux-banner-title span { color: #D4AF37; }
                .lux-banner-sub { color: #94a3b8; margin: 0; font-size: 14px; }
                .lux-banner-stats { display: flex; gap: 16px; }
                .lux-stat-box { background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 12px 20px; display: flex; flex-direction: column; }
                .lux-stat-box span { font-size: 11px; text-transform: uppercase; color: #D4AF37; letter-spacing: 0.5px; }
                .lux-stat-box strong { font-size: 24px; font-weight: 700; color: #fff; line-height: 1.2; }
                .lux-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid rgba(212,175,55,0.1); overflow: hidden; }
                .lux-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding: 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
                .lux-search-box { position: relative; flex: 1; min-width: 260px; max-width: 400px; }
                .lux-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .lux-search-box input { width: 100%; padding: 10px 16px 10px 40px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; transition: all 0.2s; outline: none; }
                .lux-search-box input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
                .lux-table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .lux-table { width: 100%; border-collapse: collapse; min-width: 700px; }
                .lux-table th { background: #fff; padding: 16px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
                .lux-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; }
                .lux-table-row:hover td { background: #fafbfc; }
                .lux-td-id { font-family: monospace; color: #94a3b8; font-size: 12px; }
                .color-ink { color: #0f172a; }
                .lux-price-tag { color: #0f766e; font-weight: 800; }
                .lux-badge { display: inline-flex; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .lux-badge-danger { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
                .lux-badge-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                .lux-badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                .lux-badge-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                .lux-badge-info { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
                .lux-badge-primary { background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe; }
                .lux-badge-purple { background: #f3e8ff; color: #9333ea; border: 1px solid #e9d5ff; }
                .lux-action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
                .lux-btn-expand { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px; background: #fff; border: 1px solid #e2e8f0; color: #3b82f6; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .lux-btn-expand:hover { border-color: #bfdbfe; background: #eff6ff; }
                .lux-expanded-bg { background: #fafbfc; }
                .lux-status-btn { width: 100%; text-align: center; border: 1px solid #e2e8f0; background: #fff; color: #475569; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .lux-status-btn:hover { border-color: #D4AF37; color: #b8860b; background: #fffbeb; }
                .lux-status-btn.active { background: #10b981; color: #fff; border-color: #059669; cursor: default; box-shadow: 0 4px 10px rgba(16,185,129,0.2); }
                @media (max-width: 768px) { .hide-mobile { display: none !important; } .lux-table { min-width: 100%; } .lux-banner { padding: 24px; } .lux-toolbar { flex-direction: column; align-items: stretch; } .lux-search-box { max-width: 100%; } }
            `}} />
                </div>
        
    )
}