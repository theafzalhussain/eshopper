import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    Crown,
    Download,
    FileText,
    Loader2,
    MapPin,
    Package,
    RefreshCw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Truck,
    Zap
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import './AdminOrders.css';

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

const STATUS_META = {
    Pending: { icon: AlertCircle, className: 'status-pending' },
    Confirmed: { icon: CheckCircle2, className: 'status-confirmed' },
    Shipped: { icon: Truck, className: 'status-shipped' },
    'Out for Delivery': { icon: MapPin, className: 'status-out-for-delivery' },
    Delivered: { icon: Check, className: 'status-delivered' }
};

const PREF_KEY = 'admin_orders_preferences_v2';

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const getSlaMeta = (updatedAt) => {
    const date = new Date(updatedAt || Date.now());
    const ageHours = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));

    if (ageHours <= 6) return { label: 'On Track', className: 'sla-ok' };
    if (ageHours <= 24) return { label: 'Watch', className: 'sla-watch' };
    return { label: 'Attention', className: 'sla-risk' };
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const [updating, setUpdating] = useState('');
    const [notification, setNotification] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState('');
    const [expandedHistory, setExpandedHistory] = useState('');

    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);

    const [invoices, setInvoices] = useState([]);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceDownloading, setInvoiceDownloading] = useState('');

    const [preferences, setPreferences] = useState({
        cardView: false,
        compact: false,
        autoRefresh: true
    });

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://eshopper-qtgl.onrender.com';

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PREF_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setPreferences((prev) => ({ ...prev, ...parsed }));
        } catch (err) {
            console.warn('Preferences parse failed:', err.message);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    }, [preferences]);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

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
            console.error('Orders fetch failed:', error);
            showNotification('Unable to load orders.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async () => {
        try {
            setInvoiceLoading(true);
            const response = await axios.get(`${BASE_URL}/api/admin/invoices`, {
                params: {
                    page,
                    limit: 8,
                    search,
                    adminSecret: process.env.REACT_APP_ADMIN_SECRET
                }
            });
            setInvoices(response.data.invoices || []);
        } catch (error) {
            console.error('Invoices fetch failed:', error);
            setInvoices([]);
        } finally {
            setInvoiceLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, search, selectedStatus]);

    useEffect(() => {
        fetchInvoices();
    }, [page, search]);

    useEffect(() => {
        const socket = io(BASE_URL);

        const handleStatusUpdate = (payload) => {
            setOrders((prev) => prev.map((order) => (
                order.orderId === payload.orderId
                    ? { ...order, orderStatus: payload.status, updatedAt: payload.updatedAt }
                    : order
            )));
        };

        socket.on('statusUpdate', handleStatusUpdate);

        return () => {
            socket.off('statusUpdate', handleStatusUpdate);
            socket.disconnect();
        };
    }, [BASE_URL]);

    useEffect(() => {
        if (!preferences.autoRefresh) return undefined;
        const timer = setInterval(() => {
            fetchOrders();
        }, 30000);

        return () => clearInterval(timer);
    }, [preferences.autoRefresh, page, search, selectedStatus]);

    const downloadInvoice = async (orderId) => {
        try {
            setInvoiceDownloading(orderId);
            const response = await axios.get(`${BASE_URL}/api/admin/invoices/${encodeURIComponent(orderId)}/download`, {
                params: { adminSecret: process.env.REACT_APP_ADMIN_SECRET },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showNotification(`Invoice downloaded for ${orderId}`, 'success');
        } catch (error) {
            console.error('Invoice download failed:', error);
            showNotification('Invoice download failed.', 'error');
        } finally {
            setInvoiceDownloading('');
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setUpdating(orderId);
            setDropdownOpen('');

            const endpoint = newStatus === 'Confirmed'
                ? `${BASE_URL}/api/admin/confirm-order`
                : `${BASE_URL}/api/update-order-status`;

            const config = newStatus === 'Confirmed'
                ? { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET } }
                : {};

            const response = newStatus === 'Confirmed'
                ? await axios.post(endpoint, { orderId }, config)
                : await axios.post(endpoint, { orderId, status: newStatus });

            if (response.data.success) {
                showNotification(`Order ${orderId} moved to ${newStatus}.`, 'success');
                setTimeout(() => fetchOrders(), 350);
            } else {
                showNotification('Status update failed.', 'error');
            }
        } catch (error) {
            console.error('Status update failed:', error);
            if (error.response?.status === 403) {
                showNotification('Admin authorization missing for this action.', 'error');
            } else {
                showNotification('Could not update order status.', 'error');
            }
        } finally {
            setUpdating('');
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

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectAll(true);
            setSelectedOrders(new Set(orders.map((o) => o.orderId)));
        } else {
            setSelectAll(false);
            setSelectedOrders(new Set());
        }
    };

    const handleBulkConfirm = async () => {
        if (selectedOrders.size === 0) {
            showNotification('Select at least one order.', 'info');
            return;
        }

        try {
            setBulkUpdating(true);
            const orderIds = Array.from(selectedOrders);
            let success = 0;
            let failed = 0;

            for (const orderId of orderIds) {
                try {
                    const response = await axios.post(
                        `${BASE_URL}/api/admin/confirm-order`,
                        { orderId },
                        { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET } }
                    );
                    if (response.data.success) success += 1;
                    else failed += 1;
                } catch (err) {
                    failed += 1;
                    console.error(`Bulk confirm failed for ${orderId}:`, err.message);
                }
            }

            showNotification(`Bulk confirm done. Success: ${success} | Failed: ${failed}`, failed ? 'info' : 'success');
            setSelectedOrders(new Set());
            setSelectAll(false);
            setTimeout(() => fetchOrders(), 500);
        } finally {
            setBulkUpdating(false);
        }
    };

    const stats = useMemo(() => {
        const total = orders.length;
        const pending = orders.filter((o) => String(o.orderStatus).toLowerCase() === 'pending').length;
        const delivered = orders.filter((o) => String(o.orderStatus).toLowerCase() === 'delivered').length;
        const revenue = orders.reduce((sum, order) => sum + Number(order.finalAmount || 0), 0);
        return { total, pending, delivered, revenue };
    }, [orders]);

    const statusCounts = useMemo(() => {
        const counts = {};
        ALLOWED_STATUSES.forEach((status) => {
            counts[status] = orders.filter((o) => o.orderStatus === status).length;
        });
        return counts;
    }, [orders]);

    const pageButtons = useMemo(() => {
        if (totalPages <= 1) return [];
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (page <= 3) return [1, 2, 3, 4, 5];
        if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [page - 2, page - 1, page, page + 1, page + 2];
    }, [page, totalPages]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="orders-luxe-page">
            <section className="orders-luxe-hero">
                <div>
                    <p className="orders-luxe-kicker"><ShieldCheck size={14} /> Enterprise Control Suite</p>
                    <h1>Order Command Center</h1>
                    <p className="orders-luxe-subtitle">
                        Fresh premium design with live operations, SLA tracking, bulk automation and executive insights.
                    </p>
                </div>
                <div className="orders-luxe-actions">
                    <button className="luxe-btn luxe-btn-soft" onClick={fetchOrders}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="luxe-btn luxe-btn-gold" onClick={() => setPreferences((p) => ({ ...p, cardView: !p.cardView }))}>
                        <SlidersHorizontal size={16} /> {preferences.cardView ? 'Table View' : 'Card View'}
                    </button>
                </div>
            </section>

            <section className="orders-kpi-grid">
                <article className="kpi-card">
                    <span>Total Orders</span>
                    <strong>{stats.total}</strong>
                </article>
                <article className="kpi-card">
                    <span>Pending</span>
                    <strong>{stats.pending}</strong>
                </article>
                <article className="kpi-card">
                    <span>Delivered</span>
                    <strong>{stats.delivered}</strong>
                </article>
                <article className="kpi-card">
                    <span>Visible Revenue</span>
                    <strong>{formatCurrency(stats.revenue)}</strong>
                </article>
            </section>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`orders-toast toast-${notification.type}`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="orders-control-panel">
                <div className="control-search">
                    <Search size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by order id, customer or email"
                    />
                </div>

                <div className="status-filter-row">
                    <button
                        className={!selectedStatus ? 'status-chip active' : 'status-chip'}
                        onClick={() => {
                            setSelectedStatus('');
                            setPage(1);
                        }}
                    >
                        All ({orders.length})
                    </button>
                    {ALLOWED_STATUSES.map((status) => (
                        <button
                            key={status}
                            className={selectedStatus === status ? 'status-chip active' : 'status-chip'}
                            onClick={() => {
                                setSelectedStatus(status);
                                setPage(1);
                            }}
                        >
                            {status} ({statusCounts[status] || 0})
                        </button>
                    ))}
                </div>

                <div className="view-toggles">
                    <label>
                        <input
                            type="checkbox"
                            checked={preferences.compact}
                            onChange={(e) => setPreferences((p) => ({ ...p, compact: e.target.checked }))}
                        />
                        Compact rows
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={preferences.autoRefresh}
                            onChange={(e) => setPreferences((p) => ({ ...p, autoRefresh: e.target.checked }))}
                        />
                        Auto refresh 30s
                    </label>
                </div>
            </section>

            {selectedOrders.size > 0 && (
                <section className="bulk-strip">
                    <div>
                        <Sparkles size={16} /> {selectedOrders.size} order(s) selected
                    </div>
                    <button className="luxe-btn luxe-btn-gold" onClick={handleBulkConfirm} disabled={bulkUpdating}>
                        {bulkUpdating ? <Loader2 size={16} className="spin" /> : <Crown size={16} />}
                        {bulkUpdating ? 'Confirming...' : 'Bulk Confirm + Premium Email'}
                    </button>
                </section>
            )}

            <section className="invoice-panel">
                <div className="panel-head">
                    <h3><FileText size={18} /> Recent Invoice Downloads</h3>
                    <span>{invoices.length} entries</span>
                </div>
                {invoiceLoading ? (
                    <div className="panel-empty"><Loader2 size={16} className="spin" /> Loading invoices...</div>
                ) : invoices.length === 0 ? (
                    <div className="panel-empty">No invoices found.</div>
                ) : (
                    <div className="invoice-table-wrap">
                        <table className="invoice-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.orderId}>
                                        <td>{String(inv.orderId || '').slice(-10)}</td>
                                        <td>{inv.userName || 'N/A'}</td>
                                        <td>{inv.invoiceType || 'Receipt'}</td>
                                        <td>{formatCurrency(inv.finalAmount || 0)}</td>
                                        <td>
                                            <button
                                                className="luxe-mini-btn"
                                                onClick={() => downloadInvoice(inv.orderId)}
                                                disabled={invoiceDownloading === inv.orderId}
                                            >
                                                {invoiceDownloading === inv.orderId ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {loading && orders.length === 0 ? (
                <div className="orders-loading"><Loader2 size={22} className="spin" /> Loading command center...</div>
            ) : orders.length === 0 ? (
                <div className="orders-empty"><Package size={44} /> No orders found for current filters.</div>
            ) : preferences.cardView ? (
                <section className="orders-card-grid">
                    {orders.map((order) => {
                        const statusMeta = STATUS_META[order.orderStatus] || STATUS_META.Pending;
                        const StatusIcon = statusMeta.icon;
                        const sla = getSlaMeta(order.updatedAt);

                        return (
                            <article key={order.orderId} className={`order-card ${preferences.compact ? 'compact' : ''}`}>
                                <div className="order-card-top">
                                    <div>
                                        <p className="order-id">#{String(order.orderId || '').slice(-10)}</p>
                                        <h4>{order.userName || 'Unknown Customer'}</h4>
                                    </div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.has(order.orderId)}
                                            onChange={() => handleOrderSelect(order.orderId)}
                                        />
                                    </label>
                                </div>

                                <div className="order-card-meta">
                                    <span>{order.userEmail || 'No email'}</span>
                                    <strong>{formatCurrency(order.finalAmount || 0)}</strong>
                                </div>

                                <div className="order-card-status-row">
                                    <span className={`status-pill ${statusMeta.className}`}><StatusIcon size={14} /> {order.orderStatus || 'Pending'}</span>
                                    <span className={`sla-pill ${sla.className}`}>{sla.label}</span>
                                </div>

                                <div className="order-card-meta">
                                    <span>Items: {order.productCount || order.products?.length || 0}</span>
                                    <span>{formatDateTime(order.updatedAt)}</span>
                                </div>

                                <div className="order-action-wrap">
                                    <button
                                        className="luxe-mini-btn"
                                        onClick={() => setDropdownOpen(dropdownOpen === order.orderId ? '' : order.orderId)}
                                        disabled={updating === order.orderId}
                                    >
                                        {updating === order.orderId ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                                        Update Status <ChevronDown size={14} />
                                    </button>

                                    <AnimatePresence>
                                        {dropdownOpen === order.orderId && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="status-dropdown"
                                            >
                                                {ALLOWED_STATUSES.map((status) => {
                                                    const sm = STATUS_META[status];
                                                    const SI = sm.icon;
                                                    const disabled = status === order.orderStatus || updating === order.orderId;
                                                    return (
                                                        <button key={status} disabled={disabled} onClick={() => updateOrderStatus(order.orderId, status)}>
                                                            <SI size={14} /> {status}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {order.statusHistory?.length > 0 && (
                                    <button
                                        className="history-toggle"
                                        onClick={() => setExpandedHistory(expandedHistory === order.orderId ? '' : order.orderId)}
                                    >
                                        {expandedHistory === order.orderId ? 'Hide History' : `Show History (${order.statusHistory.length})`}
                                    </button>
                                )}

                                {expandedHistory === order.orderId && order.statusHistory?.length > 0 && (
                                    <div className="history-panel">
                                        {order.statusHistory.map((entry, idx) => (
                                            <div key={`${order.orderId}-${idx}`} className="history-item">
                                                <span>{entry.status}</span>
                                                <small>{formatDateTime(entry.timestamp)}</small>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="orders-table-wrap">
                    <table className={`orders-table ${preferences.compact ? 'compact' : ''}`}>
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={selectAll && orders.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>SLA</th>
                                <th>Items</th>
                                <th>Updated</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => {
                                const statusMeta = STATUS_META[order.orderStatus] || STATUS_META.Pending;
                                const StatusIcon = statusMeta.icon;
                                const sla = getSlaMeta(order.updatedAt);

                                return (
                                    <React.Fragment key={order.orderId}>
                                        <tr>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.orderId)}
                                                    onChange={() => handleOrderSelect(order.orderId)}
                                                />
                                            </td>
                                            <td className="order-id">#{String(order.orderId || '').slice(-10)}</td>
                                            <td>{order.userName || 'Unknown Customer'}</td>
                                            <td>{order.userEmail || 'N/A'}</td>
                                            <td>{formatCurrency(order.finalAmount || 0)}</td>
                                            <td><span className={`status-pill ${statusMeta.className}`}><StatusIcon size={14} /> {order.orderStatus || 'Pending'}</span></td>
                                            <td><span className={`sla-pill ${sla.className}`}>{sla.label}</span></td>
                                            <td>{order.productCount || order.products?.length || 0}</td>
                                            <td>{formatDateTime(order.updatedAt)}</td>
                                            <td>
                                                <div className="order-action-wrap">
                                                    <button
                                                        className="luxe-mini-btn"
                                                        onClick={() => setDropdownOpen(dropdownOpen === order.orderId ? '' : order.orderId)}
                                                        disabled={updating === order.orderId}
                                                    >
                                                        {updating === order.orderId ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                                                        Update <ChevronDown size={14} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {dropdownOpen === order.orderId && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -6 }}
                                                                className="status-dropdown"
                                                            >
                                                                {ALLOWED_STATUSES.map((status) => {
                                                                    const sm = STATUS_META[status];
                                                                    const SI = sm.icon;
                                                                    const disabled = status === order.orderStatus || updating === order.orderId;
                                                                    return (
                                                                        <button key={status} disabled={disabled} onClick={() => updateOrderStatus(order.orderId, status)}>
                                                                            <SI size={14} /> {status}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </tr>

                                        {order.statusHistory?.length > 0 && (
                                            <tr className="history-row">
                                                <td colSpan="10">
                                                    <button
                                                        className="history-toggle"
                                                        onClick={() => setExpandedHistory(expandedHistory === order.orderId ? '' : order.orderId)}
                                                    >
                                                        {expandedHistory === order.orderId ? 'Hide History' : `Show History (${order.statusHistory.length})`}
                                                    </button>
                                                    {expandedHistory === order.orderId && (
                                                        <div className="history-panel">
                                                            {order.statusHistory.map((entry, idx) => (
                                                                <div key={`${order.orderId}-${idx}`} className="history-item">
                                                                    <span>{entry.status}</span>
                                                                    <small>{formatDateTime(entry.timestamp)}</small>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            )}

            {totalPages > 1 && (
                <section className="pagination-wrap">
                    <button className="luxe-mini-btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
                    {pageButtons.map((number) => (
                        <button
                            key={number}
                            className={page === number ? 'page-btn active' : 'page-btn'}
                            onClick={() => setPage(number)}
                        >
                            {number}
                        </button>
                    ))}
                    <button className="luxe-mini-btn" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
                </section>
            )}
        </motion.div>
    );
}
