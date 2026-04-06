import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Loader2,
    MapPin,
    Package,
    Search,
    SlidersHorizontal,
    Sparkles,
    Truck
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import io from 'socket.io-client';
import { SOCKET_TRANSPORTS } from '../../constants';
import LefNav from './LefNav';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import OrderActionDrawer from './OrderActionDrawer';
import { BASE_URL as SHARED_BASE_URL } from '../../constants';
import './AdminOrders.css';

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

const STATUS_COLORS = {
    Pending: 'status-pending',
    Confirmed: 'status-confirmed',
    Packed: 'status-packed',
    Shipped: 'status-shipped',
    'Out for Delivery': 'status-out-for-delivery',
    Delivered: 'status-delivered'
};

const STATUS_ICONS = {
    Pending: Clock,
    Confirmed: CheckCircle2,
    Packed: Package,
    Shipped: Truck,
    'Out for Delivery': MapPin,
    Delivered: CheckCircle2
};

const PAYMENT_STATUSES = ['All', 'Paid', 'Pending', 'Failed', 'COD'];
const DELIVERY_TIME_SLOTS = ['By 12:00 PM', 'By 6:00 PM', 'By 9:00 PM'];

const DATE_PRESETS = [
    { key: 'all', label: 'All Dates' },
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week', label: 'Next 7 Days' }
];

const GENERIC_CUSTOMER_VALUES = new Set(['customer', 'n/a', 'na', 'unknown', 'guest']);

const toInputDateValue = (value) => {
    const dt = new Date(value || Date.now());
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 10);
};

const normalizeStatus = (value = '') => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'order placed' || raw === 'ordered') return 'Pending';
    if (raw === 'confirmed') return 'Confirmed';
    if (raw === 'packed') return 'Packed';
    if (raw === 'shipped') return 'Shipped';
    if (raw === 'out for delivery') return 'Out for Delivery';
    if (raw === 'delivered') return 'Delivered';
    return String(value || 'Pending');
};

const isGenericCustomerName = (name) => GENERIC_CUSTOMER_VALUES.has(String(name || '').trim().toLowerCase());

