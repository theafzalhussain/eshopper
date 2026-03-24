import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import { Package, Loader2, Search, Filter, AlertCircle, CheckCircle2, Clock, Truck, MapPin, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import LefNav from './LefNav';
import './AdminOrders.css';

const ALLOWED_STATUSES = ['Order Placed', 'Ordered', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const STATUS_COLORS = {
    'Order Placed': 'status-order-placed',
    'Ordered': 'status-ordered',
    'Confirmed': 'status-confirmed',
    'Packed': 'status-packed',
    'Shipped': 'status-shipped',
    'Out for Delivery': 'status-out-for-delivery',
    'Delivered': 'status-delivered'
};

const STATUS_ICONS = {
    'Order Placed': <Clock size={16} />,
    'Ordered': <Clock size={16} />,
    'Confirmed': <CheckCircle2 size={16} />,
    'Packed': <Package size={16} />,
    'Shipped': <Truck size={16} />,
    'Out for Delivery': <MapPin size={16} />,
    'Delivered': <Check size={16} />
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [updating, setUpdating] = useState(null);
    const [notification, setNotification] = useState(null);
    
    // Bulk actions state (array-based for robust handling)
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    
    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState(null);

    // Order details drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerOrder, setDrawerOrder] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://api.eshopperr.me';

    // Socket.io setup for real-time updates
    useEffect(() => {
        const userId = localStorage.getItem('userid');
        const socket = io(BASE_URL, { auth: { userId } });
        
        const handleStatusUpdate = (payload) => {
            console.log('📡 Real-time update received:', payload);
            setOrders(prev => prev.map(order =>
                order.orderId === payload.orderId
                    ? { ...order, orderStatus: payload.status, updatedAt: payload.updatedAt }
                    : order
            ));
        };

        socket.on('statusUpdate', handleStatusUpdate);
        return () => socket.off('statusUpdate', handleStatusUpdate);
    }, [BASE_URL]);

    // Fetch orders on mount and when page/search/status changes
    useEffect(() => {
        fetchOrders();
    }, [page, search, selectedStatus]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                ...(search && { search }),
                ...(selectedStatus && { status: selectedStatus })
            };

            const response = await axios.get(`${BASE_URL}/api/admin/orders`, { params });
            setOrders(response.data.orders || []);
            setTotalPages(response.data.pages || 0);
            setSelectedOrders([]);
            setSelectAll(false);
        } catch (error) {
            console.error('❌ Failed to fetch orders:', error);
            showNotification('Failed to load orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch single order details for drawer
    const fetchOrderDetails = async (orderId) => {
        setDrawerLoading(true);
        setDrawerOrder(null);
        setDrawerOpen(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/admin/order/${orderId}`);
            if (response.data && response.data.success) {
                setDrawerOrder(response.data);
            } else {
                setDrawerOrder(null);
            }
        } catch (err) {
            setDrawerOrder(null);
        } finally {
            setDrawerLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setUpdating(orderId);
            setDropdownOpen(null);

            // Special handling for "Confirmed" status - use premium email endpoint
            const endpoint = newStatus === 'Confirmed' 
                ? `${BASE_URL}/api/admin/confirm-order`
                : `${BASE_URL}/api/update-order-status`;

            const config = newStatus === 'Confirmed' 
                ? {
                    headers: {
                        'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET
                    }
                }
                : {};

            const response = newStatus === 'Confirmed'
                ? await axios.post(endpoint, { orderId }, config)
                : await axios.post(endpoint, { orderId, status: newStatus });

            if (response.data.success) {
                const emailInfo = newStatus === 'Confirmed' && response.data.emailSent 
                    ? ' & Premium Email Sent! 📧'
                    : '';
                showNotification(`✅ Status updated to ${newStatus}${emailInfo}`, 'success');
                setTimeout(() => fetchOrders(), 500);
            }
        } catch (error) {
            console.error('❌ Update failed:', error);
            if (error.response?.status === 403) {
                showNotification('🔒 Unauthorized - Admin access required', 'error');
            } else {
                showNotification('Failed to update status', 'error');
            }
        } finally {
            setUpdating(null);
        }
    };

    // Array-based selection logic
    const handleOrderSelect = (orderId) => {
        let newSelected;
        if (selectedOrders.includes(orderId)) {
            newSelected = selectedOrders.filter(id => id !== orderId);
        } else {
            newSelected = [...selectedOrders, orderId];
        }
        setSelectedOrders(newSelected);
        setSelectAll(newSelected.length === orders.length && orders.length > 0);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectAll(true);
            setSelectedOrders(orders.map(o => o.orderId));
        } else {
            setSelectAll(false);
            setSelectedOrders([]);
        }
    };

    const handleBulkConfirm = async () => {
        if (selectedOrders.length === 0) {
            showNotification('Please select at least one order', 'info');
            return;
        }

        try {
            setBulkUpdating(true);
            const ordersToConfirm = [...selectedOrders];
            let successCount = 0;
            let failCount = 0;

            const config = {
                headers: {
                    'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET
                }
            };

            for (const orderId of ordersToConfirm) {
                try {
                    const response = await axios.post(`${BASE_URL}/api/admin/confirm-order`, { orderId }, config);
                    if (response.data.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                    console.error(`Failed to confirm ${orderId}:`, error);
                }
            }

            showNotification(
                `✅ ${successCount} order(s) confirmed${failCount > 0 ? ` • ${failCount} failed` : ''} • Emails sent!`,
                failCount === 0 ? 'success' : 'info'
            );
            setSelectedOrders([]);
            setSelectAll(false);
            setTimeout(() => fetchOrders(), 1000);
        } catch (error) {
            console.error('❌ Bulk confirm failed:', error);
            if (error.response?.status === 403) {
                showNotification('🔒 Unauthorized - Admin access required', 'error');
            } else {
                showNotification('Bulk confirmation failed', 'error');
            }
        } finally {
            setBulkUpdating(false);
        }
    };

    // Bulk Delete Orders Handler
    const handleBulkDelete = async () => {
        if (selectedOrders.length === 0) {
            showNotification('Please select at least one order', 'info');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)? This cannot be undone!`)) return;
        try {
            setBulkDeleting(true);
            const response = await axios.post(
                `${BASE_URL}/api/admin/delete-orders`,
                { orderIds: selectedOrders },
                { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET } }
            );
            if (response.data.success) {
                showNotification(`🗑️ ${response.data.deletedCount} order(s) deleted`, 'success');
            } else {
                showNotification('Bulk delete failed.', 'error');
            }
            setSelectedOrders([]);
            setSelectAll(false);
            setTimeout(() => fetchOrders(), 1000);
        } catch (error) {
            console.error('❌ Bulk delete failed:', error);
            showNotification('Bulk delete failed', 'error');
        } finally {
            setBulkDeleting(false);
        }
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const filteredOrders = useMemo(() => orders, [orders]);

    // CSV Export
    const exportOrdersToCSV = () => {
        // Use selected orders if any, else filteredOrders
        const exportOrders = selectedOrders.size > 0
            ? orders.filter(o => selectedOrders.includes(o.orderId))
            : filteredOrders;
        if (!exportOrders.length) return alert('No orders to export!');
        const headers = [
            'Order ID', 'Customer', 'Email', 'Amount', 'Status', 'Items', 'Updated'
        ];
        const rows = exportOrders.map(order => [
            order.orderId,
            order.userName,
            order.userEmail,
            order.finalAmount,
            order.orderStatus,
            order.productCount || (order.products?.length || 0),
            new Date(order.updatedAt).toLocaleDateString('en-IN')
        ]);
        let csv = '';
        csv += headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // PDF Export
    const exportOrdersToPDF = () => {
        const exportOrders = selectedOrders.size > 0
            ? orders.filter(o => selectedOrders.includes(o.orderId))
            : filteredOrders;
        if (!exportOrders.length) return alert('No orders to export!');
        const doc = new jsPDF();
        const tableColumn = [
            'Order ID',
            'Customer',
            'Email',
            'Amount',
            'Status',
            'Items',
            'Updated'
        ];
        const tableRows = exportOrders.map(order => ([
            String(order.orderId || '').slice(-8),
            order.userName || 'Customer',
            order.userEmail || 'N/A',
            `₹${Number(order.finalAmount || 0).toLocaleString('en-IN')}`,
            order.orderStatus || 'Order Placed',
            order.productCount || (order.products?.length || 0),
            new Date(order.updatedAt).toLocaleDateString('en-IN')
        ]));
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255,255,255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 248, 255] },
            margin: { top: 28 }
        });
        doc.setFontSize(16);
        doc.text('Order List', 14, 18);
        doc.save('orders.pdf');
    };

    if (loading && orders.length === 0) {
        return (
            <div className="admin-orders-page d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-info admin-spin" />
                    <p className="text-muted font-weight-bold mt-3 mb-0">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="admin-orders-page py-5"
        >
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2 mb-4"><LefNav /></div>
                    <div className="col-lg-10">
                        <div className="admin-orders-card">
                            <div className="mb-4">
                                <h1 className="admin-orders-title d-flex align-items-center mb-2">
                                    <Package className="text-info mr-2" size={30} />
                                    Manage Orders
                                </h1>
                                <p className="text-muted mb-0">Premium order management with real-time updates & bulk actions</p>
                            </div>

                            {notification && (
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    className={`alert d-flex align-items-center mb-4 ${
                                        notification.type === 'success'
                                            ? 'alert-success'
                                            : notification.type === 'error'
                                            ? 'alert-danger'
                                            : 'alert-info'
                                    }`}
                                    role="alert"
                                >
                                    {notification.type === 'success' && <CheckCircle2 size={18} className="mr-2" />}
                                    {notification.type === 'error' && <AlertCircle size={18} className="mr-2" />}
                                    {notification.type === 'info' && <Clock size={18} className="mr-2" />}
                                    <span>{notification.message}</span>
                                </motion.div>
                            )}

                            <div className="admin-orders-toolbar mb-4 d-flex flex-wrap align-items-end justify-content-between">
                                <div className="row flex-grow-1">
                                    <div className="col-md-5 mb-3">
                                        <label className="small font-weight-bold text-uppercase text-muted mb-2 d-block">Search (Order ID / Name / Email)</label>
                                        <div className="input-group">
                                            <div className="input-group-prepend">
                                                <span className="input-group-text bg-white"><Search size={18} className="text-muted" /></span>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search orders..."
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }}
                                                className="form-control"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-4 mb-3">
                                        <label className="small font-weight-bold text-uppercase text-muted mb-2 d-block">Filter by Status</label>
                                        <div className="input-group">
                                            <div className="input-group-prepend">
                                                <span className="input-group-text bg-white"><Filter size={18} className="text-muted" /></span>
                                            </div>
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => {
                                                    setSelectedStatus(e.target.value);
                                                    setPage(1);
                                                }}
                                                className="form-control"
                                            >
                                                <option value="">All Statuses</option>
                                                {ALLOWED_STATUSES.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="col-md-3 mb-3 d-flex align-items-end">
                                        <div className="small font-weight-bold text-muted">Selected: {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                                <div className="export-btn-wrap mb-3 ml-auto">
                                    <div className="d-flex gap-2">
                                        <button
                                            className="export-csv-btn-premium mr-2"
                                            onClick={exportOrdersToCSV}
                                            title="Export orders as CSV"
                                        >
                                            <Download size={18} style={{marginRight: 6, marginTop: -2}} />
                                            Export CSV
                                        </button>
                                        <button
                                            className="export-pdf-btn-premium"
                                            onClick={exportOrdersToPDF}
                                            title="Export orders as PDF"
                                        >
                                            <FileText size={18} style={{marginRight: 6, marginTop: -2}} />
                                            Export PDF
                                        </button>
                                    </div>
                                </div>
                                </div>
                            </div>

                            {selectedOrders.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="admin-bulk-bar d-flex flex-wrap align-items-center"
                                >
                                    <span className="mr-3 font-weight-bold">Bulk Actions ({selectedOrders.length} selected):</span>
                                    <button
                                        onClick={handleBulkConfirm}
                                        disabled={bulkUpdating || bulkDeleting}
                                        className="btn btn-success d-flex align-items-center mr-2"
                                    >
                                        {bulkUpdating ? (
                                            <>
                                                <Loader2 size={16} className="admin-spin mr-2" />
                                                Confirming...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} className="mr-2" />
                                                Bulk Confirm Orders & Send Emails
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={bulkDeleting || bulkUpdating}
                                        className="btn btn-danger d-flex align-items-center"
                                    >
                                        {bulkDeleting ? (
                                            <>
                                                <Loader2 size={16} className="admin-spin mr-2" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={16} className="mr-2" />
                                                Bulk Delete Orders
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}

                            <div className="admin-orders-table-wrap">
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-5">
                                        <Package size={44} className="text-muted mb-3" />
                                        <p className="text-muted mb-0">No orders found</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0 admin-orders-table">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectAll && orders.length > 0}
                                                            onChange={handleSelectAll}
                                                            className="cursor-pointer"
                                                        />
                                                    </th>
                                                    <th>Order ID</th>
                                                    <th>Customer</th>
                                                    <th>Email</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Items</th>
                                                    <th>Updated</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredOrders.map((order, index) => (
                                                    <React.Fragment key={order.orderId}>
                                                        <motion.tr
                                                            initial={{ opacity: 0, y: 18 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.04 }}
                                                            className="order-row-premium"
                                                        >
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedOrders.includes(order.orderId)}
                                                                    onChange={() => handleOrderSelect(order.orderId)}
                                                                    className="cursor-pointer"
                                                                />
                                                            </td>
                                                            <td>
                                                                <span className="font-weight-bold text-info order-id-cell">
                                                                    {String(order.orderId || '').slice(-8)}
                                                                </span>
                                                                    <span
                                                                        className="view-details-link-premium-gradient"
                                                                        onClick={() => fetchOrderDetails(order.orderId)}
                                                                        title="View Order Details"
                                                                        tabIndex={0}
                                                                        role="button"
                                                                        onKeyPress={e => { if (e.key === 'Enter') fetchOrderDetails(order.orderId); }}
                                                                    >
                                                                        View Details
                                                                    </span>
                                                            </td>
                                                            <td className="font-weight-bold">{order.userName || 'Customer'}</td>
                                                            <td>{order.userEmail || 'N/A'}</td>
                                                            <td className="font-weight-bold text-dark">₹{Number(order.finalAmount || 0).toLocaleString('en-IN')}</td>
                                                            <td>
                                                                <span className={`status-pill ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS['Order Placed']}`}>
                                                                    {STATUS_ICONS[order.orderStatus] || STATUS_ICONS['Order Placed']}
                                                                    <span>{order.orderStatus || 'Order Placed'}</span>
                                                                </span>
                                                            </td>
                                                            <td>{order.productCount || order.products?.length || 0} item{(order.productCount || order.products?.length || 0) !== 1 ? 's' : ''}</td>
                                                            <td>{new Date(order.updatedAt).toLocaleDateString('en-IN')}</td>
                                                            <td>
                                                                <div className="position-relative">
                                                                    <button
                                                                        onClick={() => setDropdownOpen(dropdownOpen === order.orderId ? null : order.orderId)}
                                                                        disabled={updating === order.orderId}
                                                                        className="btn btn-outline-dark btn-sm d-flex align-items-center"
                                                                    >
                                                                        {updating === order.orderId ? (
                                                                            <>
                                                                                <Loader2 size={14} className="admin-spin mr-2" />
                                                                                Updating...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                Update Status
                                                                                <ChevronDown size={14} className={`ml-1 ${dropdownOpen === order.orderId ? 'rotate-180' : ''}`} />
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    {dropdownOpen === order.orderId && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: -10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            className="admin-status-dropdown"
                                                                        >
                                                                            {ALLOWED_STATUSES.map((status) => (
                                                                                <button
                                                                                    key={status}
                                                                                    onClick={() => updateOrderStatus(order.orderId, status)}
                                                                                    disabled={updating === order.orderId || order.orderStatus === status}
                                                                                    className={`admin-status-option ${order.orderStatus === status ? 'disabled' : ''}`}
                                                                                >
                                                                                    {STATUS_ICONS[status] || <Clock size={14} />}
                                                                                    <span>{status}</span>
                                                                                    {order.orderStatus === status && <Check size={14} />}
                                                                                </button>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </motion.tr>

                                                        {expandedHistory === order.orderId && order.statusHistory && (
                                                            <motion.tr
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                className="bg-light"
                                                            >
                                                                <td colSpan="9" className="p-3">
                                                                    <div className="bg-white rounded p-3 border">
                                                                        <h4 className="h6 font-weight-bold mb-3">📋 Status History</h4>
                                                                        <div>
                                                                            {order.statusHistory.map((entry, idx) => (
                                                                                <div key={idx} className="history-item">
                                                                                    <span className="history-time">
                                                                                        {new Date(entry.timestamp).toLocaleDateString('en-IN')} {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                                                    </span>
                                                                                    <div className="flex-grow-1 ml-2">
                                                                                        <p className="mb-1 small font-weight-bold">Status: {entry.status}</p>
                                                                                        {entry.message && <p className="mb-0 small text-muted">{entry.message}</p>}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </motion.tr>
                                                        )}

                                                        {order.statusHistory && order.statusHistory.length > 0 && (
                                                            <tr className="bg-light">
                                                                <td colSpan="9" className="py-2 px-3">
                                                                    <button
                                                                        onClick={() => setExpandedHistory(expandedHistory === order.orderId ? null : order.orderId)}
                                                                        className="btn btn-link btn-sm p-0"
                                                                    >
                                                                        {expandedHistory === order.orderId ? '▼ Hide History' : `▶ Show History (${order.statusHistory.length})`}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-4 d-flex justify-content-center align-items-center">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="btn btn-outline-secondary btn-sm mr-2"
                                    >
                                        Previous
                                    </button>
                                    <div className="d-flex align-items-center">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`btn btn-sm mr-1 ${page === p ? 'btn-info' : 'btn-outline-secondary'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        className="btn btn-outline-secondary btn-sm ml-2"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}

                            <div className="mt-4 text-center text-muted small">
                                <p className="mb-1">Showing page {page} of {totalPages || 1}</p>
                                <p className="mb-0">✨ Premium Features: Real-time updates • Bulk Actions • Status History • Email Automation</p>
                            </div>
                        </div>
                    </div>
                </div>
        <OrderDetailsDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            order={drawerOrder}
            loading={drawerLoading}
        />
          </motion.div>
    );
}
