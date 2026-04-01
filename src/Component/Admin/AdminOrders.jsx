import React, { useState, useEffect, useMemo } from 'react';
import { Package, Loader2, Search, Filter, AlertCircle, CheckCircle2, Clock, Truck, MapPin, ChevronDown, Check, Crown, Star, Zap } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import './AdminOrders.css';

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
const STATUS_COLORS = {
    'Pending': 'status-pending',
    'Confirmed': 'status-confirmed',
    'Shipped': 'status-shipped',
    'Out for Delivery': 'status-out-for-delivery',
    'Delivered': 'status-delivered'
};

const STATUS_ICONS = {
    'Pending': <Clock size={16} />,
    'Confirmed': <CheckCircle2 size={16} />,
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
    
    // Bulk actions state
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    
    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState(null);

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://eshopper-qtgl.onrender.com';

    // Socket.io setup for real-time updates
    useEffect(() => {
        const socket = io(BASE_URL);
        
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
            setSelectedOrders(new Set());
            setSelectAll(false);
        } catch (error) {
            console.error('❌ Failed to fetch orders:', error);
            showNotification('Failed to load orders', 'error');
        } finally {
            setLoading(false);
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

    const handleOrderSelect = (orderId) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
        setSelectAll(newSelected.size === orders.length && orders.length > 0);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectAll(true);
            setSelectedOrders(new Set(orders.map(o => o.orderId)));
        } else {
            setSelectAll(false);
            setSelectedOrders(new Set());
        }
    };

    const handleBulkConfirm = async () => {
        if (selectedOrders.size === 0) {
            showNotification('Please select at least one order', 'info');
            return;
        }

        try {
            setBulkUpdating(true);
            const ordersToConfirm = Array.from(selectedOrders);
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
            setSelectedOrders(new Set());
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

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const filteredOrders = useMemo(() => orders, [orders]);

    if (loading && orders.length === 0) {
        return (
            <div className="admin-orders-page">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Loader2 size={48} className="mx-auto mb-4 animate-spin text-blue-600" />
                        <p className="text-gray-600">Loading orders dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-orders-page"
        >
            {/* Premium Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="admin-orders-header"
            >
                <div className="admin-orders-header-left">
                    <h1 className="admin-orders-title flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Crown size={32} className="text-yellow-600" />
                        </motion.div>
                        Premium Orders
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                        >
                            <Star size={24} className="text-yellow-500" />
                        </motion.div>
                    </h1>
                    <p className="text-gray-600 mt-2">Luxury order management with real-time updates & premium automation</p>
                </div>
            </motion.div>

            {/* Premium Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ y: -20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.95 }}
                        className={`mb-6 p-4 rounded-lg border-l-4 flex items-center gap-3 ${
                            notification.type === 'success'
                                ? 'bg-green-50 border-green-400 text-green-800'
                                : notification.type === 'error'
                                ? 'bg-red-50 border-red-400 text-red-800'
                                : 'bg-blue-50 border-blue-400 text-blue-800'
                        }`}
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                        >
                            {notification.type === 'success' && <CheckCircle2 size={20} />}
                            {notification.type === 'error' && <AlertCircle size={20} />}
                            {notification.type === 'info' && <Zap size={20} />}
                        </motion.div>
                        <span>{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Search & Filter & Bulk Actions */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="admin-orders-card-glass"
            >
                <div className="admin-orders-toolbar">
                    {/* Premium Search */}
                    <div className="admin-toolbar-item search-item">
                        <label className="premium-label">
                            <Search size={16} className="inline mr-2" />
                            Search Orders
                        </label>
                        <div className="relative">
                            <motion.input
                                whileFocus={{ scale: 1.02 }}
                                type="text"
                                placeholder="Order ID, Name, Email..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="premium-input"
                            />
                        </div>
                    </div>

                    {/* Premium Status Filter */}
                    <div className="admin-toolbar-item">
                        <label className="premium-label">
                            <Filter size={16} className="inline mr-2" />
                            Filter by Status
                        </label>
                        <div className="relative">
                            <motion.select
                                whileFocus={{ scale: 1.02 }}
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    setPage(1);
                                }}
                                className="premium-input"
                            >
                                <option value="">All Statuses</option>
                                {ALLOWED_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </motion.select>
                        </div>
                    </div>

                    {/* Premium Selection Stats */}
                    <div className="admin-toolbar-item">
                        <label className="premium-label">
                            <Package size={16} className="inline mr-2" />
                            Selection Stats
                        </label>
                        <div className="premium-input flex items-center justify-center bg-gray-50">
                            <motion.span
                                key={selectedOrders.size}
                                initial={{ scale: 1.2, color: '#6366f1' }}
                                animate={{ scale: 1, color: '#0f172a' }}
                                className="font-bold"
                            >
                                {selectedOrders.size} selected
                            </motion.span>
                        </div>
                    </div>
                </div>

                {/* Premium Bulk Actions Bar */}
                <AnimatePresence>
                    {selectedOrders.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="admin-bulk-bar"
                        >
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                    <Zap size={20} className="text-green-600" />
                                </motion.div>
                                <span className="font-semibold text-gray-700">
                                    Bulk Actions ({selectedOrders.size} selected)
                                </span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleBulkConfirm}
                                disabled={bulkUpdating}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {bulkUpdating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    <>
                                        <Crown size={16} />
                                        Bulk Confirm & Send Premium Emails
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Premium Orders Table */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="admin-orders-table-wrap"
            >
                {filteredOrders.length === 0 ? (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-8 text-center"
                    >
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            <Package size={80} className="mx-auto text-gray-300 mb-4" />
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-700">No Premium Orders Found</h3>
                        <p className="text-gray-500">Your luxury orders will appear here when available</p>
                    </motion.div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="admin-orders-table">
                            <thead>
                                <tr>
                                    <th className="text-center">
                                        <motion.input
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            type="checkbox"
                                            checked={selectAll && orders.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 cursor-pointer accent-indigo-600"
                                        />
                                    </th>
                                    <th><Crown size={16} className="inline mr-2" />Order ID</th>
                                    <th><Package size={16} className="inline mr-2" />Customer</th>
                                    <th>Email</th>
                                    <th><Star size={16} className="inline mr-2" />Amount</th>
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
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="order-row-premium"
                                        >
                                            <td className="text-center">
                                                <motion.input
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.orderId)}
                                                    onChange={() => handleOrderSelect(order.orderId)}
                                                    className="w-4 h-4 cursor-pointer accent-indigo-600"
                                                />
                                            </td>
                                            <td className="order-id-cell">
                                                <motion.span
                                                    whileHover={{ scale: 1.05 }}
                                                    className="font-mono text-indigo-600 font-semibold"
                                                >
                                                    {order.orderId.slice(-8)}
                                                </motion.span>
                                            </td>
                                            <td>
                                                <motion.p
                                                    whileHover={{ scale: 1.05 }}
                                                    className="font-semibold text-gray-900"
                                                >
                                                    {order.userName}
                                                </motion.p>
                                            </td>
                                            <td>
                                                <p className="text-sm text-gray-600">{order.userEmail}</p>
                                            </td>
                                            <td>
                                                <motion.div
                                                    whileHover={{ scale: 1.1 }}
                                                    className="flex items-center gap-1 font-bold text-green-600"
                                                >
                                                    <Star size={14} className="text-yellow-500" />
                                                    ₹{order.finalAmount.toLocaleString('en-IN')}
                                                </motion.div>
                                            </td>
                                            <td>
                                                <motion.span
                                                    whileHover={{ scale: 1.05 }}
                                                    className={`status-pill ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS['Pending']}`}
                                                >
                                                    {STATUS_ICONS[order.orderStatus] || STATUS_ICONS['Pending']}
                                                    {order.orderStatus}
                                                </motion.span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Package size={14} />
                                                    {order.productCount || order.products?.length || 0}
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(order.updatedAt).toLocaleDateString('en-IN')}
                                                </p>
                                            </td>
                                            <td>
                                                <div className="relative">
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setDropdownOpen(dropdownOpen === order.orderId ? null : order.orderId)}
                                                        disabled={updating === order.orderId}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {updating === order.orderId ? (
                                                            <>
                                                                <Loader2 size={16} className="animate-spin" />
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Zap size={16} />
                                                                Update
                                                                <ChevronDown size={16} className={`transition-transform ${dropdownOpen === order.orderId ? 'rotate-180' : ''}`} />
                                                            </>
                                                        )}
                                                    </motion.button>

                                                    {/* Status Dropdown */}
                                                    <AnimatePresence>
                                                        {dropdownOpen === order.orderId && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                className="admin-status-dropdown"
                                                            >
                                                                {ALLOWED_STATUSES.map((status) => (
                                                                    <motion.button
                                                                        key={status}
                                                                        whileHover={{ scale: 1.02, x: 5 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                        onClick={() => updateOrderStatus(order.orderId, status)}
                                                                        disabled={updating === order.orderId || order.orderStatus === status}
                                                                        className={`admin-status-option ${order.orderStatus === status ? 'disabled' : ''}`}
                                                                    >
                                                                        <motion.div
                                                                            animate={order.orderStatus === status ? { rotate: [0, 360] } : {}}
                                                                            transition={{ duration: 0.5 }}
                                                                        >
                                                                            {STATUS_ICONS[status]}
                                                                        </motion.div>
                                                                        {status}
                                                                        {order.orderStatus === status && (
                                                                            <motion.div
                                                                                initial={{ scale: 0 }}
                                                                                animate={{ scale: 1 }}
                                                                            >
                                                                                <Check size={14} />
                                                                            </motion.div>
                                                                        )}
                                                                    </motion.button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </motion.tr>

                        {/* Status History */}
                        <AnimatePresence>
                            {expandedHistory === order.orderId && order.statusHistory && (
                                <motion.tr
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-blue-50"
                                >
                                    <td colSpan="9" className="p-4">
                                        <motion.div
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="admin-orders-card-glass mt-2 mb-2"
                                        >
                                            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-800">
                                                <Clock size={20} className="text-blue-600" />
                                                Status History
                                            </h4>
                                            <div className="space-y-2">
                                                {order.statusHistory && order.statusHistory.map((entry, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ x: -20, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="history-item flex items-start gap-3 p-3 rounded-lg bg-white border-l-4 border-blue-400"
                                                    >
                                                        <motion.div
                                                            animate={{ rotate: [0, 360] }}
                                                            transition={{ duration: 2, delay: idx * 0.2 }}
                                                            className="text-blue-600 mt-1"
                                                        >
                                                            <Star size={16} />
                                                        </motion.div>
                                                        <div className="flex-1">
                                                            <div className="history-time text-sm text-gray-500">
                                                                <Clock size={12} className="inline mr-1" />
                                                                {new Date(entry.timestamp).toLocaleDateString('en-IN')} {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <p className="font-semibold text-gray-800">Status: {entry.status}</p>
                                                            {entry.message && <p className="text-sm text-gray-600">{entry.message}</p>}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </td>
                                </motion.tr>
                            )}
                        </AnimatePresence>

                        {/* History Toggle */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <motion.tr className="bg-gray-50">
                                <td colSpan="9" className="px-6 py-2">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setExpandedHistory(expandedHistory === order.orderId ? null : order.orderId)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-2"
                                    >
                                        <motion.div
                                            animate={{ rotate: expandedHistory === order.orderId ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="inline-block mr-2"
                                        >
                                            <ChevronDown size={14} />
                                        </motion.div>
                                        {expandedHistory === order.orderId ? 'Hide History' : `Show History (${order.statusHistory.length})`}
                                    </motion.button>
                                </td>
                            </motion.tr>
                        )}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
    </div>
)}
</motion.div>

            {/* Pagination */}
            <AnimatePresence>
                {totalPages > 1 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex justify-center items-center gap-2 mt-6"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-2"
                        >
                            <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                            Previous
                        </motion.button>

                        <div className="flex gap-2">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }

                                return (
                                    <motion.button
                                        key={pageNum}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setPage(pageNum)}
                                        className={`px-3 py-2 rounded-lg transition-all ${
                                            page === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </motion.button>
                                );
                            })}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-2"
                        >
                            Next
                            <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center mt-8"
            >
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="admin-orders-card-glass inline-block"
                >
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        >
                            <Crown size={24} className="text-indigo-600" />
                        </motion.div>
                        <p className="text-gray-800 font-semibold">
                            Page {page} of {totalPages}
                        </p>
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Star size={20} className="text-yellow-500" />
                        </motion.div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                        <motion.div
                            whileHover={{ scale: 1.05, color: '#6366f1' }}
                            className="flex items-center gap-1"
                        >
                            <Zap size={14} />
                            Real-time Updates
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 1.05, color: '#6366f1' }}
                            className="flex items-center gap-1"
                        >
                            <Crown size={14} />
                            Bulk Actions
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 1.05, color: '#6366f1' }}
                            className="flex items-center gap-1"
                        >
                            <Clock size={14} />
                            Status History
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 1.05, color: '#6366f1' }}
                            className="flex items-center gap-1"
                        >
                            <Star size={14} />
                            Email Automation
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
                       