import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle2, Download, Plus, ShieldCheck, RotateCcw, Headphones, Copy, RefreshCw, Share2, FileText, Radar, Sparkles, CreditCard, Calendar, ChevronRight, X } from 'lucide-react';
import { clearCart, getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { queryClient } from '../queries/queryClient';
import { catalogQueryKeys } from '../queries/catalogQueries';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, FRONTEND_URL, SOCKET_TRANSPORTS } from '../constants';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { useToast } from './ToastNotification';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered';
  if (raw === 'confirmed') return 'Confirmed';
  if (raw === 'packed') return 'Packed';
  if (raw === 'shipped') return 'Shipped';
  if (raw === 'out for delivery') return 'Out for Delivery';
  if (raw === 'delivered') return 'Delivered';
  return 'Ordered';
};

const isCancelableOrder = (order = {}) => {
  const status = normalizeStatus(order?.orderStatus || order?.status);
  if (['Shipped', 'Out for Delivery', 'Delivered'].includes(status)) return false;
  if (order?.cancellation?.status && order.cancellation.status !== 'NOT_CANCELLED') return false;
  return ['Ordered', 'Confirmed', 'Packed'].includes(status);
};

const normalizeOrderPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.order && typeof payload.order === 'object') return payload.order;
  if (payload.data && typeof payload.data === 'object' && payload.data.order) return payload.data.order;
  return payload.orderId ? payload : null;
};

