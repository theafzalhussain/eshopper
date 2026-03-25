import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, FileText, X, Calendar } from 'lucide-react';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import { Package, Loader2, Search, Filter, AlertCircle, CheckCircle2, Clock, Truck, MapPin, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import LefNav from './LefNav';
import './AdminOrders.css';
import './LuxeTable.css';
import './AdminResponsive.css';

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
    const [searchInput, setSearchInput] = useState('');
    const searchInputRef = useRef(null);
    const debounceTimeout = useRef();
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    // Advanced filter states
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');

    const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
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

    // Status Update Sidebar state
    const [statusModal, setStatusModal] = useState({ open: false, order: null });
    const [modalStatus, setModalStatus] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [quickDateSelection, setQuickDateSelection] = useState(''); // 'today', 'tomorrow', 'custom'
    const [deliveryTimeline, setDeliveryTimeline] = useState(3); // 3-7 days slider
    const [adminNote, setAdminNote] = useState(''); // Admin internal note

    // Order Summary Modal state
    const [summaryModal, setSummaryModal] = useState({ open: false, order: null });

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

    // =====================================================
    // FULL-STACK CONNECTION: React State Management
    // =====================================================
    // Real-time filters working via React state + useEffect:
    // - All filter states (search, selectedStatus, fromDate, toDate, paymentStatus)
    //   trigger fetchOrders() when changed
    // - Debounced search (400ms) prevents excessive API calls
    // - Socket.io provides real-time order status updates
    // - Backend endpoint: GET /api/admin/orders with query params
    // =====================================================

    // Fetch orders on mount and when page/search/status changes
    useEffect(() => {
        fetchOrders();
    }, [page, search, selectedStatus, fromDate, toDate, paymentStatus]);

    // Debounce search: update search param after user stops typing for 400ms
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(debounceTimeout.current);
    }, [searchInput]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                ...(search && { search }),
                ...(selectedStatus && { status: selectedStatus }),
                ...(fromDate && { fromDate }),
                ...(toDate && { toDate }),
                ...(paymentStatus && { paymentStatus })
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
            const response = await axios.get(`${BASE_URL}/api/admin/order/${orderId}`,
                { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET } }
            );
            if (response.data && response.data.success && response.data.order) {
                setDrawerOrder(response.data.order);
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

    // Open Status Update Sidebar
    const openStatusModal = (order) => {
        setStatusModal({ open: true, order });
        setModalStatus(order.orderStatus || 'Order Placed');
        setDeliveryDate('');
        setDeliveryTime('');
        setQuickDateSelection('');
        setDeliveryTimeline(3);
        setAdminNote('');
        setDropdownOpen(null);
    };

    // Close Status Update Sidebar
    const closeStatusModal = () => {
        setStatusModal({ open: false, order: null });
        setModalStatus('');
        setDeliveryDate('');
        setDeliveryTime('');
        setQuickDateSelection('');
        setDeliveryTimeline(3);
        setAdminNote('');
    };

    // Quick Date Selection Handler
    const handleQuickDate = (type) => {
        setQuickDateSelection(type);
        const today = new Date();
        if (type === 'today') {
            setDeliveryDate(today.toISOString().split('T')[0]);
        } else if (type === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDeliveryDate(tomorrow.toISOString().split('T')[0]);
        } else {
            setDeliveryDate('');
        }
    };

    // Open Order Summary Modal
    const openSummaryModal = (order) => {
        setSummaryModal({ open: true, order });
    };

    // Close Order Summary Modal
    const closeSummaryModal = () => {
        setSummaryModal({ open: false, order: null });
    };

    // =====================================================
    // FULL-STACK CONNECTION: Status Update with Delivery Schedule
    // =====================================================
    // Frontend: Modal collects status + deliveryDate + deliveryTime
    // Backend: Node.js API updates MongoDB with:
    //   - orderStatus: New status value
    //   - deliverySchedule: { date, time, scheduledAt }
    //   - statusHistory: Array with timestamp, status, message
    // Endpoints:
    //   - POST /api/admin/confirm-order (for Confirmed status + email)
    //   - POST /api/update-order-status (for other statuses)
    // =====================================================

    // Handle Modal Status Update with Delivery Schedule
    const handleModalStatusUpdate = async () => {
        if (!statusModal.order) return;

        const orderId = statusModal.order.orderId;
        const newStatus = modalStatus;

        // Build delivery schedule with timeline
        let deliverySchedule = null;
        if (deliveryDate || deliveryTime || deliveryTimeline) {
            const estimatedDate = new Date();
            estimatedDate.setDate(estimatedDate.getDate() + deliveryTimeline);

            deliverySchedule = {
                date: deliveryDate || null,
                time: deliveryTime || null,
                scheduledAt: deliveryDate ? new Date(`${deliveryDate}T${deliveryTime || '12:00'}`).toISOString() : null,
                estimatedDays: deliveryTimeline,
                estimatedDelivery: estimatedDate.toISOString()
            };
        }

        // Include admin note in status history
        const statusNote = adminNote.trim() || null;

        try {
            setUpdating(orderId);

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

            const payload = newStatus === 'Confirmed'
                ? { orderId, deliverySchedule, adminNote: statusNote }
                : { orderId, status: newStatus, deliverySchedule, adminNote: statusNote };

            const response = newStatus === 'Confirmed'
                ? await axios.post(endpoint, payload, config)
                : await axios.post(endpoint, payload);

            if (response.data.success) {
                closeStatusModal();
                const emailInfo = newStatus === 'Confirmed' && response.data.emailSent
                    ? ' & Premium Email Sent! 📧'
                    : '';
                const scheduleInfo = deliverySchedule?.date
                    ? ` | Delivery: ${deliveryDate}${deliveryTime ? ' at ' + deliveryTime : ''}`
                    : '';
                showNotification(`✅ Status updated to ${newStatus}${emailInfo}${scheduleInfo}`, 'success');
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

    // Handler for Generate Invoice
    const handleGenerateInvoice = (order) => {
        // TODO: Implement invoice PDF generation logic
        alert(`Invoice generation for Order #${order.orderId} coming soon!`);
    };

    // Handler for Generate Shipping Label
    const handleGenerateShippingLabel = (order) => {
        // TODO: Implement shipping label PDF logic
        alert(`Shipping label for Order #${order.orderId} coming soon!`);
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
                            {/* Header with Export Buttons */}
                            <div className="admin-orders-header">
                                <div className="admin-orders-header-left">
                                    <h1 className="admin-orders-title d-flex align-items-center mb-2">
                                        <Package className="text-info mr-2" size={30} />
                                        Manage Orders
                                    </h1>
                                    <p className="text-muted mb-0">Premium order management with real-time updates & bulk actions</p>
                                </div>
                                <div className="admin-orders-header-right">
                                    <button
                                        className="export-btn-premium export-csv-btn-premium"
                                        onClick={exportOrdersToCSV}
                                        title="Export orders as CSV"
                                    >
                                        <Download size={18} className="export-btn-icon" />
                                        Export CSV
                                    </button>
                                    <button
                                        className="export-btn-premium export-pdf-btn-premium"
                                        onClick={exportOrdersToPDF}
                                        title="Export orders as PDF"
                                    >
                                        <FileText size={18} className="export-btn-icon" />
                                        Export PDF
                                    </button>
                                </div>
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

                            {/* Modern CSS Grid Toolbar */}
                            <div className="admin-orders-toolbar">
                                <div className="admin-toolbar-item search-item">
                                    <label className="premium-label">Search (Order ID / Email)</label>
                                    <div className="premium-input-group">
                                        <Search size={18} className="premium-input-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search orders..."
                                            value={searchInput}
                                            ref={searchInputRef}
                                            onChange={e => setSearchInput(e.target.value)}
                                            className="premium-input"
                                        />
                                    </div>
                                </div>

                                <div className="admin-toolbar-item">
                                    <label className="premium-label">From Date</label>
                                    <input
                                        type="date"
                                        className="premium-input"
                                        value={fromDate}
                                        onChange={e => {
                                            setFromDate(e.target.value);
                                            setPage(1);
                                        }}
                                        max={toDate || undefined}
                                    />
                                </div>

                                <div className="admin-toolbar-item">
                                    <label className="premium-label">To Date</label>
                                    <input
                                        type="date"
                                        className="premium-input"
                                        value={toDate}
                                        onChange={e => {
                                            setToDate(e.target.value);
                                            setPage(1);
                                        }}
                                        min={fromDate || undefined}
                                    />
                                </div>

                                <div className="admin-toolbar-item">
                                    <label className="premium-label">Payment Status</label>
                                    <select
                                        className="premium-input"
                                        value={paymentStatus}
                                        onChange={e => {
                                            setPaymentStatus(e.target.value);
                                            setPage(1);
                                        }}
                                    >
                                        <option value="">All</option>
                                        {PAYMENT_STATUSES.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admin-toolbar-item">
                                    <label className="premium-label">Order Status</label>
                                    <div className="premium-input-group">
                                        <Filter size={18} className="premium-input-icon" />
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => {
                                                setSelectedStatus(e.target.value);
                                                setSearchInput('');
                                                setSearch('');
                                                setPage(1);
                                            }}
                                            className="premium-input"
                                        >
                                            <option value="">All Statuses</option>
                                            {ALLOWED_STATUSES.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
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
                                                            className={`order-row-premium${selectedOrders.includes(order.orderId) ? ' selected' : ''}`}
                                                        >
                                                            <td data-label="Select">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedOrders.includes(order.orderId)}
                                                                    onChange={() => handleOrderSelect(order.orderId)}
                                                                    className="cursor-pointer"
                                                                />
                                                            </td>
                                                            <td data-label="Order ID">
                                                                <span
                                                                    className="luxe-order-id"
                                                                    onClick={() => openSummaryModal(order)}
                                                                    title="Click to view summary"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onKeyPress={e => { if (e.key === 'Enter') openSummaryModal(order); }}
                                                                >
                                                                    {String(order.orderId || '').slice(-8)}
                                                                </span>
                                                            </td>
                                                            <td data-label="Customer" className="font-weight-bold">{order.userName || 'Customer'}</td>
                                                            <td data-label="Email">{order.userEmail || 'N/A'}</td>
                                                            <td data-label="Amount">
                                                                <span className="luxe-amount">
                                                                    <span className="luxe-currency">₹</span>
                                                                    {Number(order.finalAmount || 0).toLocaleString('en-IN')}
                                                                </span>
                                                            </td>
                                                            <td data-label="Status">
                                                                <span className={`status-pill ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS['Order Placed']}`}>
                                                                    {STATUS_ICONS[order.orderStatus] || STATUS_ICONS['Order Placed']}
                                                                    <span>{order.orderStatus || 'Order Placed'}</span>
                                                                </span>
                                                            </td>
                                                            <td data-label="Items">{order.productCount || order.products?.length || 0} item{(order.productCount || order.products?.length || 0) !== 1 ? 's' : ''}</td>
                                                            <td data-label="Updated">{new Date(order.updatedAt).toLocaleDateString('en-IN')}</td>
                                                            <td data-label="Action">
                                                                <button
                                                                    onClick={() => openStatusModal(order)}
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
                                                                            <ChevronDown size={14} className="ml-1" />
                                                                        </>
                                                                    )}
                                                                </button>
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
            </div>

            {/* Premium Status Update Slide-In Sidebar */}
            <div className={`status-sidebar-overlay ${statusModal.open ? 'open' : ''}`} onClick={closeStatusModal} />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: statusModal.open ? 0 : '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`status-sidebar ${statusModal.open ? 'open' : ''}`}
            >
                {/* Sidebar Header */}
                <div className="status-sidebar-header">
                    <div className="status-sidebar-title">
                        <div className="status-sidebar-title-icon">
                            <Package size={22} />
                        </div>
                        <div>
                            <h3>Update Status</h3>
                            <p>Order #{String(statusModal.order?.orderId || '').slice(-8)}</p>
                        </div>
                    </div>
                    <button className="status-sidebar-close" onClick={closeStatusModal}>
                        <X size={20} />
                    </button>
                </div>

                {/* Sidebar Body */}
                <div className="status-sidebar-body">
                    {/* Status Selection */}
                    <div className="sidebar-section">
                        <label className="sidebar-section-label">
                            <CheckCircle2 size={14} />
                            Select New Status
                        </label>
                        <select
                            className="sidebar-select"
                            value={modalStatus}
                            onChange={(e) => setModalStatus(e.target.value)}
                        >
                            {ALLOWED_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    {/* Quick Date Selection */}
                    <div className="sidebar-section">
                        <label className="sidebar-section-label">
                            <Calendar size={14} />
                            Update Date
                        </label>
                        <div className="quick-date-buttons">
                            <button
                                className={`quick-date-btn ${quickDateSelection === 'today' ? 'active' : ''}`}
                                onClick={() => handleQuickDate('today')}
                            >
                                Today
                            </button>
                            <button
                                className={`quick-date-btn ${quickDateSelection === 'tomorrow' ? 'active' : ''}`}
                                onClick={() => handleQuickDate('tomorrow')}
                            >
                                Tomorrow
                            </button>
                            <button
                                className={`quick-date-btn ${quickDateSelection === 'custom' ? 'active' : ''}`}
                                onClick={() => handleQuickDate('custom')}
                            >
                                Custom
                            </button>
                        </div>
                        {quickDateSelection === 'custom' && (
                            <div className="datetime-grid">
                                <input
                                    type="date"
                                    className="sidebar-input"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <input
                                    type="time"
                                    className="sidebar-input"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Delivery Timeline Slider */}
                    <div className="sidebar-section">
                        <label className="sidebar-section-label">
                            <Truck size={14} />
                            Delivery Timeline
                        </label>
                        <div className="timeline-slider-wrap">
                            <div className="timeline-slider-header">
                                <span className="timeline-slider-value">{deliveryTimeline} Days</span>
                                <span className="timeline-slider-label">Estimated Delivery</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={deliveryTimeline}
                                onChange={(e) => setDeliveryTimeline(parseInt(e.target.value))}
                                className="timeline-slider"
                            />
                            <div className="timeline-labels">
                                <span>1 Day</span>
                                <span>5 Days</span>
                                <span>10 Days</span>
                            </div>
                        </div>
                    </div>

                    {/* Admin Internal Note */}
                    <div className="sidebar-section">
                        <label className="sidebar-section-label">
                            <AlertCircle size={14} />
                            Admin Internal Note
                        </label>
                        <textarea
                            className="sidebar-textarea"
                            placeholder="E.g., Order delayed due to stock unavailability..."
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                {/* Sidebar Footer */}
                <div className="status-sidebar-footer">
                    <button className="sidebar-btn sidebar-btn-cancel" onClick={closeStatusModal}>
                        Cancel
                    </button>
                    <button
                        className="sidebar-btn sidebar-btn-confirm"
                        onClick={handleModalStatusUpdate}
                        disabled={updating === statusModal.order?.orderId}
                    >
                        {updating === statusModal.order?.orderId ? (
                            <>
                                <span className="sidebar-spinner"></span>
                                Updating...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Update Status
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Order Summary Modal */}
            {summaryModal.open && summaryModal.order && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="order-summary-overlay"
                    onClick={(e) => e.target === e.currentTarget && closeSummaryModal()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="order-summary-modal"
                    >
                        <div className="order-summary-header">
                            <div>
                                <h3>Order Summary</h3>
                                <span>#{String(summaryModal.order.orderId || '').slice(-8)}</span>
                            </div>
                            <button className="order-summary-close" onClick={closeSummaryModal}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="order-summary-body">
                            <div className="summary-row">
                                <span className="summary-label">Customer</span>
                                <span className="summary-value">{summaryModal.order.userName || 'N/A'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Email</span>
                                <span className="summary-value">{summaryModal.order.userEmail || 'N/A'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Amount</span>
                                <span className="summary-value luxe-amount">
                                    <span className="luxe-currency">₹</span>
                                    {Number(summaryModal.order.finalAmount || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Status</span>
                                <span className={`summary-status status-pill ${STATUS_COLORS[summaryModal.order.orderStatus] || 'status-order-placed'}`}>
                                    {summaryModal.order.orderStatus || 'Order Placed'}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Items</span>
                                <span className="summary-value">{summaryModal.order.productCount || summaryModal.order.products?.length || 0}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Order Date</span>
                                <span className="summary-value">{new Date(summaryModal.order.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Last Updated</span>
                                <span className="summary-value">{new Date(summaryModal.order.updatedAt).toLocaleDateString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="order-summary-footer">
                            <button
                                className="sidebar-btn sidebar-btn-confirm"
                                onClick={() => {
                                    closeSummaryModal();
                                    fetchOrderDetails(summaryModal.order.orderId);
                                }}
                            >
                                View Full Details
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

        <OrderDetailsDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            order={drawerOrder}
            loading={drawerLoading}
        />
          </motion.div>
    );
}
