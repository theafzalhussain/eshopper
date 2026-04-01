import React, { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Loader2,
    MapPin,
    Package,
    Search,
    Truck
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import io from 'socket.io-client';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import { BASE_URL as SHARED_BASE_URL } from '../../constants';
import './AdminOrders.css';

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

const STATUS_COLORS = {
    Pending: 'status-pending',
    Confirmed: 'status-confirmed',
    Shipped: 'status-shipped',
    'Out for Delivery': 'status-out-for-delivery',
    Delivered: 'status-delivered'
};

const STATUS_ICONS = {
    Pending: Clock,
    Confirmed: CheckCircle2,
    Shipped: Truck,
    'Out for Delivery': MapPin,
    Delivered: CheckCircle2
};

const PAYMENT_STATUSES = ['All', 'Paid', 'Pending', 'Failed', 'COD'];

const inDateRange = (updatedAt, fromDate, toDate) => {
    if (!fromDate && !toDate) return true;
    const value = new Date(updatedAt || Date.now());
    if (Number.isNaN(value.getTime())) return false;

    if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00`);
        if (value < start) return false;
    }

    if (toDate) {
        const end = new Date(`${toDate}T23:59:59`);
        if (value > end) return false;
    }

    return true;
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [updating, setUpdating] = useState('');
    const [bulkStatus, setBulkStatus] = useState('Confirmed');
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [detailOrder, setDetailOrder] = useState(null);

    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const localApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const remoteApiUrl = process.env.REACT_APP_BASE_URL || SHARED_BASE_URL || 'https://eshopper-qtgl.onrender.com';
    const [apiBaseUrl, setApiBaseUrl] = useState(isLocalHost ? localApiUrl : remoteApiUrl);
    const adminSecret = process.env.REACT_APP_ADMIN_SECRET;

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 25,
                ...(search && { search }),
                ...(selectedStatus && { status: selectedStatus }),
                ...(fromDate && { fromDate }),
                ...(toDate && { toDate }),
                ...(paymentStatus !== 'All' && { paymentStatus }),
                ...(adminSecret && { adminSecret })
            };

            const response = await axios.get(`${apiBaseUrl}/api/admin/orders`, {
                params,
                headers: adminSecret ? { 'x-admin-secret': adminSecret } : {}
            });
            setOrders(response.data.orders || []);
            setTotalPages(response.data.pages || 0);
            setSelectedOrders(new Set());
            setSelectAll(false);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // Local dev safety: if remote API blocks localhost via CORS, switch to local API automatically.
            if (isLocalHost && !String(apiBaseUrl).includes('localhost')) {
                setApiBaseUrl(localApiUrl);
                showNotification('Remote API blocked localhost. Switched to local backend URL.', 'info');
                return;
            }
            // Local dev fallback: if local backend is not running, try hosted API once.
            if (isLocalHost && String(apiBaseUrl).includes('localhost') && remoteApiUrl !== apiBaseUrl) {
                setApiBaseUrl(remoteApiUrl);
                showNotification('Local backend not reachable. Trying hosted API URL.', 'info');
                return;
            }
            showNotification('Failed to load orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [apiBaseUrl, page, search, selectedStatus, fromDate, toDate, paymentStatus]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const timer = setInterval(() => {
            fetchOrders();
        }, 30000);
        return () => clearInterval(timer);
    }, [apiBaseUrl, autoRefresh, page, search, selectedStatus, fromDate, toDate, paymentStatus]);

    useEffect(() => {
        const socket = io(apiBaseUrl, {
            transports: ['websocket'],
            withCredentials: true,
            reconnectionAttempts: 3,
            timeout: 8000
        });

        const handleStatusUpdate = (payload) => {
            setOrders((prev) => prev.map((order) => (
                order.orderId === payload.orderId
                    ? { ...order, orderStatus: payload.status, updatedAt: payload.updatedAt }
                    : order
            )));
        };

        socket.on('connect_error', (err) => {
            console.warn('Socket connection failed:', err.message);
        });

        socket.on('statusUpdate', handleStatusUpdate);
        return () => {
            socket.off('statusUpdate', handleStatusUpdate);
            socket.disconnect();
        };
    }, [apiBaseUrl]);

    const filteredOrders = useMemo(() => orders.filter((order) => inDateRange(order.updatedAt, fromDate, toDate)), [orders, fromDate, toDate]);

    const handleOrderSelect = (orderId) => {
        const next = new Set(selectedOrders);
        if (next.has(orderId)) next.delete(orderId);
        else next.add(orderId);
        setSelectedOrders(next);
        setSelectAll(next.size === filteredOrders.length && filteredOrders.length > 0);
    };

    const handleSelectAll = (checked) => {
        if (!checked) {
            setSelectedOrders(new Set());
            setSelectAll(false);
            return;
        }

        setSelectedOrders(new Set(filteredOrders.map((o) => o.orderId)));
        setSelectAll(true);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setUpdating(orderId);
            const endpoint = newStatus === 'Confirmed'
                ? `${apiBaseUrl}/api/admin/confirm-order`
                : `${apiBaseUrl}/api/update-order-status`;

            const config = newStatus === 'Confirmed'
                ? { headers: adminSecret ? { 'x-admin-secret': adminSecret } : {} }
                : {};

            const response = newStatus === 'Confirmed'
                ? await axios.post(endpoint, { orderId }, config)
                : await axios.post(endpoint, { orderId, status: newStatus });

            if (response.data.success) {
                showNotification(`Order ${orderId} updated to ${newStatus}`, 'success');
                fetchOrders();
            } else {
                showNotification('Status update failed', 'error');
            }
        } catch (error) {
            console.error('Update failed:', error);
            showNotification('Failed to update order status', 'error');
        } finally {
            setUpdating('');
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedOrders.size === 0) {
            showNotification('Select at least one order first', 'info');
            return;
        }

        setBulkUpdating(true);
        let success = 0;
        let failed = 0;

        for (const orderId of Array.from(selectedOrders)) {
            try {
                const endpoint = bulkStatus === 'Confirmed'
                    ? `${apiBaseUrl}/api/admin/confirm-order`
                    : `${apiBaseUrl}/api/update-order-status`;

                const config = bulkStatus === 'Confirmed'
                    ? { headers: adminSecret ? { 'x-admin-secret': adminSecret } : {} }
                    : {};

                const response = bulkStatus === 'Confirmed'
                    ? await axios.post(endpoint, { orderId }, config)
                    : await axios.post(endpoint, { orderId, status: bulkStatus });

                if (response.data.success) success += 1;
                else failed += 1;
            } catch (error) {
                failed += 1;
            }
        }

        setBulkUpdating(false);
        setSelectedOrders(new Set());
        setSelectAll(false);
        showNotification(`Bulk update done: ${success} success, ${failed} failed`, failed > 0 ? 'info' : 'success');
        fetchOrders();
    };

    const exportCsv = () => {
        if (filteredOrders.length === 0) {
            showNotification('No orders available for export', 'info');
            return;
        }

        const headers = ['Order ID', 'Customer', 'Email', 'Amount', 'Status', 'Payment', 'Items', 'Updated'];
        const rows = filteredOrders.map((o) => [
            o.orderId,
            o.userName || '',
            o.userEmail || '',
            o.finalAmount || 0,
            o.orderStatus || '',
            o.paymentStatus || '',
            o.productCount || (o.products || []).length || 0,
            new Date(o.updatedAt || Date.now()).toLocaleString('en-IN')
        ]);

        const csv = [headers, ...rows]
            .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPdf = () => {
        if (filteredOrders.length === 0) {
            showNotification('No orders available for export', 'info');
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text('eShopper Admin Orders Export', 14, 14);

        autoTable(doc, {
            startY: 20,
            head: [['Order ID', 'Customer', 'Email', 'Amount', 'Status', 'Payment', 'Items', 'Updated']],
            body: filteredOrders.map((o) => [
                String(o.orderId || ''),
                String(o.userName || ''),
                String(o.userEmail || ''),
                `INR ${Number(o.finalAmount || 0).toLocaleString('en-IN')}`,
                String(o.orderStatus || ''),
                String(o.paymentStatus || ''),
                String(o.productCount || (o.products || []).length || 0),
                new Date(o.updatedAt || Date.now()).toLocaleDateString('en-IN')
            ]),
            styles: { fontSize: 8 }
        });

        doc.save(`orders-export-${Date.now()}.pdf`);
    };

    const stats = useMemo(() => {
        const total = filteredOrders.length;
        const selected = selectedOrders.size;
        const revenue = filteredOrders.reduce((sum, o) => sum + Number(o.finalAmount || 0), 0);
        return { total, selected, revenue };
    }, [filteredOrders, selectedOrders]);

    return (
        <div className="admin-orders-page premium-layout-keep">
            <div className="orders-toolbar-panel">
                <div className="filter-grid">
                    <div className="filter-item filter-search">
                        <label>Search (Order ID / Name / Email)</label>
                        <div className="search-input-wrap">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="filter-item">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate || undefined}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    <div className="filter-item">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    <div className="filter-item">
                        <label>Payment Status</label>
                        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                            {PAYMENT_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>Filter by Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All</option>
                            {ALLOWED_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="toolbar-second-row">
                    <div className="toolbar-stats">
                        <span>Selected: {stats.selected}</span>
                        <span>Orders: {stats.total}</span>
                        <span>Revenue: INR {stats.revenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="toolbar-actions">
                        <label className="auto-refresh-toggle">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            Auto refresh
                        </label>
                        <button className="btn-export btn-csv" onClick={exportCsv}>
                            <Download size={14} /> Export CSV
                        </button>
                        <button className="btn-export btn-pdf" onClick={exportPdf}>
                            <FileText size={14} /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="bulk-row">
                    <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                        {ALLOWED_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <button onClick={handleBulkUpdate} disabled={bulkUpdating}>
                        {bulkUpdating ? <Loader2 size={14} className="spin" /> : <Package size={14} />} Bulk Update Selected
                    </button>
                </div>
            </div>

            {notification && (
                <div className={`orders-notification ${notification.type}`}>{notification.message}</div>
            )}

            <div className="admin-orders-table-wrap">
                {loading ? (
                    <div className="loading-block">
                        <Loader2 size={20} className="spin" /> Loading orders...
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="loading-block">No orders found for selected filters.</div>
                ) : (
                    <table className="admin-orders-table keep-layout-table">
                        <thead>
                            <tr>
                                <th className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectAll && filteredOrders.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
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
                            {filteredOrders.map((order) => {
                                const IconComp = STATUS_ICONS[order.orderStatus] || STATUS_ICONS.Pending;
                                const statusClass = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.Pending;

                                return (
                                    <tr key={order.orderId}>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.has(order.orderId)}
                                                onChange={() => handleOrderSelect(order.orderId)}
                                            />
                                        </td>
                                        <td className="order-id-col">
                                            <div>{String(order.orderId || '').slice(-8)}</div>
                                            <button className="details-link" onClick={() => setDetailOrder(order)}>View Details</button>
                                        </td>
                                        <td>{order.userName || 'N/A'}</td>
                                        <td>{order.userEmail || 'N/A'}</td>
                                        <td className="amount-col">INR {Number(order.finalAmount || 0).toLocaleString('en-IN')}</td>
                                        <td>
                                            <span className={`status-pill ${statusClass}`}>
                                                <IconComp size={13} /> {order.orderStatus || 'Pending'}
                                            </span>
                                        </td>
                                        <td>{order.productCount || (order.products || []).length || 0} items</td>
                                        <td>{new Date(order.updatedAt || Date.now()).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <select
                                                disabled={updating === order.orderId}
                                                value={order.orderStatus || 'Pending'}
                                                onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                                            >
                                                {ALLOWED_STATUSES.map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-row">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                    <span>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                </div>
            )}

            <OrderDetailsDrawer
                open={Boolean(detailOrder)}
                onClose={() => setDetailOrder(null)}
                order={detailOrder}
            />
        </div>
    );
}