export default function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const users = useSelector((state) => state.UserStateData || []);
  const productState = useSelector((state) => state.ProductStateData || []);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [quickAddingId, setQuickAddingId] = useState('');
  const [quickAddedMap, setQuickAddedMap] = useState({});
  const [shared, setShared] = useState(false);
  const [heroTheme, setHeroTheme] = useState('light');
  const [cancelling, setCancelling] = useState(false);
  const syncInProgressRef = useRef(false);
  const hasCelebratedRef = useRef(false);
  const hasClearedCartRef = useRef(false);

  const localUserId = localStorage.getItem('userid');
  const userId =
    order?.userid ||
    localUserId ||
    users.find((u) => String(u.id || u.userid || u._id) === String(localUserId))?.userid ||
    '';

  const estimatedDate = useMemo(() => {
    const d = new Date(order?.estimatedArrival || Date.now() + 4 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [order?.estimatedArrival]);

  const customerName = useMemo(() => {
    const raw = order?.shippingAddress?.fullName || order?.userName || 'Valued Customer';
    return String(raw).trim().split(' ')[0] || 'Valued Customer';
  }, [order?.shippingAddress?.fullName, order?.userName]);

  const statusTone = useMemo(() => {
    const s = String(order?.orderStatus || order?.status || 'Ordered').toLowerCase();
    if (s.includes('delivered')) return 'tone-success';
    if (s.includes('shipped') || s.includes('out for delivery')) return 'tone-info';
    if (s.includes('cancel') || s.includes('failed')) return 'tone-danger';
    return 'tone-warn';
  }, [order?.status]);

  async function fetchLatestOrder(orderId, currentUserId) {
    if (!orderId || !currentUserId) return null;
    const endpoints = [
      `${BASE_URL}/api/orders/${encodeURIComponent(orderId)}`,
      `${BASE_URL}/api/order/${encodeURIComponent(orderId)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.get(endpoint, {
          params: { userId: currentUserId },
          timeout: 15000
        });
        const normalized = normalizeOrderPayload(data);
        if (normalized) return normalized;
      } catch (error) {
        const status = error?.response?.status;
        if (![400, 404].includes(status)) throw error;
      }
    }

    return null;
  }

  const canCancelOrder = useMemo(() => {
    if (order?.lifecycle && typeof order.lifecycle.canCancel === 'boolean') {
      return order.lifecycle.canCancel;
    }
    return isCancelableOrder(order || {});
  }, [order]);

  const handleCancelOrder = useCallback(async () => {
    if (!order?.orderId || !userId || cancelling || !canCancelOrder) return;

    const reason = window.prompt('Share a cancellation reason (optional):', '');
    if (reason === null) return;

    try {
      setCancelling(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/orders/${encodeURIComponent(order.orderId)}/cancel`,
        { userId, reason: String(reason).trim() },
        { timeout: 15000 }
      );
      toast.success(data?.message || 'Order cancelled. Premium support will handle the rest.');
      const latest = await fetchLatestOrder(order.orderId, userId);
      if (latest) {
        setOrder(latest);
        localStorage.setItem('lastPlacedOrder', JSON.stringify(latest));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Unable to cancel this order right now.');
    } finally {
      setCancelling(false);
    }
  }, [canCancelOrder, cancelling, fetchLatestOrder, order?.orderId, toast, userId]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: catalogQueryKeys.products });
    async function syncOrder() {
      const locationState = location.state;
      let fallbackOrder = null;

      if (locationState?.order) {
        fallbackOrder = locationState.order;
      } else {
        const stored = localStorage.getItem('lastPlacedOrder');
        if (stored) {
          try {
            fallbackOrder = JSON.parse(stored);
          } catch (e) {
            localStorage.removeItem('lastPlacedOrder');
          }
        }
      }

      if (fallbackOrder) {
        setOrder(normalizeOrderPayload(fallbackOrder) || fallbackOrder);
      }

      const orderId = fallbackOrder?.orderId;
      const currentUserId = localStorage.getItem('userid');

      try {
        const latest = await fetchLatestOrder(orderId, currentUserId);
        if (latest) {
          setOrder(latest);
          localStorage.setItem('lastPlacedOrder', JSON.stringify(latest));
          setIsBackendConnected(true);
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.error('Order sync failed:', err?.message || err);
        setIsBackendConnected(false);
      } finally {
        setLoading(false);
      }
    }

    syncOrder();
  }, []);

  useEffect(() => {
    if (!order || !userId) return;

    if (location.state?.direct) {
      return;
    }

      if (!hasClearedCartRef.current) {
        dispatch(clearCart({ userid: userId }));
        axios.post(`${BASE_URL}${API_ENDPOINTS?.CLEAR_CART || '/api/cart/clear'}/${userId}`).catch(() => {});
        hasClearedCartRef.current = true;
      }
  }, [order, userId, dispatch]);

  useEffect(() => {
    async function getRecommendedProducts() {
      try {
        const { data } = await axios.get(`${BASE_URL}/product`, { timeout: 12000 });
        const list = Array.isArray(data) ? data : [];
        const purchased = new Set((order?.products || []).map((p) => String(p.productid || p._id || p.id || '')));
        const picks = list.filter((p) => !purchased.has(String(p._id || p.id || ''))).slice(0, 4);
        setRecommended(picks);
      } catch (e) {
        setRecommended([]);
      }
    }

    if (order?.orderId) getRecommendedProducts();
  }, [order?.orderId]);

  async function handleRefreshStatus() {
    const oid = order?.orderId;
    const uid = localStorage.getItem('userid');
    if (!oid || !uid || refreshing) return;
    try {
      setRefreshing(true);
      const latest = await fetchLatestOrder(oid, uid);
      if (latest) {
        setOrder(latest);
        localStorage.setItem('lastPlacedOrder', JSON.stringify(latest));
        setIsBackendConnected(true);
        setLastSyncedAt(new Date());
      }
    } catch (e) {
      console.error('Refresh failed:', e?.message || e);
      setIsBackendConnected(false);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const oid = order?.orderId;
    const uid = localStorage.getItem('userid');
    if (!oid || !uid) return undefined;

    const interval = setInterval(async () => {
      try {
        const latest = await fetchLatestOrder(oid, uid);
        if (latest) {
          setOrder(latest);
          localStorage.setItem('lastPlacedOrder', JSON.stringify(latest));
          setIsBackendConnected(true);
          setLastSyncedAt(new Date());
        }
      } catch (e) {
        setIsBackendConnected(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [order?.orderId]);

  useEffect(() => {
    const oid = order?.orderId;
    const uid = localStorage.getItem('userid');
    if (!oid || !uid) return undefined;

    const socket = io(BASE_URL, {
      auth: { userId: uid },
      transports: SOCKET_TRANSPORTS,
      reconnection: true,
      reconnectionDelay: 1200,
      reconnectionAttempts: 6,
      forceNew: true
    });

    const syncOnEvent = async (payload = {}) => {
      const eventOrderId = String(payload?.orderId || '');
      if (!eventOrderId || eventOrderId !== String(oid)) return;
      if (syncInProgressRef.current) return;

      try {
        syncInProgressRef.current = true;
        const latest = await fetchLatestOrder(oid, uid);
        if (latest) {
          setOrder(latest);
          localStorage.setItem('lastPlacedOrder', JSON.stringify(latest));
          setIsBackendConnected(true);
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        setIsBackendConnected(false);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    socket.on('connect', () => setIsBackendConnected(true));
    socket.on('disconnect', () => setIsBackendConnected(false));
    socket.on('statusUpdate', syncOnEvent);
    socket.on('orderUpdate', syncOnEvent);

    return () => {
      socket.off('statusUpdate', syncOnEvent);
      socket.off('orderUpdate', syncOnEvent);
      socket.disconnect();
    };
  }, [order?.orderId]);

  function handleCopyOrderId() {
    if (!order?.orderId) return;
    navigator.clipboard.writeText(String(order.orderId)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  }

  function handleDownloadInvoice() {
    if (!order) return;
    toast.success("Preparing tax invoice...");

    const items = Array.isArray(order.products) ? order.products : [];
    const invoiceDate = formatDate(order.createdAt || Date.now());
    const deliverBy = formatDate(order.estimatedArrival || Date.now() + 4 * 24 * 60 * 60 * 1000);
    const invoiceNo = `INV-${String(order.orderId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`;
    const subtotal = Number(order.totalAmount || 0);
    const shipping = Number(order.shippingAmount || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const finalAmount = Number(order.finalAmount || 0);
    
    const gstAmount = Number(order.gstAmount || 0);
    const instantDiscount = Number(order.discountAmount || order.discount || 0);
    const giftWrapCharge = Number(order.giftWrapCharge || 0);
    const protectionCharge = Number(order.protectionCharge || 0);
    const ecoCharge = Number(order.ecoCharge || 0);
    const paymentFee = Number(order.paymentFee || 0);
    const totalExtras = Number(order.extraCharges || 0);
    const knownExtras = giftWrapCharge + protectionCharge + ecoCharge + paymentFee;
    const deducedExpress = Math.max(0, totalExtras - knownExtras);
    const resolvedSpeed = order.deliverySpeed || location.state?.order?.deliverySpeed || '';
    const expressFee = Number(order.expressDeliveryFee || order.expressFee || 0) || (String(resolvedSpeed).toLowerCase() === 'express' ? 49 : (deducedExpress === 49 ? 49 : 0));
    const displayPaymentMethod = order.paymentMethod === 'UPI' ? 'UPI / Wallet' : (order.paymentMethod || 'UPI / Wallet');

    const taxEstimate = gstAmount > 0 ? gstAmount : Math.max(0, Math.round(subtotal * 0.05));

    let calcMrpTotal = 0;
    items.forEach(p => {
        const qty = Number(p.quantity ?? p.qty ?? 1);
        const price = Number(p.price ?? p.product?.finalprice ?? p.product?.price ?? 0);
        const baseprice = Number(p.baseprice ?? p.product?.baseprice ?? price);
        calcMrpTotal += (baseprice > price ? baseprice : price) * qty;
    });
    const displayMrpTotal = calcMrpTotal > subtotal ? calcMrpTotal : subtotal;
    const displayMrpDiscount = displayMrpTotal - subtotal;

    const rows = items.map((p, idx) => {
      const qty = Number(p.quantity ?? p.qty ?? 1);
      const price = Number(p.price ?? p.product?.finalprice ?? p.product?.price ?? 0);
      const lineTotal = Number(p.total ?? qty * price);
      const sku = String(p._id || p.id || p.productid || '').slice(0, 14);
      const name = String(p.name || p.product?.name || 'Product');
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <div class="name">${name}</div>
            <div class="muted">SKU: ${sku || 'N/A'}</div>
          </td>
          <td>${qty}</td>
          <td>${money(price)}</td>
          <td>${money(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${order.orderId || ''}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            color: #0f172a;
            background: #f4f7fb;
            padding: 24px;
          }
          .invoice {
            max-width: 980px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #dbe4ef;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
          }
          .hero {
            background: linear-gradient(115deg, #0f172a, #1e293b 55%, #0b1220);
            color: #fff;
            padding: 22px;
            display: flex;
            justify-content: space-between;
            gap: 16px;
          }
          .hero h1 {
            margin: 0 0 6px;
            font-size: 26px;
            letter-spacing: 0.4px;
          }
          .hero p {
            margin: 0;
            color: #cbd5e1;
            font-size: 13px;
          }
          .brand {
            text-align: right;
          }
          .brandmark {
            display: inline-table;
            border-collapse: collapse;
            margin-left: auto;
            margin-bottom: 8px;
          }
          .brandmark td {
            padding: 0;
            vertical-align: top;
          }
          .brandmark-e-cell {
            padding-right: 8px !important;
          }
          .brandmark-e {
            background: linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
            color: #fff;
            width: 34px;
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 21px;
            font-weight: 800;
            border-radius: 4px;
            border-right: 3px solid #d4af37;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22);
            line-height: 34px;
          }
          .brandmark-text {
            display: table-cell;
            line-height: 1;
          }
          .brandmark-name {
            display: block;
            font-weight: 800;
            letter-spacing: 2.4px;
            font-size: 18px;
            color: #f5f7fb;
            line-height: 1;
          }
          .brandmark-tag {
            display: block;
            font-size: 7px;
            letter-spacing: 1.8px;
            color: #d4af37;
            font-weight: 700;
            margin-top: 2px;
            line-height: 1.1;
          }
          .brand .site {
            font-size: 12px;
            color: #93c5fd;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            padding: 16px 22px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
          }
          .meta .card {
            border: 1px solid #dbe4ef;
            border-radius: 10px;
            padding: 10px;
            background: #fff;
          }
          .label {
            font-size: 11px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .value {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.45;
            word-break: break-word;
          }
          .body {
            padding: 18px 22px 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          thead th {
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
            padding: 10px 8px;
          }
          tbody td {
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 8px;
            font-size: 14px;
            vertical-align: top;
          }
          .name { font-weight: 800; color: #0f172a; margin-bottom: 3px; }
          .muted { color: #64748b; font-size: 12px; }
          .summary {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 16px;
            margin-top: 16px;
          }
          .note, .totals {
            border: 1px solid #dbe4ef;
            border-radius: 12px;
            padding: 12px;
            background: #f8fafc;
          }
          .totals .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
            color: #334155;
          }
          .totals .row strong { color: #0f172a; }
          .grand {
            margin-top: 10px;
            border-top: 1px dashed #94a3b8;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: 900;
            color: #0284c7;
          }
          .footer {
            margin-top: 16px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            color: #64748b;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .invoice { box-shadow: none; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="hero">
            <div>
              <h1>Tax Invoice</h1>
              <p>Issued for your recent order on ESHOPPER</p>
              <p>Invoice No: ${invoiceNo}</p>
            </div>
            <div class="brand">
              <table class="brandmark" cellpadding="0" cellspacing="0"><tr><td class="brandmark-e-cell"><span class="brandmark-e">E</span></td><td class="brandmark-text"><span class="brandmark-name">SHOPPER</span><span class="brandmark-tag">BOUTIQUE LUXE</span></td></tr></table>
              <div class="site">${FRONTEND_URL}</div>
            </div>
          </div>

          <div class="meta">
            <div class="card">
              <div class="label">Order Details</div>
              <div class="value">Order ID: ${order.orderId || 'N/A'}<br/>Order Date: ${invoiceDate}<br/>Expected Delivery: ${deliverBy}</div>
            </div>
            <div class="card">
              <div class="label">Billed To</div>
              <div class="value">${order.shippingAddress?.fullName || '-'}<br/>${order.shippingAddress?.phone || '-'}<br/>${order.shippingAddress?.addressline1 || order.shippingAddress?.address || '-'}<br/>${order.shippingAddress?.city || '-'}, ${order.shippingAddress?.state || '-'} ${order.shippingAddress?.pin || order.shippingAddress?.zipCode || '-'}</div>
            </div>
            <div class="card">
              <div class="label">Payment & Seller</div>
              <div class="value">Method: ${order.paymentMethod || 'UPI'}<br/>Status: ${order.status || 'Ordered'}<br/>Seller: ESHOPPER Online Pvt Ltd<br/>GSTIN: 07AABCU9603R1ZX</div>
            </div>
          </div>

          <div class="body">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="summary">
              <div class="note">
                <div class="label">Important Notes</div>
                <div class="value">This is a system-generated invoice and does not require physical signature.<br/>For support, visit ${FRONTEND_URL}/contact with your Order ID.</div>
              </div>

              <div class="totals">
                <div class="row"><span>Items Subtotal</span><strong>${money(displayMrpTotal)}</strong></div>
                ${displayMrpDiscount > 0 ? `<div class="row" style="color: #16a34a;"><span>Discount on MRP</span><strong>-${money(displayMrpDiscount)}</strong></div>` : ''}
                ${instantDiscount > 0 ? `<div class="row" style="color: #16a34a;"><span>Instant Discount</span><strong>-${money(instantDiscount)}</strong></div>` : ''}
                <div class="row"><span>Shipping</span><strong>${shipping === 0 ? 'FREE' : money(shipping)}</strong></div>
                ${expressFee > 0 ? `<div class="row"><span class="lux-express-badge"><span class="lux-express-icon">⚡</span> Express Delivery</span><strong>${money(expressFee)}</strong></div>` : ''}
                ${taxEstimate > 0 ? `<div class="row"><span>GST (5%)</span><strong>${money(taxEstimate)}</strong></div>` : ''}
                <div class="row"><span>Payment Fee (${displayPaymentMethod})</span><strong>${paymentFee > 0 ? money(paymentFee) : 'FREE'}</strong></div>
                ${protectionCharge > 0 ? `<div class="row"><span>Delivery Protection</span><strong>${money(protectionCharge)}</strong></div>` : ''}
                ${giftWrapCharge > 0 ? `<div class="row"><span>Luxury Gift Wrap</span><strong>${money(giftWrapCharge)}</strong></div>` : ''}
                ${ecoCharge > 0 ? `<div class="row"><span>Eco Packaging</span><strong>${money(ecoCharge)}</strong></div>` : ''}
                ${couponDiscount > 0 ? `<div class="row" style="color: #16a34a;"><span>Coupon ${order.couponCode ? `(${order.couponCode})` : ''}</span><strong>-${money(couponDiscount)}</strong></div>` : ''}
                <div class="grand"><span>Grand Total</span><span>${money(finalAmount)}</span></div>
              </div>
            </div>

            <div class="footer">
              <span>Generated on ${formatDate(Date.now())}</span>
              <span>ESHOPPER • Premium Ecommerce Experience</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => {
        popup.print();
      }, 350);
    } else {
      toast.error("Popup blocked! Please allow popups to view the invoice.");
    }
  }

  async function handleQuickAdd(product) {
    const currentUserId = localStorage.getItem('userid');
    const productId = product?._id || product?.id;
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    if (!productId || quickAddingId === String(productId)) return;

    try {
      setQuickAddingId(String(productId));
      const payload = {
        userId: currentUserId,
        productId,
        quantity: 1,
        size: Array.isArray(product?.size) ? (product?.size[0] || "") : (typeof product?.size === 'string' ? product.size.split(',')[0].trim() : (product?.size || "")),
        color: typeof product?.color === 'string' ? product?.color.split(',')[0] : (product?.color || ""),
        price: Number(product?.finalprice || product?.price || 0),
        name: product?.name || "",
        pic: product?.pic1 || product?.pic || ""
      };

      dispatch(addCart(payload));

      dispatch(getCart());
      toast.success(`${product?.name || 'Item'} added to cart! 🛍️`);

      setQuickAddedMap((prev) => ({ ...prev, [String(productId)]: true }));
      setTimeout(() => {
        setQuickAddedMap((prev) => {
          const next = { ...prev };
          delete next[String(productId)];
          return next;
        });
      }, 1600);
    } catch (error) {
      console.error('Quick add failed:', error?.message || error);
    } finally {
      setQuickAddingId('');
    }
  }

  const returnWindowUntil = useMemo(() => {
    const d = new Date(order?.estimatedArrival || Date.now());
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, [order?.estimatedArrival]);

  useEffect(() => {
    if (!loading && order && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#D4AF37', '#E8C97A', '#1e293b', '#ffffff', '#10b981'],
          zIndex: 9999
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#D4AF37', '#E8C97A', '#1e293b', '#ffffff', '#10b981'],
          zIndex: 9999
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [loading, order]);

  if (loading || !order) {
    return (
      <div className='lux-confirm-loading'>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
          <Sparkles size={54} color="#D4AF37" strokeWidth={1.2} />
        </motion.div>
        <p className='lux-loading-text'>Preparing your luxury confirmation...</p>
        <style>{styles}</style>
      </div>
    );
  }

  const items = Array.isArray(order.products) ? order.products : [];
  const shippingAddress = order.shippingAddress || {};
  const paymentMethod = order.paymentMethod || 'UPI';
  
  let notesSlot = null;
  if (order?.notes && String(order.notes).includes('Delivery Slot:')) {
    notesSlot = String(order.notes).split('Delivery Slot:')[1].trim();
  }
  const deliverySlot = notesSlot || order?.shippingAddress?.deliverySlot || order?.shippingAddress?.deliveryTime || order?.deliverySlot || order?.deliverySchedule?.time || order?.deliveryTime || 'Standard Delivery';

  const subtotal = Number(order.totalAmount || 0);
  const shipping = Number(order.shippingAmount || 0);
  const finalAmount = Number(order.finalAmount || 0);
  const couponDiscount = Number(order.couponDiscount || 0);

  const gstAmount = Number(order.gstAmount || 0);
  const instantDiscount = Number(order.discountAmount || order.discount || 0);
  const giftWrapCharge = Number(order.giftWrapCharge || 0);
  const protectionCharge = Number(order.protectionCharge || 0);
  const ecoCharge = Number(order.ecoCharge || 0);
  const paymentFee = Number(order.paymentFee || 0);
  const totalExtras = Number(order.extraCharges || 0);
  const knownExtras = giftWrapCharge + protectionCharge + ecoCharge + paymentFee;
  const deducedExpress = Math.max(0, totalExtras - knownExtras);
  const resolvedSpeed = order.deliverySpeed || location.state?.order?.deliverySpeed || '';
  const expressFee = Number(order.expressDeliveryFee || order.expressFee || 0) || (String(resolvedSpeed).toLowerCase() === 'express' ? 49 : (deducedExpress === 49 ? 49 : 0));
  const displayPaymentMethod = order.paymentMethod === 'UPI' ? 'UPI / Wallet' : (order.paymentMethod || 'UPI / Wallet');

  const taxEstimate = gstAmount > 0 ? gstAmount : Math.max(0, Math.round(subtotal * 0.05));

  let calcMrpTotal = 0;
  items.forEach(p => {
      const qty = Number(p.quantity ?? p.qty ?? 1);
      const price = Number(p.price ?? p.product?.finalprice ?? p.product?.price ?? 0);
      const baseprice = Number(p.baseprice ?? p.product?.baseprice ?? price);
      calcMrpTotal += (baseprice > price ? baseprice : price) * qty;
  });
  const displayMrpTotal = calcMrpTotal > subtotal ? calcMrpTotal : subtotal;
  const displayMrpDiscount = displayMrpTotal - subtotal;

  const timeline = [
    { title: 'Order Received', meta: 'Now', icon: Package },
    { title: 'Processing', meta: 'Today', icon: Truck },
    { title: 'Delivered', meta: estimatedDate, icon: CheckCircle2 },
  ];

  const assurancePoints = [
    { icon: ShieldCheck, title: 'Secure Checkout', copy: 'Encrypted payment and verified fulfillment.' },
    { icon: RotateCcw, title: 'Easy Returns', copy: 'Hassle-free return support from your account.' },
    { icon: Headphones, title: 'Priority Concierge', copy: 'VIP help for delivery and tracking issues.' }
  ];

  async function handleShareOrder() {
    const orderCode = order?.orderId || '';
    const shareUrl = `${FRONTEND_URL}/order-tracking/${encodeURIComponent(orderCode)}`;
    const payload = {
      title: 'ESHOPPER Order Confirmation',
      text: `Track my order ${orderCode} on ESHOPPER`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch (err) {
      // Silent fallback for share cancellation.
    }
  }

  const orderStatus = String(order?.orderStatus || order?.status || 'ordered').toLowerCase();
  const currentStepIndex = orderStatus.includes('deliver')
    ? 2
    : (orderStatus.includes('ship') || orderStatus.includes('pack') || orderStatus.includes('out for delivery')
      ? 1
      : 0);

  const timelineProgress = Math.min(100, Math.max(0, ((currentStepIndex + 1) / timeline.length) * 100));

  return (
    <motion.div className='lux-confirm-page' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className='container py-5'>
        
        {/* Premium Hero Section */}
        <motion.section className={`lux-hero ${heroTheme === 'dark' ? 'lux-hero-dark' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className='lux-hero-monogram'>E</span>
          
          <div className='lux-hero-badge'>
            <CheckCircle2 size={14} className="mr-2" style={{ display: 'inline' }} />
            ORDER CONFIRMED
          </div>
          {order.couponCode && order.couponDiscount > 0 && (
            <div className='lux-hero-badge' style={{ marginLeft: '12px', borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
              <Sparkles size={14} className="mr-2" style={{ display: 'inline' }} />
              SAVED ₹{order.couponDiscount} ({order.couponCode})
            </div>
          )}
          
          <h1>Thank you for your order, {customerName}.</h1>
          <p className='lux-hero-sub'>Your exclusive pieces are being prepared. Order ID: {order.orderId || 'N/A'}</p>
          
          <div className='lux-meta-grid'>
            <span className='lux-meta-pill'><CreditCard size={14} className="mr-2" style={{ display: 'inline' }} /> {paymentMethod}</span>
            <span className='lux-meta-pill'><Calendar size={14} className="mr-2" style={{ display: 'inline' }} /> {deliverySlot}</span>
            <span className={`lux-meta-pill ${statusTone}`}><Package size={14} className="mr-2" style={{ display: 'inline' }} /> {order.orderStatus || order.status || 'Ordered'}</span>
          </div>
          
          <div className='lux-action-bar'>
            <button className='lux-btn lux-btn-primary' onClick={() => navigate(`/order-tracking/${encodeURIComponent(order.orderId || '')}`)}>
              <Radar size={14} />
              <span>Track Live</span>
            </button>
            {canCancelOrder && (
              <button className='lux-btn lux-btn-outline' onClick={handleCancelOrder} disabled={cancelling} style={{ borderColor: 'rgba(220, 38, 38, 0.35)', color: '#dc2626', background: 'rgba(220, 38, 38, 0.04)' }}>
                <X size={14} />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
              </button>
            )}
            <button className='lux-btn lux-btn-outline' onClick={handleDownloadInvoice}>
              <Download size={14} />
              <span>Download Invoice</span>
            </button>
            <button className='lux-btn lux-btn-outline' onClick={handleCopyOrderId}>
              <Copy size={14} />
              <span>{copied ? 'Copied' : 'Copy Order ID'}</span>
            </button>
            <button className='lux-btn lux-btn-outline' onClick={handleRefreshStatus}>
              <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
            <button className='lux-btn lux-btn-outline' onClick={handleShareOrder}>
              <Share2 size={14} />
              <span>{shared ? 'Shared' : 'Share Order'}</span>
            </button>
          </div>
          {canCancelOrder && (
            <p style={{ margin: '12px 0 0', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7c6a35', fontWeight: 700 }}>
              Cancel is available until the order enters shipment.
            </p>
          )}
        </motion.section>

        {/* Cancellation Banner - show prominently on confirmation page when cancelled */}
        {order?.cancellation && order.cancellation.status && order.cancellation.status !== 'NOT_CANCELLED' && (
          <div style={{ maxWidth: 1180, margin: '16px auto', padding: '0 28px' }}>
            <motion.div className='lux-alert' initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }} style={{ borderRadius: 10, padding: '14px 18px', background: 'linear-gradient(90deg, rgba(220,38,38,0.06), rgba(255,255,255,0))', border: '1px solid rgba(220,38,38,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Order Cancelled</div>
                  <div style={{ marginTop: 6, color: '#475569' }}>{order.cancellation?.publicMessage || 'Your order has been cancelled. Our premium support is taking care of the rest.'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{order.cancellation.approvedAt ? new Date(order.cancellation.approvedAt).toLocaleString() : (order.cancellation.requestedAt ? new Date(order.cancellation.requestedAt).toLocaleString() : '')}</div>
                  <div style={{ marginTop: 8 }}>
                    <button className='lux-btn lux-btn-outline' onClick={() => navigate(`/order-tracking/${encodeURIComponent(order.orderId || '')}`)} style={{ borderColor: 'rgba(220,38,38,0.18)', color: '#b91c1c' }}>View Details</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assurance Features */}
        <motion.section className='lux-assurance assurance-strip' initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {assurancePoints.map((point) => (
            <div className='lux-assurance-card' key={point.title}>
              <point.icon size={16} />
              <div>
                <h6>{point.title}</h6>
                <p>{point.copy}</p>
              </div>
            </div>
          ))}
        </motion.section>

        <div className='row mt-4 g-4'>
          <motion.div className='col-lg-7' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className='lux-card'>
              <h4>
                Manifest
                <span className='lux-count-pill'>{items.length} items</span>
              </h4>

              <div className='lux-items-wrap'>
                {items.map((item, idx) => {
                  const qty = Number(item.quantity ?? item.qty ?? 1);
              const prodId = item.productid || item.product?._id || item.product || item._id || item.id || '';
              const fullProduct = productState.find(p => String(p.id || p._id) === String(prodId)) || {};
              
              const itemName = item.name || item.product?.name || item.productid?.name || fullProduct.name || 'Premium Product';
              const itemBrand = item.brand || item.product?.brand || item.productid?.brand || fullProduct.brand || 'Premium Brand';
              const price = Number(item.price ?? item.product?.finalprice ?? item.productid?.finalprice ?? fullProduct.finalprice ?? fullProduct.price ?? 0);
              const lineTotal = Number(item.total ?? (qty * price));
              const pic = item.pic || item.product?.pic1 || item.productid?.pic1 || fullProduct.pic1 || '/assets/images/noimage.png';

                  return (
                    <div key={item._id || item.id || idx} className='lux-item'>
                      <img src={optimizeCloudinaryUrlAdvanced(pic, { maxWidth: 240, crop: 'fill' })} alt='product' />
                      <div className='lux-item-details'>
                        <div className='lux-item-brand'>{itemBrand}</div>
                        <div className='lux-item-name'>{itemName}</div>
                        <div className='lux-item-meta'>
                          <span>Qty: {qty}</span> <span className="mx-2 text-muted">•</span> 
                          <span>SKU: {String(prodId).slice(0, 8).toUpperCase()}</span>
                          {item.giftWrap && (
                            <>
                              <span className="mx-2 text-muted">•</span>
                              <span style={{ color: '#a88a5a', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Gift Wrapped">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                                Gift Wrapped
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className='lux-item-price'>{money(lineTotal)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='lux-card mt-4'>
              <h4>
                <span>Order Journey</span>
                {expressFee > 0 ? (
                  <span className="lux-express-badge"><span className="lux-express-icon">⚡</span> EXPRESS</span>
                ) : (
                  <span className="lux-standard-badge">Standard: {estimatedDate}</span>
                )}
              </h4>
              <div className='lux-timeline'>
                <div className="lux-timeline-progress" style={{ width: `${timelineProgress}%` }} />
                {timeline.map((step, i) => (
                  <div className={`lux-timeline-step ${i <= currentStepIndex ? 'completed' : ''} ${i === currentStepIndex ? 'current' : ''}`} key={step.title}>
                      <span className='lux-timeline-icon'>
                        <step.icon size={13} />
                      </span>
                      <div className='lux-timeline-title'>{step.title}</div>
                      <div className='lux-timeline-meta'>{step.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div className='col-lg-5' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className='lux-card'>
              <h4>Summary</h4>
              
              <div className='lux-summary-row'><span>Items Subtotal</span><strong>{money(displayMrpTotal)}</strong></div>
              {displayMrpDiscount > 0 && (
                <div className='lux-summary-row text-success'><span>Discount on MRP</span><strong>-{money(displayMrpDiscount)}</strong></div>
              )}
              {instantDiscount > 0 && (
                <div className='lux-summary-row text-success'><span>Instant Discount</span><strong>-{money(instantDiscount)}</strong></div>
              )}
              <div className='lux-summary-row'><span>Shipping</span><strong>{shipping === 0 ? 'FREE' : money(shipping)}</strong></div>
              {expressFee > 0 && <div className='lux-summary-row'><span>Express Delivery</span><strong>{money(expressFee)}</strong></div>}
              {taxEstimate > 0 && <div className='lux-summary-row'><span>GST (5%)</span><strong>{money(taxEstimate)}</strong></div>}
              <div className='lux-summary-row'><span>Payment Fee ({displayPaymentMethod})</span><strong>{paymentFee > 0 ? money(paymentFee) : 'FREE'}</strong></div>
              {protectionCharge > 0 && <div className='lux-summary-row'><span>Delivery Protection</span><strong>{money(protectionCharge)}</strong></div>}
              {giftWrapCharge > 0 && <div className='lux-summary-row'><span>Luxury Gift Wrap</span><strong>{money(giftWrapCharge)}</strong></div>}
              {ecoCharge > 0 && <div className='lux-summary-row'><span>Eco Packaging</span><strong>{money(ecoCharge)}</strong></div>}
              {couponDiscount > 0 && (
                <div className='lux-summary-row text-success'><span>Coupon {order.couponCode ? `(${order.couponCode})` : ''}</span><strong>-{money(couponDiscount)}</strong></div>
              )}
              
              <div className='lux-summary-total'>
                <span>Payable Amount</span>
                <strong>
                  {money(finalAmount)} <Sparkles size={18} className="ml-1" style={{ display: 'inline', color: '#D4AF37', marginTop: '-4px' }} />
                </strong>
              </div>
            </div>
            
            <div className='lux-card mt-4'>
              <h4>Delivery Location</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: '8px' }}>{shippingAddress.fullName || '-'}</strong>
                {shippingAddress.addressline1 || shippingAddress.address || '-'}<br/>
                {shippingAddress.city || '-'}, {shippingAddress.state || '-'} {shippingAddress.pin || shippingAddress.zipCode || '-'}
              </div>
            </div>

            {(order.notes || giftWrapCharge > 0) && (
              <div className='lux-card mt-4'>
                <h4>Gift & Special Notes</h4>
                <ul style={{ fontSize: '14px', lineHeight: '1.8', color: '#334155', paddingLeft: '20px', marginBottom: 0 }}>
                  {giftWrapCharge > 0 && <li><strong>Premium Gift Wrap:</strong> Included</li>}
                  {order.notes && <li><strong>Notes:</strong> {order.notes}</li>}
                </ul>
              </div>
            )}
          </motion.div>
        </div>

        {recommended.length > 0 ? (
          <motion.section className='lux-card mt-4' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h4>You May Also Like</h4>
            <div className='lux-rec-scroll'>
              {recommended.map((p, i) => {
                const price = Number(p.finalprice || p.price || 0);
                const baseprice = Number(p.baseprice || price);
                const discount = p.discount ? Number(p.discount) : (baseprice > price ? Math.round(((baseprice - price) / baseprice) * 100) : 0);

                return (
                <div key={p._id || p.id || i} className='lux-rec-card'>
                  <div className='lux-rec-img'>
                    <img src={optimizeCloudinaryUrlAdvanced(p.pic1 || '/assets/images/noimage.png', { maxWidth: 420, crop: 'fill' })} alt={p.name || 'product'} />
                    {discount > 0 && <div className='lux-rec-ribbon'>✦ {discount}% OFF</div>}
                    <button
                      className='lux-rec-quick'
                      onClick={() => handleQuickAdd(p)}
                      disabled={quickAddingId === String(p._id || p.id)}
                    >
                      <Plus size={14} />
                      {quickAddedMap[String(p._id || p.id)] ? 'Added' : (quickAddingId === String(p._id || p.id) ? 'Adding...' : 'Quick Add')}
                    </button>
                  </div>
                  <div className='lux-rec-brand'>{p.brand || 'Boutique Luxe'}</div>
                  <div className='lux-rec-title'>{p.name || 'Product'}</div>
                  <div className='lux-rec-price-row'>
                    <span className='lux-rec-price'>{money(price)}</span>
                    {baseprice > price && <del className='lux-rec-baseprice'>{money(baseprice)}</del>}
                  </div>
                  <button className='lux-rec-view' onClick={() => navigate(`/single-product/${encodeURIComponent(p._id || p.id || '')}`)}>View Details</button>
                </div>
              )})}
            </div>
          </motion.section>
        ) : null}
      </div>

      <button className='lux-print-fab' onClick={handleDownloadInvoice} title='Download Invoice'>
        <Download size={17} />
      </button>

      <style>{styles}</style>
    </motion.div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Jost:wght@300;400;500;600;700;800&display=swap');
  
  .lux-confirm-page {
    font-family: 'Jost', sans-serif;
    background: #f8fafc;
    min-height: 100vh;
    padding-bottom: 80px;
    position: relative;
    overflow: hidden;
  }
  .lux-confirm-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fff;
  }
  .lux-loading-text { margin-top: 16px; font-family: 'Jost', sans-serif; font-weight: 700; color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; }

  /* Hero */
  .lux-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    border-radius: 22px;
    padding: 48px 32px;
    position: relative;
    overflow: hidden;
    text-align: center;
    border: 1px solid rgba(212, 175, 55, 0.2);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
    margin-bottom: 32px;
  }
  .lux-hero-dark {
    background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
  }
  .lux-hero-monogram {
    position: absolute; right: -20px; top: -30px; font-family: 'Playfair Display', serif; font-size: 150px; font-weight: 800; color: rgba(255,255,255,0.03); pointer-events: none; line-height: 1;
  }
  .lux-hero-badge {
    display: inline-block; padding: 8px 16px; border-radius: 999px; border: 1px solid #D4AF37; color: #D4AF37; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 24px; background: rgba(212, 175, 55, 0.1);
  }
  .lux-hero h1 {
    font-family: 'Playfair Display', serif; font-size: clamp(28px, 5vw, 48px); font-weight: 700; margin-bottom: 12px; color: #fff; line-height: 1.2;
  }
  .lux-hero-sub {
    font-size: 16px; color: #94a3b8; margin-bottom: 32px; font-weight: 400;
  }
  .lux-meta-grid {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 32px;
  }
  .lux-meta-pill {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #f8fafc; backdrop-filter: blur(8px);
  }
  .tone-success { border-color: rgba(16, 185, 129, 0.4); color: #34d399; background: rgba(16, 185, 129, 0.1); }
  .lux-action-bar {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
  }
  .lux-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 999px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.3s ease; cursor: pointer; border: none;
  }
  .lux-btn-primary { background: linear-gradient(135deg, #D4AF37, #b8860b); color: #0f172a; box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3); }
  .lux-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(212, 175, 55, 0.4); }
  .lux-btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; }
  .lux-btn-outline:hover { background: rgba(255,255,255,0.1); border-color: #D4AF37; color: #D4AF37; }
  
  .lux-card {
    background: #fff; border-radius: 24px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid rgba(212, 175, 55, 0.1); margin-bottom: 24px;
  }
  .lux-card h4 {
    font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;
  }
  .lux-count-pill {
    font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .lux-express-badge { 
    position: relative; overflow: hidden; background: linear-gradient(145deg, #111 0%, #2a2a2a 100%); 
    color: #D4AF37; border: 1px solid rgba(212, 175, 55, 0.4); padding: 5px 14px; border-radius: 999px; 
    font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; 
    display: inline-flex; align-items: center; gap: 6px; 
    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1); font-family: 'Jost', sans-serif; 
  }
  .lux-express-badge::after {
    content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
    transform: skewX(-20deg); animation: luxBadgeShine 3s infinite ease-in-out;
  }
  @keyframes luxBadgeShine { 0% { left: -150%; } 20% { left: 200%; } 100% { left: 200%; } }
  .lux-express-icon { display: inline-block; color: #fff; animation: luxExpressPulse 1.5s ease-in-out infinite; transform-origin: center; filter: drop-shadow(0 0 4px rgba(212,175,55,0.8)); }
  @keyframes luxExpressPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.25); }
  }
  .lux-standard-badge { background: #f8fafc; color: #475569; padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border: 1px solid #e2e8f0; font-family: 'Jost', sans-serif; }
  
  /* Items */
  .lux-item {
    display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 12px; transition: all 0.3s ease; background: #fafbfc;
  }
  .lux-item:hover { border-color: rgba(212, 175, 55, 0.3); background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.03); }
  .lux-item img { width: 96px; height: 96px; object-fit: cover; border-radius: 12px; border: 1px solid #e2e8f0; }
  .lux-item-details { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .lux-item-brand { font-size: 10px; font-weight: 800; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .lux-item-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.3; }
  .lux-item-meta { display: flex; align-items: center; font-size: 12px; color: #64748b; font-weight: 500; }
  .lux-item-price { font-size: 16px; font-weight: 800; color: #0f766e; }
  
  /* Summary */
  .lux-summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #475569; font-weight: 500; }
  .lux-summary-row strong { color: #0f172a; font-weight: 700; }
  .lux-summary-total { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 18px; color: #0f172a; font-weight: 800; }
  .lux-summary-total strong { color: #0f766e; font-size: 22px; }
  
  /* Timeline */
  .lux-timeline { display: flex; justify-content: space-between; position: relative; margin-top: 32px; margin-bottom: 16px; }
  .lux-timeline::before { content: ''; position: absolute; top: 16px; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 1; }
  .lux-timeline-progress { position: absolute; top: 16px; left: 0; height: 2px; background: linear-gradient(90deg, #D4AF37, #b8860b); z-index: 2; transition: width 1s ease-in-out; }
  .lux-timeline-step { display: flex; flex-direction: column; align-items: center; z-index: 3; position: relative; width: 33.33%; text-align: center; }
  .lux-timeline-icon { width: 34px; height: 34px; border-radius: 50%; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.3s; margin-bottom: 8px; }
  .lux-timeline-step.completed .lux-timeline-icon,
  .lux-timeline-step.current .lux-timeline-icon { border-color: #D4AF37; color: #D4AF37; box-shadow: 0 0 0 4px rgba(212,175,55,0.1); }
  .lux-timeline-step.completed .lux-timeline-icon { background: #D4AF37; color: #fff; }
  .lux-timeline-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .lux-timeline-meta { font-size: 11px; color: #64748b; font-weight: 500; }
  
  /* Assurance */
  .assurance-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: -16px;
    margin-bottom: 32px;
  }
  .lux-assurance-card { background: #fff; border-radius: 16px; padding: 20px; display: flex; align-items: flex-start; gap: 12px; border: 1px solid rgba(212,175,55,0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: transform 0.3s; }
  .lux-assurance-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.05); }
  .lux-assurance-card svg { color: #D4AF37; flex-shrink: 0; margin-top: 2px; }
  .lux-assurance-card h6 { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .lux-assurance-card p { font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; }
  
  /* Recommendations */
  .lux-rec-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; }
  .lux-rec-scroll::-webkit-scrollbar { height: 6px; }
  .lux-rec-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .lux-rec-card { min-width: 240px; background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 12px; transition: all 0.3s; }
  .lux-rec-card:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.06); border-color: rgba(212,175,55,0.3); }
  .lux-rec-img { position: relative; border-radius: 12px; overflow: hidden; margin-bottom: 12px; height: 240px; }
  .lux-rec-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
  .lux-rec-card:hover .lux-rec-img img { transform: scale(1.05); }
  .lux-rec-quick { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%) translateY(20px); opacity: 0; background: rgba(255,255,255,0.95); color: #0f172a; padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; border: none; display: flex; align-items: center; gap: 6px; transition: all 0.3s; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .lux-rec-card:hover .lux-rec-quick { transform: translateX(-50%) translateY(0); opacity: 1; }
  .lux-rec-quick:hover { background: #D4AF37; color: #fff; }
  .lux-rec-ribbon { position: absolute; top: 0; left: 0; background: linear-gradient(135deg, #111 0%, #2a2a2a 100%); color: #D4AF37; border-bottom: 1px solid rgba(201,168,76,0.4); font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 6px 14px 6px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 5; clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%); padding-right: 18px; }
  .lux-rec-brand { font-size: 10px; font-weight: 800; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lux-rec-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lux-rec-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
  .lux-rec-price { font-size: 15px; font-weight: 800; color: #D4AF37; margin-bottom: 0; }
  .lux-rec-baseprice { font-size: 12px; color: #94a3b8; text-decoration: line-through; }
  .lux-rec-view { width: 100%; background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; transition: all 0.3s; cursor: pointer; }
  .lux-rec-view:hover { background: #0f172a; color: #fff; border-color: #0f172a; }
  
  /* Floating Print */
  .lux-print-fab { position: fixed; bottom: 30px; right: 30px; width: 56px; height: 56px; border-radius: 50%; background: #fff; color: #0f172a; border: 1px solid rgba(212,175,55,0.3); box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; z-index: 50; }
  .lux-print-fab:hover { transform: translateY(-4px) rotate(5deg); box-shadow: 0 14px 30px rgba(212,175,55,0.25); background: #D4AF37; color: #fff; }

  @media (max-width: 991px) {
    .lux-assurance { grid-template-columns: 1fr; gap: 12px; }
  }
  @media (max-width: 767px) {
    .lux-hero { padding: 32px 20px; border-radius: 16px; }
    .lux-hero h1 { font-size: 28px; }
    .lux-action-bar { flex-direction: column; align-items: stretch; }
    .lux-btn { justify-content: center; }
    .lux-card { padding: 20px; border-radius: 16px; }
    .lux-item { flex-direction: column; align-items: flex-start; }
    .lux-item img { width: 100%; height: auto; aspect-ratio: 1; }
    .lux-timeline-title { font-size: 11px; }
    .lux-timeline-meta { font-size: 10px; }
    .lux-print-fab { display: none; }
  }
`;