const sanitizeCustomerName = (name = '') => {
    const rawWords = String(name || '')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);

    if (!rawWords.length) return '';

    const collapsed = [];
    rawWords.forEach((word) => {
        const normalized = word.replace(/[^a-zA-Z']/g, '');
        if (!normalized) return;
        if (collapsed.length > 0 && collapsed[collapsed.length - 1].toLowerCase() === normalized.toLowerCase()) {
            return;
        }
        collapsed.push(normalized);
    });

    const deduped = [];
    collapsed.forEach((word) => {
        if (!deduped.some((saved) => saved.toLowerCase() === word.toLowerCase())) {
            deduped.push(word);
        }
    });

    return deduped
        .slice(0, 4)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const deriveNameFromEmail = (email = '') => {
    const local = String(email || '').split('@')[0] || '';
    if (!local) return '';
    const fromLocal = local
        .replace(/[._-]+/g, ' ')
        .replace(/\d+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(' ');
    return sanitizeCustomerName(fromLocal);
};

const getDeliveryDateValue = (order = {}) => {
    const rawDate = order.deliverySchedule?.date || order.deliverySchedule?.estimatedDelivery || order.estimatedArrival;
    if (!rawDate) return '';
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return toInputDateValue(parsed);
};

const pickCustomerName = (order = {}) => {
    const sourceName = sanitizeCustomerName(String(order.userName || order.customerName || '').trim());
    const email = String(order.userEmail || order.email || '').trim();
    if (sourceName && !isGenericCustomerName(sourceName)) return sourceName;
    const fromEmail = deriveNameFromEmail(email);
    return fromEmail || 'N/A';
};

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

const parseValidDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const getOrderDateForFiltering = (order = {}) => {
    // Date filters should match what admin sees in "Updated" timeline.
    const source = [
        order.updatedAt,
        order.createdAt,
        order.orderDate,
        order.placedAt
    ];

    for (const candidate of source) {
        const parsed = parseValidDate(candidate);
        if (parsed) return parsed;
    }

    return new Date();
};

const normalizePaymentStatus = (order = {}) => {
    const raw = String(order.paymentStatus || '').trim().toLowerCase();
    const method = String(order.paymentMethod || '').trim().toLowerCase();

    if (method.includes('cod') || raw === 'cod') return 'cod';
    if (raw.includes('paid') || raw === 'success' || raw === 'completed') return 'paid';
    if (raw.includes('fail') || raw.includes('cancel') || raw === 'declined') return 'failed';
    if (raw.includes('pending') || raw.includes('unpaid')) return 'pending';

    return raw || 'pending';
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [datePreset, setDatePreset] = useState('all');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [density, setDensity] = useState('comfortable');
    const [actualOnly, setActualOnly] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [updating, setUpdating] = useState('');
    const [bulkStatus, setBulkStatus] = useState('Confirmed');
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [detailOrder, setDetailOrder] = useState(null);
    const [actionOrder, setActionOrder] = useState(null);
    const [actionStatus, setActionStatus] = useState('Pending');
    const [actionDeliveryDate, setActionDeliveryDate] = useState('');
    const [actionDeliveryTime, setActionDeliveryTime] = useState('By 9:00 PM');
    const [actionAdminNote, setActionAdminNote] = useState('');
    const [actionRiderName, setActionRiderName] = useState('');
    const [actionRiderPhone, setActionRiderPhone] = useState('');
    const [actionLocationName, setActionLocationName] = useState('');
    const [actionLatitude, setActionLatitude] = useState('');
    const [actionLongitude, setActionLongitude] = useState('');
    const [actionDeliveryOtp, setActionDeliveryOtp] = useState('');

    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const localApiUrl = process.env.REACT_APP_LOCAL_API_URL || SHARED_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const remoteApiUrl = process.env.REACT_APP_BASE_URL || SHARED_BASE_URL || 'https://eshopper-qtgl.onrender.com';
    const [apiBaseUrl, setApiBaseUrl] = useState(isLocalHost && process.env.REACT_APP_USE_LOCAL_API === 'true' ? localApiUrl : remoteApiUrl);
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
                limit: rowsPerPage,
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
    }, [apiBaseUrl, page, rowsPerPage, search, selectedStatus, fromDate, toDate, paymentStatus]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const timer = setInterval(() => {
            fetchOrders();
        }, 30000);
        return () => clearInterval(timer);
    }, [apiBaseUrl, autoRefresh, page, rowsPerPage, search, selectedStatus, fromDate, toDate, paymentStatus]);

    useEffect(() => {
        // Get userId from localStorage or use admin-dashboard identifier
        const userId = localStorage.getItem('userId') || 'admin-dashboard';
        
        const socket = io(apiBaseUrl, {
            transports: SOCKET_TRANSPORTS,
            withCredentials: true,
            reconnectionAttempts: 3,
            timeout: 8000,
            auth: {
                userId: userId
            },
            query: {
                userId: userId
            }
        });

        const handleStatusUpdate = (payload) => {
            setOrders((prev) => prev.map((order) => (
                order.orderId === payload.orderId
                    ? {
                        ...order,
                        orderStatus: payload.status,
                        updatedAt: payload.updatedAt,
                        deliverySchedule: {
                            ...(order.deliverySchedule || {}),
                            ...(payload.deliverySchedule || {}),
                            ...(payload.deliveryAgent ? { deliveryAgent: payload.deliveryAgent } : {}),
                            ...(payload.riderPhone ? { riderPhone: payload.riderPhone } : {}),
                            ...(payload.locationName ? { locationName: payload.locationName } : {}),
                            ...(payload.latitude != null ? { latitude: payload.latitude } : {}),
                            ...(payload.longitude != null ? { longitude: payload.longitude } : {})
                        },
                        ...(payload.deliveryOtp !== undefined ? { deliveryOtp: payload.deliveryOtp || '' } : {}),
                        ...(payload.deliveryOtpExpiresAt !== undefined ? { deliveryOtpExpiresAt: payload.deliveryOtpExpiresAt || null } : {}),
                        ...(payload.deliveryOtpVerifiedAt !== undefined ? { deliveryOtpVerifiedAt: payload.deliveryOtpVerifiedAt || null } : {})
                    }
                    : order
            )));
        };

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully');
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connection failed:', err.message);
        });

        socket.on('statusUpdate', handleStatusUpdate);
        return () => {
            socket.off('statusUpdate', handleStatusUpdate);
            socket.disconnect();
        };
    }, [apiBaseUrl]);

    const normalizedOrders = useMemo(() => {
        const rowsByOrderId = new Map();

        orders.forEach((entry) => {
            const orderId = String(entry.orderId || '').trim();
            if (!orderId) return;

            const normalized = {
                ...entry,
                orderId,
                orderStatus: normalizeStatus(entry.orderStatus),
                userEmail: String(entry.userEmail || entry.email || '').trim() || 'N/A',
                userName: pickCustomerName(entry)
            };

            const qualityScore =
                (normalized.userName !== 'N/A' ? 2 : 0) +
                (normalized.userEmail !== 'N/A' ? 2 : 0) +
                (Number(normalized.productCount || 0) > 0 ? 1 : 0);

            const prev = rowsByOrderId.get(orderId);
            if (!prev || qualityScore > prev.__score) {
                rowsByOrderId.set(orderId, { ...normalized, __score: qualityScore });
            }
        });

        return Array.from(rowsByOrderId.values()).map(({ __score, ...rest }) => rest);
    }, [orders]);

    const filteredOrders = useMemo(
        () => normalizedOrders.filter((order) => {
            const query = String(search || '').trim().toLowerCase();
            const orderDate = getOrderDateForFiltering(order);
            const passesDate = inDateRange(orderDate, fromDate, toDate);
            if (!passesDate) return false;

            if (query) {
                const idText = String(order.orderId || '').toLowerCase();
                const nameText = String(order.userName || '').toLowerCase();
                const emailText = String(order.userEmail || '').toLowerCase();
                const matchesSearch = idText.includes(query) || nameText.includes(query) || emailText.includes(query);
                if (!matchesSearch) return false;
            }

            if (selectedStatus) {
                const normalized = normalizeStatus(order.orderStatus || 'Pending');
                if (normalized !== selectedStatus) return false;
            }

            if (paymentStatus !== 'All') {
                const normalizedPayment = normalizePaymentStatus(order);
                if (normalizedPayment !== String(paymentStatus).toLowerCase()) return false;
            }

            if (!actualOnly) return true;

            const hasActualName = order.userName && order.userName !== 'N/A' && !isGenericCustomerName(order.userName);
            const hasActualEmail = order.userEmail && order.userEmail !== 'N/A';
            return hasActualName || hasActualEmail;
        }),
        [normalizedOrders, search, selectedStatus, paymentStatus, fromDate, toDate, actualOnly]
    );

    const applyDatePreset = (preset) => {
        setDatePreset(preset);
        setPage(1);

        if (preset === 'all') {
            setFromDate('');
            setToDate('');
            return;
        }

        const now = new Date();
        if (preset === 'today') {
            const today = toInputDateValue(now);
            setFromDate(today);
            setToDate(today);
            return;
        }

        if (preset === 'tomorrow') {
            const tomorrowDate = new Date(now);
            tomorrowDate.setDate(now.getDate() + 1);
            const tomorrow = toInputDateValue(tomorrowDate);
            setFromDate(tomorrow);
            setToDate(tomorrow);
            return;
        }

        const weekStart = toInputDateValue(now);
        const weekEndDate = new Date(now);
        weekEndDate.setDate(now.getDate() + 6);
        const weekEnd = toInputDateValue(weekEndDate);
        setFromDate(weekStart);
        setToDate(weekEnd);
    };

    const resetFilters = () => {
        setSearch('');
        setSelectedStatus('');
        setPaymentStatus('All');
        setFromDate('');
        setToDate('');
        setDatePreset('all');
        setPage(1);
    };

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

    const openActionDrawer = (order = {}) => {
        const existingLat = order.deliverySchedule?.latitude ?? order?.currentLocation?.latitude ?? '';
        const existingLng = order.deliverySchedule?.longitude ?? order?.currentLocation?.longitude ?? '';
        setActionOrder(order);
        setActionStatus(normalizeStatus(order.orderStatus || 'Pending'));
        setActionDeliveryDate(getDeliveryDateValue(order));
        setActionDeliveryTime(order.deliverySchedule?.time || 'By 9:00 PM');
        setActionAdminNote('');
        setActionRiderName(order.deliverySchedule?.deliveryAgent || '');
        setActionRiderPhone(order.deliverySchedule?.riderPhone || '');
        setActionLocationName(order.deliverySchedule?.locationName || order.shippingAddress?.city || '');
        setActionLatitude(existingLat === null || existingLat === undefined ? '' : String(existingLat));
        setActionLongitude(existingLng === null || existingLng === undefined ? '' : String(existingLng));
        setActionDeliveryOtp('');
    };

    const closeActionDrawer = () => {
        if (updating) return;
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setActionOrder(null);
    };

    const updateOrderStatus = async (orderId, newStatus, options = {}) => {
        try {
            setUpdating(orderId);
            const deliveryDate = String(options.deliveryDate || '').trim();
            const deliveryTime = String(options.deliveryTime || '').trim() || 'By 9:00 PM';
            const riderName = String(options.riderName || '').trim();
            const riderPhone = String(options.riderPhone || '').trim();
            const locationName = String(options.locationName || '').trim();
            const deliveryOtp = String(options.deliveryOtp || '').trim();
            const latValue = String(options.latitude || '').trim();
            const lngValue = String(options.longitude || '').trim();

            const hasLatValue = latValue.length > 0;
            const hasLngValue = lngValue.length > 0;
            const latNum = hasLatValue ? Number(latValue) : NaN;
            const lngNum = hasLngValue ? Number(lngValue) : NaN;
            const hasCoords = hasLatValue && hasLngValue && Number.isFinite(latNum) && Number.isFinite(lngNum);

            let deliverySchedule = null;
            if (deliveryDate || riderName || riderPhone || locationName || hasCoords) {
                const deliveryDateObj = new Date(`${deliveryDate}T00:00:00`);
                deliverySchedule = {
                    time: deliveryTime,
                    scheduledAt: new Date().toISOString(),
                    ...(riderName && { deliveryAgent: riderName }),
                    ...(riderPhone && { riderPhone }),
                    ...(locationName && { locationName }),
                    ...(hasCoords ? { latitude: latNum, longitude: lngNum } : {})
                };

                if (deliveryDate && !Number.isNaN(deliveryDateObj.getTime())) {
                    deliverySchedule.date = deliveryDateObj.toISOString();
                    deliverySchedule.estimatedDelivery = deliveryDateObj.toISOString();
                }
            }

            const shouldUseConfirmEndpoint =
                newStatus === 'Confirmed' &&
                !deliverySchedule &&
                !options.adminNote &&
                !riderName &&
                !riderPhone &&
                !locationName &&
                !hasCoords &&
                !deliveryOtp;

            const endpoint = shouldUseConfirmEndpoint
                ? `${apiBaseUrl}/api/admin/confirm-order`
                : `${apiBaseUrl}/api/update-order-status`;

            const payload = shouldUseConfirmEndpoint
                ? { orderId }
                : {
                    orderId,
                    status: newStatus,
                    ...(deliverySchedule && { deliverySchedule }),
                    ...(options.adminNote && { adminNote: options.adminNote }),
                    ...(riderName && { deliveryAgent: riderName }),
                    ...(riderPhone && { riderPhone }),
                    ...(locationName && { locationName }),
                    ...(hasCoords ? { latitude: latNum, longitude: lngNum } : {}),
                    ...(deliveryOtp && { deliveryOtp })
                };

            const response = await axios.post(
                endpoint,
                payload,
                { headers: adminSecret ? { 'x-admin-secret': adminSecret } : {} }
            );

            if (response.data.success) {
                const successMessage = options.successMessage || `Order ${orderId} updated to ${newStatus}`;
                showNotification(successMessage, 'success');
                fetchOrders();
                return true;
            } else {
                showNotification('Status update failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Update failed:', error);
            const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
            showNotification(serverMessage || 'Failed to update order status', 'error');
            return false;
        } finally {
            setUpdating('');
        }
    };

    const applyOrderAction = async () => {
        if (!actionOrder?.orderId) return;

        const currentStatus = normalizeStatus(actionOrder.orderStatus || 'Pending');
        const currentDeliveryDate = getDeliveryDateValue(actionOrder);
        const nextStatus = normalizeStatus(actionStatus || currentStatus);
        const nextDeliveryDate = String(actionDeliveryDate || '').trim();
        const adminNote = String(actionAdminNote || '').trim();
        const riderName = String(actionRiderName || '').trim();
        const riderPhone = String(actionRiderPhone || '').trim();
        const locationName = String(actionLocationName || '').trim();
        const latitude = String(actionLatitude || '').trim();
        const longitude = String(actionLongitude || '').trim();
        const deliveryOtp = String(actionDeliveryOtp || '').trim();

        const currentRiderName = String(actionOrder?.deliverySchedule?.deliveryAgent || '').trim();
        const currentRiderPhone = String(actionOrder?.deliverySchedule?.riderPhone || '').trim();
        const currentLocationName = String(actionOrder?.deliverySchedule?.locationName || '').trim();
        const currentLatitude = String(actionOrder?.deliverySchedule?.latitude ?? '').trim();
        const currentLongitude = String(actionOrder?.deliverySchedule?.longitude ?? '').trim();

        const changedStatus = nextStatus !== currentStatus;
        const changedDate = nextDeliveryDate !== String(currentDeliveryDate || '').trim();
        const changedNote = adminNote.length > 0;
        const changedRider = riderName !== currentRiderName || riderPhone !== currentRiderPhone;
        const changedLocation = locationName !== currentLocationName || latitude !== currentLatitude || longitude !== currentLongitude;
        const changedOtp = deliveryOtp.length > 0;
        const needsOutForDeliveryOtpBootstrap =
            nextStatus === 'Out for Delivery' &&
            !String(actionOrder?.deliveryOtp || '').trim();

        if (nextStatus === 'Out for Delivery') {
            if (!riderName || !riderPhone) {
                showNotification('Out for Delivery ke liye rider name aur phone required hai', 'info');
                return;
            }
            if (!locationName && !(latitude && longitude)) {
                showNotification('Out for Delivery ke liye location name ya latitude/longitude required hai', 'info');
                return;
            }
        }

        if (nextStatus === 'Delivered' && currentStatus !== 'Delivered' && !deliveryOtp) {
            showNotification('Delivered mark karne ke liye customer delivery OTP enter karo', 'info');
            return;
        }

        if (!changedStatus && !changedDate && !changedNote && !changedRider && !changedLocation && !changedOtp && !needsOutForDeliveryOtpBootstrap) {
            showNotification('No action changes to apply for this order', 'info');
            return;
        }

        const ok = await updateOrderStatus(actionOrder.orderId, nextStatus, {
            deliveryDate: nextDeliveryDate,
            deliveryTime: actionDeliveryTime,
            adminNote,
            riderName,
            riderPhone,
            locationName,
            latitude,
            longitude,
            deliveryOtp,
            successMessage: (changedDate || changedRider || changedLocation || changedOtp || needsOutForDeliveryOtpBootstrap)
                ? `Order ${actionOrder.orderId} updated with live delivery details`
                : `Order ${actionOrder.orderId} status updated`
        });

        if (ok) {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            setActionOrder(null);
        }
    };

    const applyQuickDeliveryPreset = (days = 0) => {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + days);
        const quickDate = toInputDateValue(baseDate);
        setActionDeliveryDate(quickDate);
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

    const handleBulkDelete = async () => {
        if (selectedOrders.size === 0) {
            showNotification('Select at least one order first', 'info');
            return;
        }

        const orderIds = Array.from(selectedOrders);
        const confirmed = window.confirm(
            `Delete ${orderIds.length} selected order(s)? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setBulkDeleting(true);
            const response = await axios.post(
                `${apiBaseUrl}/api/admin/delete-orders`,
                { orderIds },
                { headers: adminSecret ? { 'x-admin-secret': adminSecret } : {} }
            );

            if (response.data?.success) {
                const deleted = Number(response.data?.deletedCount || 0);
                showNotification(`Bulk delete done: ${deleted} order(s) removed`, 'success');
                setSelectedOrders(new Set());
                setSelectAll(false);
                fetchOrders();
            } else {
                showNotification('Bulk delete failed', 'error');
            }
        } catch (error) {
            console.error('Bulk delete failed:', error);
            const message = error?.response?.data?.message || 'Failed to delete selected orders';
            showNotification(message, 'error');
        } finally {
            setBulkDeleting(false);
        }
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
        <>
        <LefNav />
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
                            onChange={(e) => {
                                setDatePreset('custom');
                                setFromDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="filter-item">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            onChange={(e) => {
                                setDatePreset('custom');
                                setToDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="filter-item">
                        <label>Payment Status</label>
                        <select
                            value={paymentStatus}
                            onChange={(e) => {
                                setPaymentStatus(e.target.value);
                                setPage(1);
                            }}
                        >
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

                <div className="quick-date-row">
                    <div className="quick-date-title">
                        <CalendarDays size={15} /> Smart Date Filters
                    </div>
                    <div className="quick-date-actions">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className={`preset-btn ${datePreset === preset.key ? 'active' : ''}`}
                                onClick={() => applyDatePreset(preset.key)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="customization-row">
                    <div className="custom-title">
                        <SlidersHorizontal size={15} /> Customization
                    </div>
                    <div className="custom-controls">
                        <label>
                            Rows
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </label>

                        <label>
                            Density
                            <select value={density} onChange={(e) => setDensity(e.target.value)}>
                                <option value="compact">Compact</option>
                                <option value="comfortable">Comfortable</option>
                            </select>
                        </label>

                        <label className="actual-only-toggle">
                            <input
                                type="checkbox"
                                checked={actualOnly}
                                onChange={(e) => setActualOnly(e.target.checked)}
                            />
                            Show only actual customer data
                        </label>

                        <button type="button" className="reset-btn" onClick={resetFilters}>
                            <Sparkles size={14} /> Reset Filters
                        </button>
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
                    <button onClick={handleBulkUpdate} disabled={bulkUpdating || bulkDeleting}>
                        {bulkUpdating ? <Loader2 size={14} className="spin" /> : <Package size={14} />} Bulk Update Selected
                    </button>
                    <button className="bulk-delete-btn" onClick={handleBulkDelete} disabled={bulkUpdating || bulkDeleting}>
                        {bulkDeleting ? <Loader2 size={14} className="spin" /> : <span>🗑</span>} Bulk Delete Selected
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
                    <table className={`admin-orders-table keep-layout-table density-${density}`}>
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
                                        <td className="text-center" data-label="Select">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.has(order.orderId)}
                                                onChange={() => handleOrderSelect(order.orderId)}
                                            />
                                        </td>
                                        <td className="order-id-col" data-label="Order ID">
                                            <div>{String(order.orderId || '').slice(-8)}</div>
                                            <button className="details-link" onClick={() => setDetailOrder(order)}>View Details</button>
                                        </td>
                                        <td data-label="Customer" className="customer-col">
                                            <div className="customer-name">{order.userName || 'N/A'}</div>
                                            {order.userEmail && order.userEmail !== 'N/A' ? (
                                                <div className="customer-email-mini">{order.userEmail}</div>
                                            ) : null}
                                        </td>
                                        <td data-label="Email">{order.userEmail || 'N/A'}</td>
                                        <td data-label="Amount" className="amount-col">INR {Number(order.finalAmount || 0).toLocaleString('en-IN')}</td>
                                        <td data-label="Status">
                                            <span className={`status-pill ${statusClass}`}>
                                                <IconComp size={13} /> {order.orderStatus || 'Pending'}
                                            </span>
                                        </td>
                                        <td data-label="Items">{order.productCount || (order.products || []).length || 0} items</td>
                                        <td data-label="Updated">{new Date(order.updatedAt || Date.now()).toLocaleDateString('en-IN')}</td>
                                        <td data-label="Action" className="action-cell">
                                            <button
                                                type="button"
                                                className="open-action-drawer-btn"
                                                onClick={() => openActionDrawer(order)}
                                            >
                                                <Sparkles size={14} /> Update Status
                                            </button>
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
                onOrderRemoved={(removedOrderId) => {
                    setDetailOrder(null);
                    setSelectedOrders((prev) => {
                        const next = new Set(prev);
                        next.delete(removedOrderId);
                        return next;
                    });
                    fetchOrders();
                }}
            />

            <OrderActionDrawer
                open={Boolean(actionOrder)}
                onClose={closeActionDrawer}
                order={actionOrder}
                updating={Boolean(actionOrder && updating === actionOrder.orderId)}
                apiBaseUrl={apiBaseUrl}
                adminSecret={adminSecret}
                allowedStatuses={ALLOWED_STATUSES}
                deliveryTimeSlots={DELIVERY_TIME_SLOTS}
                status={actionStatus}
                setStatus={setActionStatus}
                deliveryDate={actionDeliveryDate}
                setDeliveryDate={setActionDeliveryDate}
                deliveryTime={actionDeliveryTime}
                setDeliveryTime={setActionDeliveryTime}
                adminNote={actionAdminNote}
                setAdminNote={setActionAdminNote}
                riderName={actionRiderName}
                setRiderName={setActionRiderName}
                riderPhone={actionRiderPhone}
                setRiderPhone={setActionRiderPhone}
                locationName={actionLocationName}
                setLocationName={setActionLocationName}
                latitude={actionLatitude}
                setLatitude={setActionLatitude}
                longitude={actionLongitude}
                setLongitude={setActionLongitude}
                deliveryOtp={actionDeliveryOtp}
                setDeliveryOtp={setActionDeliveryOtp}
                onToday={() => applyQuickDeliveryPreset(0)}
                onTomorrow={() => applyQuickDeliveryPreset(1)}
                onApply={applyOrderAction}
            />
        </div>
        </>
    );
}
