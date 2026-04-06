import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle2, Printer, Plus, ShieldCheck, RotateCcw, Headphones, Copy, RefreshCw, Share2, FileText, Radar, Sparkles } from 'lucide-react';
import { clearCart, getCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, FRONTEND_URL, SOCKET_TRANSPORTS } from '../constants';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import io from 'socket.io-client';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Confirmation() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const users = useSelector((state) => state.UserStateData || []);

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
  const syncInProgressRef = useRef(false);

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
    const { data } = await axios.get(
      `${BASE_URL}/api/order/${encodeURIComponent(orderId)}?userId=${encodeURIComponent(currentUserId)}`,
      { timeout: 15000 }
    );
    return data?.orderId ? data : null;
  }

  useEffect(() => {
    async function syncOrder() {
      const locationState = window.history.state?.usr;
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
        setOrder(fallbackOrder);
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

    dispatch(clearCart({ userid: userId }));
    axios.post(`${BASE_URL}${API_ENDPOINTS.CLEAR_CART}/${userId}`).catch(() => {});
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

  function handlePremiumInvoice() {
    if (!order) return;

    const items = Array.isArray(order.products) ? order.products : [];
    const invoiceDate = formatDate(order.createdAt || Date.now());
    const deliverBy = formatDate(order.estimatedArrival || Date.now() + 4 * 24 * 60 * 60 * 1000);
    const invoiceNo = `INV-${String(order.orderId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`;
    const subtotal = Number(order.totalAmount || 0);
    const shipping = Number(order.shippingAmount || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const finalAmount = Number(order.finalAmount || 0);
    const taxEstimate = Math.max(0, Math.round(subtotal * 0.05));
    const baseAmount = Math.max(0, subtotal - taxEstimate);

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
                <div class="row"><span>Taxable Value</span><strong>${money(baseAmount)}</strong></div>
                <div class="row"><span>GST (Est.)</span><strong>${money(taxEstimate)}</strong></div>
                <div class="row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
                <div class="row"><span>Shipping</span><strong>${shipping === 0 ? 'FREE' : money(shipping)}</strong></div>
                <div class="row"><span>Coupon Discount</span><strong>${couponDiscount > 0 ? '-' + money(couponDiscount) : money(0)}</strong></div>
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
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => {
      popup.print();
    }, 350);
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
        price: Number(product?.finalprice || product?.price || 0)
      };

      try {
        await axios.post(`${BASE_URL}${API_ENDPOINTS.CART}`, payload, { timeout: 12000 });
      } catch (primaryErr) {
        // Fallback keeps quick add working even when absolute API origin is blocked/transient.
        await axios.post(API_ENDPOINTS.CART, payload, { timeout: 12000 });
      }

      dispatch(getCart());

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

  if (loading || !order) {
    return (
      <div className='confirm-shell loading-shell'>
        <div className='loader-ring' />
        <p>Preparing your premium confirmation...</p>
        <style>{styles}</style>
      </div>
    );
  }

  const items = Array.isArray(order.products) ? order.products : [];
  const shippingAddress = order.shippingAddress || {};
  const paymentMethod = order.paymentMethod || 'UPI';
  const deliverySlot = order.deliverySlot || 'Evening 6 PM - 9 PM';
  const subtotal = Number(order.totalAmount || 0);
  const shipping = Number(order.shippingAmount || 0);
  const finalAmount = Number(order.finalAmount || 0);
  const couponDiscount = Number(order.couponDiscount || 0);

  const timeline = [
    { title: 'Order Review', meta: 'Now', icon: Package },
    { title: 'Packed', meta: 'Today', icon: Truck },
    { title: 'Delivered', meta: estimatedDate, icon: CheckCircle2 },
  ];

  const assurancePoints = [
    { icon: ShieldCheck, title: 'Secure Purchase', copy: 'Encrypted payment and verified fulfillment.' },
    { icon: RotateCcw, title: 'Easy Returns', copy: 'Hassle-free return support from your order panel.' },
    { icon: Headphones, title: 'Priority Support', copy: 'Fast help for delivery and tracking issues.' }
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
    <motion.div className='confirm-shell confirm-page-fade' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      <div className='confirm-bg-orb orb-a' />
      <div className='confirm-bg-orb orb-b' />

      <div className='container py-5'>
        <motion.section className={`hero-card elite-hero ${heroTheme === 'dark' ? 'hero-theme-dark' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className='hero-monogram'>E</span>
          <button className='hero-theme-toggle' onClick={() => setHeroTheme((prev) => prev === 'light' ? 'dark' : 'light')}>
            <Sparkles size={14} />
            <span>{heroTheme === 'light' ? 'Noir Mode' : 'Ivory Mode'}</span>
          </button>
          <div className='hero-check-wrap'>
            <svg className='hero-checkmark' viewBox='0 0 52 52' aria-hidden='true'>
              <circle className='check-circle' cx='26' cy='26' r='24' />
              <path className='check-path' d='M15 27 L23 35 L38 19' />
            </svg>
          </div>
          <div className='hero-badge'>ORDER CONFIRMED</div>
          <h1>Thank you for your order, {customerName}.</h1>
          <div className='hero-shimmer-line' />
          <p className='hero-subcopy'>Order ID: {order.orderId || 'N/A'} • Estimated delivery by {estimatedDate}</p>
          <div className='hero-meta'>
            <span className='hero-chip chip-payment'>Payment: {paymentMethod}</span>
            <span className='hero-chip chip-slot'>Slot: {deliverySlot}</span>
            <span className={`hero-chip chip-status ${statusTone}`}>Status: {order.orderStatus || order.status || 'Ordered'}</span>
          </div>
          <div className='hero-actions'>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className='hero-btn hero-btn-accent' onClick={() => navigate(`/order-tracking/${encodeURIComponent(order.orderId || '')}`)}>
              <Radar size={14} />
              <span>Track Live</span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className='hero-btn hero-btn-outline' onClick={handlePremiumInvoice}>
              <FileText size={14} />
              <span>View Tax Invoice</span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className='hero-btn' onClick={handleCopyOrderId}>
              <Copy size={14} />
              <span>{copied ? 'Copied' : 'Copy Order ID'}</span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className='hero-btn' onClick={handleRefreshStatus}>
              <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className='hero-btn' onClick={handleShareOrder}>
              <Share2 size={14} />
              <span>{shared ? 'Shared' : 'Share Order'}</span>
            </motion.button>
          </div>
          <div className='luxe-stat-grid'>
            <div className='luxe-stat-card'>
              <h5>Live Delivery Tracking</h5>
              <p>Auto-synced order status from backend with realtime progress updates.</p>
            </div>
            <div className='luxe-stat-card'>
              <h5>Easy Return Protection</h5>
              <p>Return support available for this order till {returnWindowUntil}.</p>
            </div>
            <div className='luxe-stat-card'>
              <h5>Invoice & Order Security</h5>
              <p>Tax invoice, verified checkout records, and priority support assistance.</p>
            </div>
          </div>
        </motion.section>

        <motion.section className='assurance-strip mt-3' initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          {assurancePoints.map((point) => (
            <div className='assurance-card' key={point.title}>
              <point.icon size={16} />
              <div>
                <h6>{point.title}</h6>
                <p>{point.copy}</p>
              </div>
            </div>
          ))}
        </motion.section>

        <div className='row mt-4 g-4'>
          <motion.div className='col-lg-7' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className='panel-card'>
              <div className='panel-title-row'>
                <h4>Items in this order</h4>
                <span className='count-pill'>{items.length} items</span>
              </div>

              <div className='items-wrap items-scrollable'>
                {items.map((item, idx) => {
                  const qty = Number(item.quantity ?? item.qty ?? 1);
                  const price = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0);
                  const lineTotal = Number(item.total ?? qty * price);
                  const pic = item.pic || item.product?.pic1 || '/assets/images/noimage.png';

                  return (
                    <div key={item._id || item.id || idx} className='order-item'>
                      <img src={optimizeCloudinaryUrlAdvanced(pic, { maxWidth: 240, crop: 'fill' })} alt='product' />
                      <div className='item-mid'>
                        <h6>{item.name || item.product?.name || 'Product'}</h6>
                        <div className='item-inline'>
                          <span className='qty-pill'>Qty {qty}</span>
                          <span className='sku-pill'>SKU {String(item._id || item.id || '').slice(0, 12)}...</span>
                        </div>
                        <small>₹{price} each</small>
                      </div>
                      <div className='item-price'>{money(lineTotal)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='panel-card mt-4'>
              <h4>Delivery Timeline</h4>
              <div className='progress-shell'>
                <div className='progress-track'>
                  <span className='progress-fill' style={{ width: `${timelineProgress}%` }} />
                </div>
                <small>{Math.round(timelineProgress)}% order journey completed</small>
              </div>
              <div className='timeline-wrap timeline-horizontal'>
                {timeline.map((step, i) => (
                  <div className={`timeline-row ${i <= currentStepIndex ? 'is-completed' : ''} ${i === currentStepIndex ? 'is-current' : ''}`} key={step.title}>
                    <div className='timeline-dot-wrap'>
                      <span className='timeline-dot'>
                        <step.icon size={13} />
                      </span>
                      {i !== timeline.length - 1 ? <span className='timeline-line' /> : null}
                    </div>
                    <div className='timeline-content'>
                      <strong>{step.title}</strong>
                      <small>{step.meta}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='panel-card mt-4'>
              <h4>Need Help?</h4>
              <div className='help-grid'>
                <button className='help-chip' onClick={() => navigate('/contact')}>Contact Support</button>
                <button className='help-chip' onClick={() => navigate('/my-orders')}>Manage Orders</button>
                <button className='help-chip' onClick={() => navigate('/profile')}>Delivery Preferences</button>
              </div>
            </div>
          </motion.div>

          <motion.div className='col-lg-5' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className='panel-card sticky-side'>
              <h4>Payment & Shipping Summary</h4>

              <div className='price-box'>
                <div className='price-row'><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div className='price-row'><span>Shipping</span><strong>{shipping === 0 ? 'FREE' : money(shipping)}</strong></div>
                {couponDiscount > 0 ? <div className='price-row text-success'><span>Coupon Discount</span><strong>-{money(couponDiscount)}</strong></div> : null}
                <hr />
                <div className='price-total'><span>Payable Amount</span><strong>{money(finalAmount)}</strong></div>
              </div>

              <div className='address-box'>
                <p className='label'>Shipping Address</p>
                <h6>{shippingAddress.fullName || '-'}</h6>
                <p>{shippingAddress.addressline1 || shippingAddress.address || '-'}</p>
                <p>{shippingAddress.city || '-'}, {shippingAddress.state || '-'} {shippingAddress.pin || shippingAddress.zipCode || '-'}</p>
              </div>

              <div className='delivery-guarantee'>
                <p className='label'>Delivery Guarantee</p>
                <h6>On-time Delivery Promise</h6>
                <p>If your delivery is delayed, our support team prioritizes immediate resolution.</p>
              </div>

              <div className='action-grid'>
                <button className='btn-premium btn-luxe-solid' onClick={() => navigate('/my-orders')}>Track Order</button>
                <button className='btn-secondary-premium' onClick={() => navigate('/shop/all')}>Continue Shopping</button>
              </div>

              <div className='concierge-box'>
                <p className='concierge-title'>Luxury Concierge</p>
                <p className='concierge-copy'>Need priority support? Our team is ready with real-time delivery help.</p>
                <button className='concierge-btn' onClick={() => navigate('/contact')}>Contact Concierge</button>
              </div>
            </div>
          </motion.div>
        </div>

        {recommended.length > 0 ? (
          <motion.section className='panel-card mt-4' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className='panel-title-row'>
              <h4>You May Also Like</h4>
              <span className='count-pill'>{recommended.length} picks</span>
            </div>
            <div className='rec-grid rec-scroll'>
              {recommended.map((p, i) => (
                <div key={p._id || p.id || i} className='rec-card'>
                  <div className='rec-media'>
                    <img src={optimizeCloudinaryUrlAdvanced(p.pic1 || '/assets/images/noimage.png', { maxWidth: 420, crop: 'fill' })} alt={p.name || 'product'} />
                    <button
                      className='rec-quick-add'
                      onClick={() => handleQuickAdd(p)}
                      disabled={quickAddingId === String(p._id || p.id)}
                    >
                      <Plus size={14} />
                      <span>
                        {quickAddedMap[String(p._id || p.id)]
                          ? 'Added'
                          : (quickAddingId === String(p._id || p.id) ? 'Adding...' : 'Quick Add')}
                      </span>
                    </button>
                  </div>
                  <h6>{p.name || 'Product'}</h6>
                  <p>{money(p.finalprice || p.price || 0)}</p>
                  <button onClick={() => navigate(`/single-product/${encodeURIComponent(p._id || p.id || '')}`)}>View</button>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}
      </div>

      <button className='floating-print' onClick={handlePremiumInvoice} title='Print Receipt'>
        <Printer size={17} />
      </button>

      <style>{styles}</style>
    </motion.div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=Bodoni+Moda:wght@500;600;700&display=swap');
  .confirm-shell {
    font-family: 'Manrope', sans-serif;
    min-height: 100vh;
    background:
      radial-gradient(circle at 12% 4%, rgba(212, 175, 55, 0.16), transparent 26%),
      radial-gradient(circle at 0% 0%, rgba(186, 230, 253, 0.35), transparent 30%),
      radial-gradient(circle at 100% 0%, rgba(253, 230, 138, 0.25), transparent 28%),
      linear-gradient(180deg, #f5f7fb 0%, #ecf1f6 100%);
    position: relative;
    overflow: hidden;
  }
  .confirm-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.08;
    background-image:
      linear-gradient(45deg, rgba(15,23,42,0.06) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(15,23,42,0.06) 25%, transparent 25%);
    background-size: 26px 26px;
    mask-image: linear-gradient(to bottom, black 0%, transparent 52%);
  }
  .confirm-page-fade {
    animation: pageFade 0.55s ease;
  }
  @keyframes pageFade {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .loading-shell {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
  }
  .loader-ring {
    width: 44px;
    height: 44px;
    border: 4px solid #bfdbfe;
    border-top-color: #0284c7;
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .confirm-bg-orb {
    position: absolute;
    width: 280px;
    height: 280px;
    border-radius: 999px;
    filter: blur(70px);
    opacity: 0.45;
    pointer-events: none;
  }
  .orb-a { background: #67e8f9; top: -60px; left: -60px; }
  .orb-b { background: #fde68a; top: 40px; right: -90px; }

  .hero-card {
    background:
      radial-gradient(circle at 92% 6%, rgba(212, 175, 55, 0.16), transparent 24%),
      linear-gradient(145deg, #fffdf7, #ffffff);
    color: #111827;
    border-radius: 22px;
    padding: 28px;
    border: 1px solid #ebdfc0;
    box-shadow: 0 20px 36px rgba(15, 23, 42, 0.1);
    position: relative;
    overflow: hidden;
    text-align: center;
  }
  .hero-theme-toggle {
    position: absolute;
    right: 16px;
    top: 16px;
    border: 1px solid #e3d5ad;
    background: rgba(255, 255, 255, 0.78);
    color: #7a5d17;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    padding: 6px 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    z-index: 2;
  }
  .hero-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255,255,255,0.65), rgba(255,255,255,0) 45%);
    pointer-events: none;
  }
  .hero-monogram {
    position: absolute;
    right: 18px;
    top: 14px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 60px;
    color: rgba(212, 175, 55, 0.16);
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
  }
  .hero-check-wrap {
    margin-bottom: 34px;
    display: inline-flex;
    border-radius: 999px;
    animation: greenPulse 2.4s ease-in-out infinite;
  }
  .hero-checkmark {
    width: 52px;
    height: 52px;
  }
  .check-circle {
    fill: none;
    stroke: rgba(34, 197, 94, 0.25);
    stroke-width: 1.4;
  }
  .check-path {
    fill: none;
    stroke: #16a34a;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: drawCheck 0.65s ease forwards;
  }
  @keyframes drawCheck { to { stroke-dashoffset: 0; } }
  @keyframes greenPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.15); }
    50% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #dcc27e;
    color: #7a5d17;
    border-radius: 999px;
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.12em;
    margin-bottom: 16px;
    background: rgba(255, 247, 224, 0.9);
    text-transform: uppercase;
    box-shadow: 0 8px 18px rgba(212, 175, 55, 0.16);
  }
  .hero-card h1 {
    font-family: 'Bodoni Moda', 'Cormorant Garamond', serif;
    font-size: clamp(1.95rem, 4.2vw, 3.15rem);
    font-weight: 600;
    margin-bottom: 10px;
    letter-spacing: -0.3px;
    color: #16181d;
    line-height: 1.15;
    text-wrap: balance;
  }
  .hero-subcopy {
    color: #334155;
    margin-bottom: 12px;
    font-size: 1.16rem;
    font-weight: 800;
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(239, 246, 255, 0.95), rgba(255, 247, 224, 0.95));
    border: 1px solid #dbe4ef;
    box-shadow: 0 6px 14px rgba(51, 65, 85, 0.08);
  }
  .hero-shimmer-line {
    width: min(340px, 78%);
    height: 1px;
    margin: 10px auto 12px;
    background: linear-gradient(90deg, rgba(212, 175, 55, 0), rgba(212, 175, 55, 0.88), rgba(212, 175, 55, 0));
    animation: shimmerSlide 2.8s ease-in-out infinite;
  }
  @keyframes shimmerSlide {
    0%, 100% { opacity: 0.45; transform: translateX(0); }
    50% { opacity: 1; transform: translateX(8px); }
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .hero-chip {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #d5e0ee;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 800;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  }
  .chip-payment {
    color: #0f172a;
    border-color: #cfd9e8;
  }
  .chip-slot {
    color: #1f2937;
    border-color: #c3d3e5;
  }
  .chip-status {
    border-width: 1.5px;
    background: #fffef8;
    color: #8b6f1a;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 14px;
    justify-content: center;
  }
  .hero-btn {
    border: 1px solid #cfd9e8;
    background: #ffffff;
    color: #1f2937;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 800;
    transition: all 0.25s ease;
    box-shadow: 0 3px 10px rgba(148, 163, 184, 0.12);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .hero-btn:hover {
    transform: translateY(-2px);
    border-color: #9fb8dd;
    box-shadow: 0 10px 20px rgba(30, 64, 175, 0.16);
  }
  .hero-btn-accent {
    background: linear-gradient(90deg, #111827, #0b0f17);
    color: #f8fafc;
    border-color: #111827;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.28);
  }
  .hero-btn-outline {
    border-color: #d4af37;
    background: linear-gradient(90deg, #fffdf7, #fff6dd);
    color: #7a5d17;
    font-weight: 800;
  }
  .spin-icon { animation: spin 0.8s linear infinite; }
  .hero-btn-outline:hover {
    border-color: #c9a84c;
    box-shadow: 0 10px 18px rgba(212, 175, 55, 0.2);
  }
  .hero-btn-accent:hover {
    border-color: #020617;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.28);
  }
  .luxe-stat-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .hero-theme-dark {
    background:
      radial-gradient(circle at 90% 6%, rgba(212, 175, 55, 0.18), transparent 24%),
      linear-gradient(145deg, #0f172a, #111827 48%, #0b1220);
    border-color: rgba(212, 175, 55, 0.34);
    box-shadow: 0 20px 36px rgba(2, 6, 23, 0.45);
    color: #e2e8f0;
  }
  .hero-theme-dark .hero-badge {
    background: rgba(212, 175, 55, 0.1);
    border-color: rgba(212, 175, 55, 0.45);
    color: #f8df9d;
  }
  .hero-theme-dark h1,
  .hero-theme-dark .hero-subcopy,
  .hero-theme-dark .luxe-stat-card h5 {
    color: #f8fafc;
  }
  .hero-theme-dark .hero-subcopy,
  .hero-theme-dark .luxe-stat-card p {
    color: #cbd5e1;
  }
  .hero-theme-dark .hero-subcopy {
    background: linear-gradient(90deg, rgba(30, 41, 59, 0.92), rgba(51, 65, 85, 0.82));
    border-color: rgba(100, 116, 139, 0.6);
    box-shadow: 0 8px 18px rgba(2, 6, 23, 0.34);
  }
  .hero-theme-dark .hero-chip {
    background: rgba(15, 23, 42, 0.55);
    border-color: rgba(148, 163, 184, 0.35);
    color: #e2e8f0;
  }
  .hero-theme-dark .chip-status {
    background: rgba(212, 175, 55, 0.12);
    color: #f8df9d;
  }
  .hero-theme-dark .hero-btn {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(148, 163, 184, 0.35);
    color: #f8fafc;
  }
  .hero-theme-dark .hero-btn-accent {
    background: linear-gradient(90deg, #d4af37, #b8860b);
    border-color: #d4af37;
    color: #111827;
  }
  .hero-theme-dark .hero-btn-outline {
    background: rgba(212, 175, 55, 0.12);
    color: #f8df9d;
  }
  .hero-theme-dark .hero-theme-toggle {
    background: rgba(15, 23, 42, 0.72);
    border-color: rgba(212, 175, 55, 0.45);
    color: #f8df9d;
  }
  .hero-theme-dark .luxe-stat-card {
    border-color: rgba(148, 163, 184, 0.28);
    background: rgba(15, 23, 42, 0.45);
    box-shadow: 0 10px 18px rgba(2, 6, 23, 0.3);
  }
  .luxe-stat-card {
    border: 1px solid #dfe7f2;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.9);
    padding: 11px 12px;
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
    text-align: left;
  }
  .luxe-stat-card h5 {
    margin: 0 0 5px;
    color: #0f172a;
    font-size: 0.96rem;
    font-weight: 900;
    letter-spacing: 0.01em;
  }
  .luxe-stat-card p {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
  }
  .tone-success { border-color: #86efac !important; color: #15803d; background: #f0fdf4; }
  .tone-info { border-color: #7dd3fc !important; color: #0369a1; background: #f0f9ff; }
  .tone-danger { border-color: #fca5a5 !important; color: #b91c1c; background: #fef2f2; }
  .tone-warn { border-color: #fde68a !important; color: #a16207; background: #fffbeb; }

  .panel-card {
    border: 1px solid #dbe4ef;
    border-radius: 16px;
    background: linear-gradient(145deg, #ffffff, #f8fbff);
    box-shadow: 0 14px 24px rgba(15, 23, 42, 0.07);
    padding: 16px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .assurance-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .assurance-card {
    border: 1px solid #dbe4ef;
    border-radius: 14px;
    background: linear-gradient(135deg, #ffffff, #f8fbff);
    padding: 10px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #0f172a;
  }
  .assurance-card svg {
    color: #0f766e;
    margin-top: 2px;
    flex-shrink: 0;
  }
  .assurance-card h6 {
    margin: 0 0 2px;
    font-size: 0.85rem;
    font-weight: 800;
  }
  .assurance-card p {
    margin: 0;
    font-size: 12px;
    color: #64748b;
  }
  .panel-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 30px rgba(15, 23, 42, 0.1);
  }
  .panel-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .panel-card h4 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 900;
    color: #0f172a;
  }
  .count-pill {
    border-radius: 999px;
    background: #0ea5b7;
    color: #fff;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .items-wrap { display: grid; gap: 10px; }
  .items-scrollable {
    max-height: 420px;
    overflow-y: auto;
    padding-right: 6px;
  }
  .items-scrollable::-webkit-scrollbar { width: 7px; }
  .items-scrollable::-webkit-scrollbar-thumb { background: #d1dae6; border-radius: 999px; }
  .order-item {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 10px;
    align-items: center;
    border: 1px solid #edf2f7;
    border-radius: 12px;
    padding: 10px;
    background: #fff;
  }
  .order-item img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 10px;
  }
  .item-mid h6 {
    margin-bottom: 4px;
    font-size: 1rem;
    font-weight: 800;
    color: #1e293b;
  }
  .item-inline {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .qty-pill {
    border-radius: 999px;
    background: linear-gradient(90deg, #0ea5b7, #0284c7);
    color: #fff;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 800;
  }
  .sku-pill {
    border-radius: 999px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    color: #334155;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 700;
  }
  .item-mid small { color: #64748b; }
  .item-price {
    color: #0284c7;
    font-weight: 900;
    font-size: 1.2rem;
  }

  .timeline-wrap {
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: #f8fafc;
    padding: 10px;
    margin-top: 10px;
  }
  .progress-shell {
    margin-top: 10px;
    margin-bottom: 12px;
  }
  .progress-track {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
  }
  .progress-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #16a34a, #22c55e);
    border-radius: 999px;
    transition: width 0.35s ease;
  }
  .progress-shell small {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: #64748b;
    font-weight: 700;
  }
  .timeline-horizontal {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    align-items: start;
  }
  .timeline-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
    margin-bottom: 0;
    position: relative;
    padding-top: 4px;
  }
  .timeline-dot-wrap {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
  }
  .timeline-dot {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #94a3b8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 0;
  }
  .timeline-line {
    position: absolute;
    top: 13px;
    left: calc(50% + 16px);
    height: 1.5px;
    width: calc(100% - 26px);
    background: #dbe4ef;
  }
  .timeline-row.is-completed .timeline-dot,
  .timeline-row.is-current .timeline-dot {
    border-color: #16a34a;
    color: #16a34a;
    background: #f0fdf4;
  }
  .timeline-row.is-completed .timeline-line {
    background: #86efac;
  }
  .timeline-content strong {
    display: block;
    font-size: 13px;
    color: #0f172a;
    font-weight: 800;
  }
  .timeline-content small { color: #64748b; font-size: 12px; }

  .sticky-side { position: sticky; top: 20px; }
  .price-box {
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: linear-gradient(130deg, #f8fafc, #f1f5f9);
    padding: 12px;
    margin-bottom: 12px;
  }
  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    color: #334155;
  }
  .price-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.1rem;
    font-weight: 900;
    color: #0f172a;
  }
  .price-total strong {
    color: #0284c7;
    font-size: 1.4rem;
  }

  .address-box {
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    margin-bottom: 12px;
  }
  .delivery-guarantee {
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: linear-gradient(140deg, #f8fafc, #f1f5f9);
    padding: 12px;
    margin-bottom: 12px;
  }
  .delivery-guarantee h6 {
    margin-bottom: 4px;
    color: #0f172a;
    font-weight: 800;
  }
  .delivery-guarantee p {
    margin-bottom: 0;
    color: #475569;
    font-size: 0.9rem;
  }
  .address-box .label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .address-box h6 {
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .address-box p {
    color: #475569;
    margin-bottom: 4px;
    font-size: 0.93rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .help-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }
  .help-chip {
    border: 1px solid #dbe4ef;
    border-radius: 999px;
    background: #fff;
    color: #1e293b;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 800;
  }
  .rec-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .rec-scroll::-webkit-scrollbar { height: 7px; }
  .rec-scroll::-webkit-scrollbar-thumb { background: #d4dbe4; border-radius: 999px; }
  .rec-card {
    min-width: 290px;
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    text-align: center;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .rec-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 24px rgba(15, 23, 42, 0.12);
  }
  .rec-media {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 10px;
  }
  .rec-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }
  .rec-quick-add {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%) translateY(8px);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.9);
    color: #fff;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: all 0.25s ease;
  }
  .rec-media:hover .rec-quick-add {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .rec-card h6 {
    margin-bottom: 4px;
    font-size: 0.9rem;
    font-weight: 800;
    color: #0f172a;
  }
  .rec-card p {
    margin-bottom: 8px;
    color: #0284c7;
    font-weight: 800;
  }
  .rec-card button {
    border: 1px solid #bfdbfe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1e3a8a;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 800;
  }
  .btn-premium {
    border: none;
    border-radius: 999px;
    background: linear-gradient(90deg, #0ea5b7, #0284c7);
    color: #fff;
    padding: 10px 12px;
    font-weight: 800;
    font-size: 0.92rem;
  }
  .btn-luxe-solid {
    background: linear-gradient(90deg, #111827, #0b0f17);
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.22);
  }
  .btn-secondary-premium {
    border: 1px solid #94a3b8;
    border-radius: 999px;
    background: transparent;
    color: #1e293b;
    padding: 10px 12px;
    font-weight: 800;
    font-size: 0.92rem;
  }
  .concierge-box {
    margin-top: 12px;
    border: 1px solid #e7edf4;
    border-radius: 12px;
    background: linear-gradient(135deg, #ffffff, #f8fafc);
    padding: 11px;
  }
  .concierge-title {
    margin: 0 0 4px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #0e7490;
    font-weight: 800;
  }
  .concierge-copy {
    margin: 0 0 8px;
    color: #475569;
    font-size: 12px;
    line-height: 1.5;
  }
  .concierge-btn {
    border: 1px solid #bae6fd;
    background: #ecfeff;
    color: #0e7490;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    padding: 6px 11px;
  }
  .floating-print {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
  }
  .floating-print:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(15, 23, 42, 0.25);
  }

  @media (max-width: 991.98px) {
    .sticky-side { position: static; }
  }
  @media (max-width: 767.98px) {
    .hero-card { padding: 18px; border-radius: 18px; }
    .hero-check-wrap { margin-bottom: 22px; }
    .hero-badge {
      margin-bottom: 12px;
      font-size: 12px;
      padding: 7px 14px;
    }
    .hero-card h1 { font-size: 1.7rem; }
    .hero-subcopy {
      font-size: 0.98rem;
      padding: 5px 10px;
      border-radius: 12px;
    }
    .luxe-stat-grid { grid-template-columns: 1fr; }
    .order-item { grid-template-columns: 56px 1fr; }
    .order-item img { width: 56px; height: 56px; }
    .item-price { grid-column: span 2; text-align: right; }
    .action-grid { grid-template-columns: 1fr; }
    .help-grid { grid-template-columns: 1fr; }
    .timeline-horizontal { grid-template-columns: 1fr; }
    .timeline-line { display: none; }
    .hero-actions { flex-direction: column; align-items: stretch; }
    .assurance-strip { grid-template-columns: 1fr; }
    .luxe-stat-grid { grid-template-columns: 1fr; }
    .rec-quick-add { opacity: 1; transform: translateX(-50%) translateY(0); }
    .floating-print { display: none; }
  }
`;
