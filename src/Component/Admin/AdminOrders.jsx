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
    Truck,
    Trash2,
    RotateCcw
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import io from 'socket.io-client';
import { SOCKET_TRANSPORTS } from '../../constants';
import LefNav from './LefNav';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import OrderActionDrawer from './OrderActionDrawer';
import AdminReturnManagement from './AdminReturnManagement';
import { motion } from 'framer-motion';
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
    const [activeTab, setActiveTab] = useState('orders');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('All');
    const [featureFilter, setFeatureFilter] = useState('All');
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
        const envBase = process.env.REACT_APP_BASE_URL || '';
        const envApi = process.env.REACT_APP_API_URL || '';
        const localApiUrl = process.env.REACT_APP_LOCAL_API_URL || SHARED_BASE_URL || envApi || 'http://localhost:5000';
        const remoteApiUrl = (envBase && !envBase.includes('localhost') && !envBase.includes('127.0.0.1'))
            ? envBase
            : (SHARED_BASE_URL || envApi || 'https://eshopper-qtgl.onrender.com');
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

        // Listen for return status updates (real-time)
        const handleReturnStatusUpdate = (payload) => {
            if (payload && payload.orderId) {
                // Dispatch a custom event so AdminReturnManagement can react
                try {
                    window.dispatchEvent(new CustomEvent('admin:returnStatusUpdate', { detail: payload }));
                } catch (e) {}
            }
        };
        socket.on('returnStatusUpdate', handleReturnStatusUpdate);
        socket.on('orderReturnUpdated', handleReturnStatusUpdate);
        socket.on('orderReturnRequested', handleReturnStatusUpdate);
        socket.on('orderReturnReceived', handleReturnStatusUpdate);
        socket.on('orderRefundProcessed', handleReturnStatusUpdate);

        return () => {
            socket.off('statusUpdate', handleStatusUpdate);
            socket.off('returnStatusUpdate', handleReturnStatusUpdate);
            socket.off('orderReturnUpdated', handleReturnStatusUpdate);
            socket.off('orderReturnRequested', handleReturnStatusUpdate);
            socket.off('orderReturnReceived', handleReturnStatusUpdate);
            socket.off('orderRefundProcessed', handleReturnStatusUpdate);
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

            if (featureFilter !== 'All') {
                const totalExtras = Number(order.extraCharges || 0);
                const knownExtras = Number(order.giftWrapCharge || 0) + Number(order.protectionCharge || 0) + Number(order.ecoCharge || 0) + Number(order.paymentFee || 0);
                const deducedExpress = Math.max(0, totalExtras - knownExtras);
                const hasExpress = order.deliverySpeed === 'express' || Number(order.expressDeliveryFee || order.expressFee || 0) > 0 || deducedExpress === 49;

                if (featureFilter === 'Express' && !hasExpress) return false;
                if (featureFilter === 'GiftWrap' && !(Number(order.giftWrapCharge || 0) > 0)) return false;
                if (featureFilter === 'CarePlus' && !(Number(order.protectionCharge || 0) > 0)) return false;
                if (featureFilter === 'EcoBox' && !(Number(order.ecoCharge || 0) > 0)) return false;
                if (featureFilter === 'Coupon' && !order.couponCode) return false;
            }

            if (!actualOnly) return true;

            const hasActualName = order.userName && order.userName !== 'N/A' && !isGenericCustomerName(order.userName);
            const hasActualEmail = order.userEmail && order.userEmail !== 'N/A';
            return hasActualName || hasActualEmail;
        }),
        [normalizedOrders, search, selectedStatus, paymentStatus, fromDate, toDate, actualOnly, featureFilter]
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
        setFeatureFilter('All');
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

                const config = { headers: adminSecret ? { 'x-admin-secret': adminSecret } : {} };

                const payload = bulkStatus === 'Confirmed'
                    ? { orderId }
                    : { orderId, status: bulkStatus };

                const response = await axios.post(endpoint, payload, config);

                if (response.data.success) success += 1;
                else failed += 1;
            } catch (error) {
                console.error(`Bulk update failed for ${orderId}:`, error?.response?.data || error.message);
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
        <div className="lux-admin-page" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            <LefNav />
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
                                <div className="lux-eyebrow"><Package size={14} className="mr-1"/> Dispatch Center</div>
                                <h1 className="lux-banner-title">Global <span>Orders</span></h1>
                                <p className="lux-banner-sub">Command center for logistics, order tracking, and fulfillment.</p>
                            </div>
                            <div className="lux-banner-stats">
                                <div className="lux-stat-box">
                                    <span>Total Revenue</span>
                                    <strong>INR {stats.revenue.toLocaleString('en-IN')}</strong>
                                </div>
                                <div className="lux-stat-box">
                                    <span>Active Orders</span>
                                    <strong>{stats.total}</strong>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {notification && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className={`alert alert-${notification.type === 'error' ? 'danger' : 'info'} border-0 shadow-sm rounded-lg mb-4 font-weight-bold`}
                        >
                            <Sparkles size={16} className="mr-2 d-inline" /> {notification.message}
                        </motion.div>
                    )}

                    {/* Tab Navigation */}
                    <div className="ao-tabs mb-4" style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
                        <button 
                            className={`ao-tab-btn ${activeTab === 'orders' ? 'ao-tab-active' : ''}`}
                            onClick={() => setActiveTab('orders')}
                            style={{
                                padding: '12px 28px',
                                border: 'none',
                                background: activeTab === 'orders' ? '#fff' : 'transparent',
                                color: activeTab === 'orders' ? '#0f172a' : '#64748b',
                                fontWeight: activeTab === 'orders' ? '700' : '500',
                                fontSize: '14px',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'orders' ? '3px solid #D4AF37' : '3px solid transparent',
                                marginBottom: '-2px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                letterSpacing: '0.3px'
                            }}
                        >
                            <Package size={16} /> Orders
                        </button>
                        <button 
                            className={`ao-tab-btn ${activeTab === 'returns' ? 'ao-tab-active' : ''}`}
                            onClick={() => setActiveTab('returns')}
                            style={{
                                padding: '12px 28px',
                                border: 'none',
                                background: activeTab === 'returns' ? '#fff' : 'transparent',
                                color: activeTab === 'returns' ? '#0f172a' : '#64748b',
                                fontWeight: activeTab === 'returns' ? '700' : '500',
                                fontSize: '14px',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'returns' ? '3px solid #D4AF37' : '3px solid transparent',
                                marginBottom: '-2px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                letterSpacing: '0.3px'
                            }}
                        >
                            <RotateCcw size={16} /> Returns
                        </button>
                    </div>

                    {/* Conditional Content based on active tab */}
                    {activeTab === 'returns' ? (
                        <AdminReturnManagement />
                    ) : (
                    <motion.div 
                        initial={{opacity:0, y:20}} 
                        animate={{opacity:1, y:0}} 
                        transition={{ delay: 0.2 }}
                        className="lux-card"
                    >
                        {/* Toolbar: Search & Export */}
                        <div className="lux-toolbar border-bottom pb-3">
                            <div className="lux-search-box flex-grow-1" style={{ maxWidth: '400px' }}>
                                <Search size={16} className="lux-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by Order ID, Name, or Email..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="d-flex gap-2 flex-wrap align-items-center">
                                <button className="lux-btn-ghost" onClick={exportCsv}><Download size={14} className="mr-1" /> CSV</button>
                                <button className="lux-btn-ghost" onClick={exportPdf}><FileText size={14} className="mr-1" /> PDF</button>
                                <button className="lux-btn-ghost" onClick={resetFilters}><Sparkles size={14} className="mr-1" /> Reset</button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="p-3 bg-light border-bottom d-flex flex-wrap gap-3 align-items-end lux-filters-bar">
                            <div className="lux-filter-item">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="lux-input-sm"
                                    value={fromDate}
                                    max={toDate || undefined}
                                    onChange={(e) => {
                                        setDatePreset('custom');
                                        setFromDate(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="lux-filter-item">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="lux-input-sm"
                                    value={toDate}
                                    min={fromDate || undefined}
                                    onChange={(e) => {
                                        setDatePreset('custom');
                                        setToDate(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="lux-filter-item">
                                <label>Payment</label>
                                <select
                                    className="lux-select-sm"
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
                            <div className="lux-filter-item">
                                <label>Status</label>
                                <select
                                    className="lux-select-sm"
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Statuses</option>
                                    {ALLOWED_STATUSES.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="lux-filter-item">
                                <label>Services</label>
                                <select
                                    className="lux-select-sm"
                                    value={featureFilter}
                                    onChange={(e) => {
                                        setFeatureFilter(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="All">All Services</option>
                                    <option value="Express">⚡ Express</option>
                                    <option value="GiftWrap">🎁 Gift Wrap</option>
                                    <option value="CarePlus">🛡️ Care+</option>
                                    <option value="EcoBox">🌱 Eco Box</option>
                                    <option value="Coupon">🎟️ With Coupon</option>
                                </select>
                            </div>
                            <div className="lux-filter-item lux-filter-presets">
                                <div className="lux-btn-group">
                                    {DATE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            className={`lux-btn-group-item ${datePreset === preset.key ? 'active' : ''}`}
                                            onClick={() => applyDatePreset(preset.key)}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bulk Actions row */}
                        <div className="p-3 bg-white border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <select className="lux-select-sm" style={{width: 'auto'}} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                                    {ALLOWED_STATUSES.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <button className="lux-btn-secondary" onClick={handleBulkUpdate} disabled={bulkUpdating || bulkDeleting || selectedOrders.size === 0}>
                                    {bulkUpdating ? <Loader2 size={14} className="spin mr-1" /> : <Package size={14} className="mr-1" />} Bulk Update Selected
                                </button>
                                <button className="lux-btn-danger" onClick={handleBulkDelete} disabled={bulkUpdating || bulkDeleting || selectedOrders.size === 0}>
                                    {bulkDeleting ? <Loader2 size={14} className="spin mr-1" /> : <Trash2 size={14} className="mr-1" />} Bulk Delete
                                </button>
                            </div>
                            <div className="d-flex align-items-center gap-3 text-muted small font-weight-bold">
                                <label className="mb-0 d-flex align-items-center cursor-pointer">
                                    <input type="checkbox" className="mr-2" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                                    Auto Refresh
                                </label>
                                <span>Rows: 
                                    <select className="ml-1 border-0 bg-transparent outline-none font-weight-bold" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="lux-table-responsive">
                            {loading ? (
                                <div className="text-center py-5 text-muted">
                                    <Loader2 size={24} className="spin mb-2 mx-auto" />
                                    <p>Loading orders...</p>
                                </div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <Package size={32} className="mb-2 opacity-50 mx-auto" />
                                    <p>No orders found matching your criteria.</p>
                                </div>
                            ) : (
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center" style={{width: '50px'}}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll && filteredOrders.length > 0}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                />
                                            </th>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th className="hide-mobile">Email</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Services</th>
                                            <th className="hide-mobile">Updated</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.map((order) => {
                                            const IconComp = STATUS_ICONS[order.orderStatus] || STATUS_ICONS.Pending;
                                            const statusClass = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.Pending;

                                            return (
                                                <tr key={order.orderId} className={`lux-table-row ${selectedOrders.has(order.orderId) ? 'lux-row-selected' : ''}`}>
                                                    <td className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrders.has(order.orderId)}
                                                            onChange={() => handleOrderSelect(order.orderId)}
                                                        />
                                                    </td>
                                                    <td className="lux-td-id">
                                                        <div className="font-weight-bold color-ink">{String(order.orderId || '').slice(-8)}</div>
                                                        <button type="button" className="lux-link-btn mt-1" onClick={() => setDetailOrder(order)}>View Details</button>
                                                    </td>
                                                    <td>
                                                        <strong className="color-ink d-block">{order.userName || 'N/A'}</strong>
                                                        <span className="text-muted small d-block d-md-none">{order.userEmail}</span>
                                                    </td>
                                                    <td className="hide-mobile color-muted">{order.userEmail || 'N/A'}</td>
                                                    <td><strong className="lux-price-tag">INR {Number(order.finalAmount || 0).toLocaleString('en-IN')}</strong></td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            <span className={`lux-badge ${statusClass}`}>
                                                                <IconComp size={12} className="mr-1" /> {order.orderStatus || 'Pending'}
                                                            </span>
                                                            {order?.cancellation && order.cancellation.status && order.cancellation.status !== 'NOT_CANCELLED' && (
                                                                <span className="lux-badge-tag" style={{ background: '#fff7ed', color: '#b45309', border: '1px solid #fde68a', fontSize: '11px' }} title={order.cancellation.reason || order.cancellation.status}>
                                                                    ⚠️ Cancel: {order.cancellation.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                <td data-label="Services">
                                                    <div className="font-weight-bold mb-1">{order.productCount || (order.products || []).length || 0} Items</div>
                                                    <div className="d-flex flex-wrap" style={{ gap: '4px', maxWidth: '160px' }}>
                                                        {(() => {
                                                            const totalExtras = Number(order.extraCharges || 0);
                                                            const knownExtras = Number(order.giftWrapCharge || 0) + Number(order.protectionCharge || 0) + Number(order.ecoCharge || 0) + Number(order.paymentFee || 0);
                                                            const deducedExpress = Math.max(0, totalExtras - knownExtras);
                                                            const hasExpress = order.deliverySpeed === 'express' || Number(order.expressDeliveryFee || order.expressFee || 0) > 0 || deducedExpress === 49;
                                                            return hasExpress ? <span className="lux-badge-tag" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>⚡ Express</span> : null;
                                                        })()}
                                                        {order.giftWrapCharge > 0 && <span className="lux-badge-tag" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>🎁 Gift Wrap</span>}
                                                        {order.protectionCharge > 0 && <span className="lux-badge-tag" style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>🛡️ Care+</span>}
                                                        {order.ecoCharge > 0 && <span className="lux-badge-tag" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>🌱 Eco Box</span>}
                                                        {order.couponCode && <span className="lux-badge-tag" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>🎟️ {order.couponCode}</span>}
                                                    </div>
                                                </td>
                                                    <td className="hide-mobile color-muted">{new Date(order.updatedAt || Date.now()).toLocaleDateString('en-IN')}</td>
                                                    <td className="text-right">
                                                        <button
                                                            type="button"
                                                            className="lux-btn-action"
                                                            onClick={() => openActionDrawer(order)}
                                                        >
                                                            <Sparkles size={14} className="mr-1" /> Update
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="lux-pagination">
                                <button className="lux-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                                <span className="lux-page-info">Page {page} of {totalPages}</span>
                                <button className="lux-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                            </div>
                        )}
                    </motion.div>
                    )}
                </div>
            </div>

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

            {/* Luxury Styles Embedded */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');

                .lux-admin-page { font-family: 'Jost', sans-serif; }

                /* Banner */
                .lux-banner { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 24px; padding: 32px 40px; color: white; box-shadow: 0 20px 40px rgba(15,23,42,0.12); border: 1px solid rgba(212,175,55,0.2); }
                .lux-banner-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
                .lux-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 8px; }
                .lux-banner-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #ffffff; margin: 0 0 4px; }
                .lux-banner-title span { color: #D4AF37; }
                .lux-banner-sub { color: #94a3b8; margin: 0; font-size: 14px; }
                .lux-banner-stats { display: flex; gap: 16px; flex-wrap: wrap; }
                .lux-stat-box { background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 12px 20px; display: flex; flex-direction: column; }
                .lux-stat-box span { font-size: 11px; text-transform: uppercase; color: #D4AF37; letter-spacing: 0.5px; }
                .lux-stat-box strong { font-size: 24px; font-weight: 700; color: #fff; line-height: 1.2; }

                /* Card & Table */
                .lux-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid rgba(212,175,55,0.1); overflow: hidden; }
                .lux-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding: 24px; background: #fafbfc; }
                .lux-search-box { position: relative; }
                .lux-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .lux-search-box input { width: 100%; padding: 10px 16px 10px 40px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; transition: all 0.2s; outline: none; }
                .lux-search-box input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
                .lux-btn-ghost { background: transparent; border: 1px solid #e2e8f0; color: #475569; padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
                .lux-btn-ghost:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }

                /* Filters */
                .lux-filters-bar { background: #f8fafc; border-top: 1px solid #f1f5f9; }
                .lux-filter-item { display: flex; flex-direction: column; gap: 4px; }
                .lux-filter-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0; }
                .lux-input-sm, .lux-select-sm { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; outline: none; transition: all 0.2s; background: #fff; cursor: pointer; }
                .lux-input-sm:focus, .lux-select-sm:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }

                .lux-btn-group { display: flex; background: #e2e8f0; padding: 3px; border-radius: 10px; }
                .lux-btn-group-item { background: transparent; border: none; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #64748b; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .lux-btn-group-item.active { background: #fff; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

                .lux-btn-secondary { background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
                .lux-btn-secondary:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
                .lux-btn-danger { background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
                .lux-btn-danger:hover:not(:disabled) { background: #fee2e2; color: #b91c1c; }
                .lux-btn-secondary:disabled, .lux-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Table */
                .lux-table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .lux-table { width: 100%; border-collapse: collapse; min-width: 900px; }
                .lux-table th { background: #fff; padding: 16px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
                .lux-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; }
                .lux-table-row { transition: all 0.2s; }
                .lux-table-row:hover td { background: #fafbfc; }
                .lux-row-selected td { background: #fefce8 !important; }

                .lux-link-btn { background: transparent; border: none; color: #D4AF37; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 0; cursor: pointer; transition: color 0.2s; }
                .lux-link-btn:hover { color: #b8860b; text-decoration: underline; }

                .lux-td-id { font-family: monospace; color: #94a3b8; font-size: 12px; }
                .color-ink { color: #0f172a; }
                .color-muted { color: #64748b; }
                .lux-price-tag { color: #0f766e; font-weight: 700; }
                .lux-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

                .status-pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                .status-confirmed { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
                .status-packed { background: #f3e8ff; color: #9333ea; border: 1px solid #e9d5ff; }
                .status-shipped { background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe; }
                .status-out-for-delivery { background: #fdf4ff; color: #c026d3; border: 1px solid #fae8ff; }
                .status-delivered { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

                .lux-badge-tag { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.3px; display: inline-flex; align-items: center; }

                .lux-btn-action { display: inline-flex; align-items: center; padding: 8px 16px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #D4AF37; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(15,23,42,0.1); }
                .lux-btn-action:hover { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(15,23,42,0.2); background: #0f172a; }

                .lux-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 20px; background: #fff; border-top: 1px solid #e2e8f0; }
                .lux-page-btn { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .lux-page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
                .lux-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .lux-page-info { font-size: 13px; font-weight: 600; color: #64748b; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .hide-mobile { display: none !important; }
                    .lux-table { min-width: 100%; }
                    .lux-banner { padding: 24px; }
                    .lux-toolbar { flex-direction: column; align-items: stretch; }
                    .lux-search-box { max-width: 100% !important; }
                    .lux-filters-bar { flex-direction: column; align-items: stretch !important; }
                    .lux-filter-presets { overflow-x: auto; padding-bottom: 4px; }
                    .lux-btn-group { min-width: max-content; }
                }
            `}} />
        </div>
    );
}
