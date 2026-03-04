import React, { useState, useEffect, useMemo } from 'react';
import { Package, Loader2, Search, Filter, AlertCircle, CheckCircle2, Clock, Truck, MapPin, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
const STATUS_COLORS = {
    'Pending': 'bg-red-100 text-red-800 border-red-300',
    'Confirmed': 'bg-green-100 text-green-800 border-green-300',
    'Shipped': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Out for Delivery': 'bg-lime-100 text-lime-800 border-lime-300',
    'Delivered': 'bg-blue-100 text-blue-800 border-blue-300'
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

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://api.eshopperr.me';

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-blue-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8"
        >
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                    <Package className="text-blue-600" size={32} />
                    Manage Orders
                </h1>
                <p className="text-gray-600">Premium order management with real-time updates & bulk actions</p>
            </div>

            {/* Notification */}
            {notification && (
                <motion.div 
                    initial={{ y: -20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className={`mb-6 p-4 rounded-lg border-l-4 flex items-center gap-3 ${
                        notification.type === 'success' 
                            ? 'bg-green-50 border-green-400 text-green-800'
                            : notification.type === 'error'
                            ? 'bg-red-50 border-red-400 text-red-800'
                            : 'bg-blue-50 border-blue-400 text-blue-800'
                    }`}
                >
                    {notification.type === 'success' && <CheckCircle2 size={20} />}
                    {notification.type === 'error' && <AlertCircle size={20} />}
                    {notification.type === 'info' && <Clock size={20} />}
                    <span>{notification.message}</span>
                </motion.div>
            )}

            {/* Search & Filter & Bulk Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search (Order ID / Name / Email)
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Status
                        </label>
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                {ALLOWED_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Selection Stats */}
                    <div className="flex flex-col justify-end">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Selected: {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedOrders.size > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-4 border-t border-gray-200 flex gap-3 flex-wrap items-center"
                    >
                        <span className="text-sm font-medium text-gray-700">
                            Bulk Actions ({selectedOrders.size} selected):
                        </span>
                        <button
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
                                    <CheckCircle2 size={16} />
                                    Bulk Confirm Orders & Send Emails
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-600 text-lg">No orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectAll && orders.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Items</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Updated</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredOrders.map((order, index) => (
                                    <React.Fragment key={order.orderId}>
                                        <motion.tr 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.orderId)}
                                                    onChange={() => handleOrderSelect(order.orderId)}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm text-blue-600 font-semibold">
                                                    {order.orderId.slice(-8)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-900">{order.userName}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600">{order.userEmail}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-green-600">₹{order.finalAmount.toLocaleString('en-IN')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS['Pending']}`}>
                                                    {STATUS_ICONS[order.orderStatus] || STATUS_ICONS['Pending']}
                                                    {order.orderStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600">{order.productCount || order.products?.length || 0} item{order.productCount !== 1 ? 's' : ''}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-500">
                                                    {new Date(order.updatedAt).toLocaleDateString('en-IN')}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setDropdownOpen(dropdownOpen === order.orderId ? null : order.orderId)}
                                                        disabled={updating === order.orderId}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {updating === order.orderId ? (
                                                            <>
                                                                <Loader2 size={16} className="animate-spin" />
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Update Status
                                                                <ChevronDown size={16} className={`transition-transform ${dropdownOpen === order.orderId ? 'rotate-180' : ''}`} />
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Status Dropdown */}
                                                    {dropdownOpen === order.orderId && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 min-w-max"
                                                        >
                                                            {ALLOWED_STATUSES.map((status) => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => updateOrderStatus(order.orderId, status)}
                                                                    disabled={updating === order.orderId || order.orderStatus === status}
                                                                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                                                                        order.orderStatus === status
                                                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                                            : status === 'Confirmed'
                                                                            ? 'text-green-600 hover:bg-green-50'
                                                                            : 'text-gray-700 hover:bg-blue-50'
                                                                    }`}
                                                                >
                                                                    {STATUS_ICONS[status]}
                                                                    {status}
                                                                    {order.orderStatus === status && <Check size={14} />}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>

                                        {/* Status History */}
                                        {expandedHistory === order.orderId && order.statusHistory && (
                                            <motion.tr
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-gray-50"
                                            >
                                                <td colSpan="9" className="px-6 py-4">
                                                    <div className="bg-white rounded p-4 border border-gray-200">
                                                        <h4 className="font-semibold text-gray-900 mb-3">📋 Status History</h4>
                                                        <div className="space-y-2">
                                                            {order.statusHistory && order.statusHistory.map((entry, idx) => (
                                                                <div key={idx} className="flex items-start gap-3 p-2 border-l-2 border-blue-400 bg-blue-50 rounded">
                                                                    <span className="text-xs font-mono text-gray-700 whitespace-nowrap">
                                                                        {new Date(entry.timestamp).toLocaleDateString('en-IN')} {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-gray-900">Status: {entry.status}</p>
                                                                        {entry.message && <p className="text-xs text-gray-600">{entry.message}</p>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}

                                        {/* Toggle History Button */}
                                        {order.statusHistory && order.statusHistory.length > 0 && (
                                            <motion.tr className="bg-gray-50">
                                                <td colSpan="9" className="px-6 py-2">
                                                    <button
                                                        onClick={() => setExpandedHistory(expandedHistory === order.orderId ? null : order.orderId)}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        {expandedHistory === order.orderId ? '▼ Hide History' : `▶ Show History (${order.statusHistory.length})`}
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-2 rounded-lg transition-all ${
                                    page === p
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-6 text-center text-sm text-gray-600">
                <p>Showing page {page} of {totalPages}</p>
                <p className="text-xs mt-2">✨ Premium Features: Real-time updates • Bulk Actions • Status History • Email Automation</p>
            </div>
        </motion.div>
    );
}
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                    <Package className="text-blue-600" size={32} />
                    Manage Orders
                </h1>
                <p className="text-gray-600">Update order status and track real-time changes</p>
            </div>

            {/* Notification */}
            {notification && (
                <motion.div 
                    initial={{ y: -20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className={`mb-6 p-4 rounded-lg border-l-4 flex items-center gap-3 ${
                        notification.type === 'success' 
                            ? 'bg-green-50 border-green-400 text-green-800'
                            : notification.type === 'error'
                            ? 'bg-red-50 border-red-400 text-red-800'
                            : 'bg-blue-50 border-blue-400 text-blue-800'
                    }`}
                >
                    {notification.type === 'success' && <CheckCircle2 size={20} />}
                    {notification.type === 'error' && <AlertCircle size={20} />}
                    {notification.type === 'info' && <Clock size={20} />}
                    <span>{notification.message}</span>
                </motion.div>
            )}

            {/* Search & Filter */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search (Order ID / Name / Email)
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Status
                        </label>
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                {ALLOWED_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-600 text-lg">No orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Items</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Updated</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredOrders.map((order, index) => (
                                    <motion.tr 
                                        key={order.orderId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-blue-600 font-semibold">
                                                {order.orderId.slice(-8)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{order.userName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600">{order.userEmail}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-green-600">₹{order.finalAmount.toLocaleString('en-IN')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS['Ordered']}`}>
                                                {STATUS_ICONS[order.orderStatus] || STATUS_ICONS['Ordered']}
                                                {order.orderStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600">{order.productCount} item{order.productCount !== 1 ? 's' : ''}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-500">
                                                {new Date(order.updatedAt).toLocaleDateString('en-IN')}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => updateOrderStatus(order.orderId, order.orderStatus)}
                                                disabled={updating === order.orderId || !NEXT_STATUS[order.orderStatus]}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    updating === order.orderId
                                                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                                                        : !NEXT_STATUS[order.orderStatus]
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:scale-105'
                                                }`}
                                            >
                                                {updating === order.orderId ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Updating...
                                                    </span>
                                                ) : NEXT_STATUS[order.orderStatus] ? (
                                                    `Update to ${NEXT_STATUS[order.orderStatus]}`
                                                ) : (
                                                    'Completed'
                                                )}
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-2 rounded-lg transition-all ${
                                    page === p
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-6 text-center text-sm text-gray-600">
                <p>Showing page {page} of {totalPages}</p>
                <p className="text-xs mt-2">Real-time updates enabled • Updates reflect instantly across all user devices</p>
            </div>
        </motion.div>
    );
}
