import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Package, User, Mail, CreditCard, MapPin, Calendar, ShoppingBag, Clock, AlertCircle, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './OrderDetailsDrawer.css';
import { BASE_URL } from '../../constants';

// Helper functions to format dates safely
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN');
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN');
};

const formatAmount = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const resolveProductImageSrc = (product = {}) => {
  const candidates = [
    product?.image,
    product?.pic,
    product?.pic1,
    product?.pic2,
    product?.thumbnail,
    product?.imageUrl,
    product?.image_url,
    product?.product?.image,
    product?.product?.pic,
    product?.product?.pic1,
    product?.productid?.image,
    product?.productid?.pic,
    product?.productid?.pic1
  ];

  const raw = candidates.find((item) => typeof item === 'string' && item.trim().length > 0);
  if (!raw) return '';

  const clean = String(raw).trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(clean) || clean.startsWith('data:image/')) return clean;

  // Supports values like: "productimages/file.jpg", "/productimages/file.jpg", "uploads/..."
  const normalizedPath = clean.startsWith('/') ? clean : `/${clean}`;
  if (normalizedPath.startsWith('/productimages/') || normalizedPath.startsWith('/uploads/')) {
    return `${BASE_URL}${normalizedPath}`;
  }

  return `${BASE_URL}/productimages/${clean.replace(/^\/+/, '')}`;
};

const normalizeProductRow = (product = {}, index = 0) => {
  const name = product?.name || product?.productName || product?.title || product?.productid?.name || `Product ${index + 1}`;
  const description = product?.description || product?.productid?.description || '';

  const quantityVal = Number(product?.quantity || product?.qty || product?.count || 1);
  const quantity = Number.isFinite(quantityVal) && quantityVal > 0 ? quantityVal : 1;

  const priceVal = Number(
    product?.price ||
    product?.finalprice ||
    product?.salePrice ||
    product?.baseprice ||
    product?.productid?.finalprice ||
    product?.productid?.baseprice ||
    0
  );
  const unitPrice = Number.isFinite(priceVal) ? priceVal : 0;

  const lineTotalVal = Number(product?.totalPrice || product?.total || unitPrice * quantity);
  const lineTotal = Number.isFinite(lineTotalVal) ? lineTotalVal : unitPrice * quantity;

  const imageSrc = resolveProductImageSrc(product);

  return {
    id: String(product?._id || product?.id || product?.productid?._id || index),
    name,
    description,
    quantity,
    unitPrice,
    lineTotal,
    imageSrc
  };
};

// Helper function to get date from order with multiple field name attempts
const getOrderDate = (order, type = 'created') => {
    if (!order) return null;

    const possibleFields = type === 'created'
        ? ['createdAt', 'created_at', 'dateCreated', 'date_created', 'orderDate', 'order_date', 'timestamp']
        : ['updatedAt', 'updated_at', 'dateUpdated', 'date_updated', 'lastModified', 'last_modified'];

    for (const field of possibleFields) {
        if (order[field]) {
            return order[field];
        }
    }

    return null;
};

export default function OrderDetailsDrawer({ open, onClose, order, onOrderRemoved }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullOrderData, setFullOrderData] = useState(null);
  const isAdmin = localStorage.getItem('role')?.toLowerCase() === 'admin';
  const [copied, setCopied] = useState(false);

  const productRows = useMemo(
    () => (Array.isArray(fullOrderData?.products) ? fullOrderData.products : []).map((p, i) => normalizeProductRow(p, i)),
    [fullOrderData?.products]
  );

  const paymentSummary = useMemo(() => {
    const computedSubtotal = productRows.reduce((sum, p) => sum + Number(p.lineTotal || 0), 0);
    const subtotal = toNumber(fullOrderData?.totalAmount ?? computedSubtotal);
    const shipping = toNumber(fullOrderData?.shippingAmount || 0);
    const gstAmount = Math.max(0, toNumber(fullOrderData?.gstAmount || 0));
    const discountAmount = Math.max(0, toNumber(fullOrderData?.discountAmount || 0));
    const couponDiscount = Math.max(0, toNumber(fullOrderData?.couponDiscount || 0));
    const giftWrapCharge = Math.max(0, toNumber(fullOrderData?.giftWrapCharge || 0));
    const protectionCharge = Math.max(0, toNumber(fullOrderData?.protectionCharge || 0));
    const ecoCharge = Math.max(0, toNumber(fullOrderData?.ecoCharge || 0));
    const paymentFee = Math.max(0, toNumber(fullOrderData?.paymentFee || 0));
    const segmentedCharges = giftWrapCharge + protectionCharge + ecoCharge + paymentFee;
    const rawExtraCharges = Math.max(0, toNumber(fullOrderData?.extraCharges || 0));
    const otherCharges = rawExtraCharges > 0
      ? Math.max(0, segmentedCharges > 0 && rawExtraCharges >= segmentedCharges ? rawExtraCharges - segmentedCharges : rawExtraCharges)
      : 0;
    const preDiscountRaw = Math.max(0, toNumber(fullOrderData?.preDiscountTotal || 0));
    const preDiscountTotal = preDiscountRaw > 0 ? preDiscountRaw : Math.max(0, subtotal + discountAmount + couponDiscount);
    const finalAmount = toNumber(fullOrderData?.finalAmount ?? (subtotal + shipping + gstAmount + segmentedCharges + otherCharges - discountAmount - couponDiscount));
    const couponCode = String(fullOrderData?.couponCode || '').trim();
    const itemCount = productRows.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

    return {
      preDiscountTotal,
      subtotal,
      shipping,
      gstAmount,
      discountAmount,
      couponCode,
      couponDiscount,
      giftWrapCharge,
      protectionCharge,
      ecoCharge,
      paymentFee,
      otherCharges,
      finalAmount,
      itemCount
    };
  }, [
    fullOrderData?.totalAmount,
    fullOrderData?.shippingAmount,
    fullOrderData?.gstAmount,
    fullOrderData?.discountAmount,
    fullOrderData?.couponCode,
    fullOrderData?.couponDiscount,
    fullOrderData?.giftWrapCharge,
    fullOrderData?.protectionCharge,
    fullOrderData?.ecoCharge,
    fullOrderData?.paymentFee,
    fullOrderData?.extraCharges,
    fullOrderData?.preDiscountTotal,
    fullOrderData?.finalAmount,
    productRows
  ]);

  const resolveOrderPayload = (data) => {
    if (!data) return null;
    if (data.order && typeof data.order === 'object') return data.order;
    if (data.success && (data.orderId || data.userName || data.userEmail || data.shippingAddress || data.products)) return data;
    return null;
  };

  const handleCopyOrderId = () => {
    if (fullOrderData?.orderId || order?.orderId) {
      const id = fullOrderData?.orderId || order?.orderId;
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // Fetch full order details from backend when drawer opens
  const fetchFullOrderDetails = async () => {
    if (!open || !order?.orderId) return;
    
    setLoading(true);
    try {
      const adminSecret = process.env.REACT_APP_ADMIN_SECRET;
      const response = await axios.get(`${BASE_URL}/api/admin/order/${order.orderId}`, {
        headers: adminSecret ? { 'x-admin-secret': adminSecret } : {}
      });

      const payload = resolveOrderPayload(response.data);
      if (payload) {
        setFullOrderData(payload);
      } else {
        // Fallback to original order if API doesn't return full data
        setFullOrderData(order);
      }
    } catch (error) {
      console.error('Failed to fetch full order details:', error);
      // Fallback to original order data
      setFullOrderData(order);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && order?.orderId) {
      fetchFullOrderDetails();
      if (isAdmin) {
        fetchNotes();
      }
    } else {
      setNotes([]);
      setFullOrderData(null);
    }
    // eslint-disable-next-line
  }, [open, order?.orderId]);

  const fetchNotes = async () => {
    if (!order?.orderId) return;
    setNotesLoading(true);
    try {
      const adminSecret = process.env.REACT_APP_ADMIN_SECRET;
      const res = await fetch(`${BASE_URL}/api/admin/order/${order.orderId}/notes`, {
        headers: adminSecret ? { 'x-admin-secret': adminSecret } : {}
      });
      const data = await res.json();
      if (data.success) setNotes(data.notes);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    }
    setNotesLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !order?.orderId) return;
    setSaving(true);
    try {
      const adminSecret = process.env.REACT_APP_ADMIN_SECRET;
      const res = await fetch(`${BASE_URL}/api/admin/order/${order.orderId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSecret ? { 'x-admin-secret': adminSecret } : {})
        },
        body: JSON.stringify({ note: newNote, author: localStorage.getItem('name') || 'Admin' })
      });
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
        setNewNote('');
      }
    } catch (e) {}
    setSaving(false);
  };

  return (
    <AnimatePresence>
        {open && (
            <motion.div key="lux-drawer-root" className="lux-drawer-root">
                <motion.div 
                    className="lux-drawer-backdrop" 
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
                <motion.div 
                    className="lux-drawer-panel"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                    role="dialog"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="lux-drawer-header">
                        <div>
                            <div className="lux-drawer-eyebrow"><Package size={14} className="mr-1"/> Dispatch Center</div>
                            <h2 className="lux-drawer-title">Order <span>#{String(fullOrderData?.orderId || order?.orderId || 'N/A').slice(-8)}</span></h2>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <button onClick={handleCopyOrderId} title="Copy Order ID" className="lux-btn-ghost-light d-none d-sm-inline-flex">
                                {copied ? <CheckCircle2 size={14} className="mr-1 text-success"/> : <Copy size={14} className="mr-1" />} ID
                            </button>
                            <button className="lux-drawer-close" onClick={onClose}><X size={20} /></button>
                        </div>
                    </div>

                    <div className="lux-drawer-body">
                        {loading ? (
                            <div className="text-center py-5 text-muted">
                                <Clock size={24} className="spin mb-3 mx-auto" />
                                <p className="font-weight-bold">Loading secure order data...</p>
                            </div>
                        ) : !fullOrderData ? (
                            <div className="text-center py-5 text-muted">
                                <AlertCircle size={36} className="text-danger mb-3 mx-auto" />
                                <h5 className="font-weight-bold text-dark">Data Unavailable</h5>
                                <p className="mb-0">Secure order details could not be retrieved.</p>
                            </div>
                        ) : (
                            <>
                                {/* Top Info Grid */}
                                <div className="row mb-4 g-3">
                                    <div className="col-12">
                                        <div className="lux-info-box">
                                            <div className="lux-info-header">
                                                <div className="lux-info-icon"><User size={18} /></div>
                                                <span className="lux-info-label">Customer Profile</span>
                                            </div>
                                            <div className="lux-info-content mt-2">
                                                <strong className="lux-info-value">{fullOrderData.userName || fullOrderData.shippingAddress?.fullName || 'N/A'}</strong>
                                                <span className="lux-info-sub">{fullOrderData.userEmail || fullOrderData.email || 'N/A'}</span>
                                                {(fullOrderData.userPhone || fullOrderData.phone || fullOrderData.shippingAddress?.phone) && (
                                                    <span className="lux-info-sub">{fullOrderData.userPhone || fullOrderData.phone || fullOrderData.shippingAddress?.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="lux-info-box">
                                            <div className="lux-info-header">
                                                <div className="lux-info-icon"><MapPin size={18} /></div>
                                                <span className="lux-info-label">Fulfillment Address</span>
                                            </div>
                                            <div className="lux-info-content mt-2">
                                                <strong className="lux-info-value d-block" style={{fontSize: '14px', lineHeight: 1.5, whiteSpace: 'normal', color: '#334155'}}>
                                                    {fullOrderData.shippingAddress?.fullName && <>{fullOrderData.shippingAddress.fullName}<br/></>}
                                                    {fullOrderData.shippingAddress?.addressline1 || fullOrderData.shippingAddress?.address || 'N/A'}<br/>
                                                    {fullOrderData.shippingAddress?.city}, {fullOrderData.shippingAddress?.state} - {fullOrderData.shippingAddress?.pin}<br/>
                                                    {fullOrderData.shippingAddress?.country}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Info Grid */}
                                <div className="row mb-4 g-3">
                                    <div className="col-6">
                                        <div className="lux-info-box h-100 flex-column align-items-start">
                                            <div className="lux-info-icon mb-2"><Clock size={16} /></div>
                                            <div className="lux-info-content">
                                                <span className="lux-info-label">Timeline</span>
                                                <span className="lux-info-sub mt-1">Placed: <strong>{formatDate(getOrderDate(fullOrderData, 'created'))}</strong></span>
                                                <span className="lux-info-sub">Updated: <strong>{formatDate(getOrderDate(fullOrderData, 'updated'))}</strong></span>
                                                <div className="mt-2">
                                                    <span className="lux-badge">{fullOrderData.orderStatus || fullOrderData.orderstatus || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="lux-info-box h-100 flex-column align-items-start">
                                            <div className="lux-info-icon mb-2"><CreditCard size={16} /></div>
                                            <div className="lux-info-content">
                                                <span className="lux-info-label">Transaction</span>
                                                <span className="lux-info-sub mt-1">Method: <strong>{fullOrderData.paymentMethod || 'N/A'}</strong></span>
                                                <span className="lux-info-sub">Status: <strong>{fullOrderData.paymentStatus || 'N/A'}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="lux-drawer-section">
                                    <h4 className="lux-section-title"><ShoppingBag size={16} className="mr-2" /> Manifest <span className="lux-pill-count">{paymentSummary.itemCount || productRows.length} items</span></h4>
                                    <div className="lux-items-list">
                                        {productRows.map((product) => (
                                            <div key={product.id} className="lux-item-row">
                                                {product.imageSrc ? (
                                                    <img src={product.imageSrc} alt={product.name} className="lux-item-img" />
                                                ) : (
                                                    <div className="lux-item-image-fallback">No Image</div>
                                                )}
                                                <div className="lux-item-details">
                                                    <strong className="lux-item-name">{product.name}</strong>
                                                    <span className="lux-item-qty">Qty {product.quantity} × {formatAmount(product.unitPrice)}</span>
                                                </div>
                                                <div className="lux-item-price text-right">
                                                    {formatAmount(product.lineTotal)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Summary */}
                                <div className="lux-drawer-section">
                                    <h4 className="lux-section-title"><CreditCard size={16} className="mr-2" /> Financials</h4>
                                    <div className="lux-payment-summary">
                                        {paymentSummary.preDiscountTotal > 0 && <div className="lux-price-row"><span>Retail Total</span><strong>{formatAmount(paymentSummary.preDiscountTotal)}</strong></div>}
                                        <div className="lux-price-row"><span>Subtotal</span><strong>{formatAmount(paymentSummary.subtotal)}</strong></div>
                                        <div className="lux-price-row"><span>Shipping</span><strong>{formatAmount(paymentSummary.shipping)}</strong></div>
                                        {paymentSummary.gstAmount > 0 && <div className="lux-price-row"><span>Taxes (GST)</span><strong>{formatAmount(paymentSummary.gstAmount)}</strong></div>}
                                        {paymentSummary.giftWrapCharge > 0 && <div className="lux-price-row"><span>Gift Wrap</span><strong>{formatAmount(paymentSummary.giftWrapCharge)}</strong></div>}
                                        {paymentSummary.protectionCharge > 0 && <div className="lux-price-row"><span>Protection</span><strong>{formatAmount(paymentSummary.protectionCharge)}</strong></div>}
                                        {paymentSummary.ecoCharge > 0 && <div className="lux-price-row"><span>Eco Charge</span><strong>{formatAmount(paymentSummary.ecoCharge)}</strong></div>}
                                        {paymentSummary.paymentFee > 0 && <div className="lux-price-row"><span>Payment Fee</span><strong>{formatAmount(paymentSummary.paymentFee)}</strong></div>}
                                        {paymentSummary.otherCharges > 0 && <div className="lux-price-row"><span>Other Charges</span><strong>{formatAmount(paymentSummary.otherCharges)}</strong></div>}
                                        
                                        {paymentSummary.discountAmount > 0 && <div className="lux-price-row text-success"><span>Instant Discount</span><strong>-{formatAmount(paymentSummary.discountAmount)}</strong></div>}
                                        {paymentSummary.couponDiscount > 0 && <div className="lux-price-row text-success"><span>Coupon {paymentSummary.couponCode ? `(${paymentSummary.couponCode})` : ''}</span><strong>-{formatAmount(paymentSummary.couponDiscount)}</strong></div>}
                                        
                                        <div className="lux-price-row lux-grand-total mt-3 pt-3 border-top">
                                            <span>Total Settled</span>
                                            <strong className="text-info" style={{fontSize: '18px'}}>{formatAmount(paymentSummary.finalAmount)}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Logs Section */}
                                {fullOrderData.paymentLogs && Array.isArray(fullOrderData.paymentLogs) && fullOrderData.paymentLogs.length > 0 && (
                                    <div className="lux-drawer-section border-0 mb-0 pb-0 shadow-none px-0">
                                        <h4 className="lux-section-title"><RotateCcw size={16} className="mr-2" /> Audit Trail</h4>
                                        <div className="lux-payment-logs">
                                            {fullOrderData.paymentLogs.map((log, idx) => (
                                                <div key={idx} className="lux-log-item">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="lux-badge">{log.status}</span>
                                                        <span className="lux-log-time text-muted small">{formatDateTime(log.date)}</span>
                                                    </div>
                                                    <div className="lux-log-amount font-weight-bold" style={{fontSize: '15px'}}>
                                                        ₹{log.amount} <span className="text-muted font-weight-normal text-sm ml-1">via {log.gateway || log.method}</span>
                                                    </div>
                                                    {log.txnId && <div className="lux-log-txn small text-muted mt-2 font-family-monospace">TXN: {log.txnId}</div>}
                                                    {log.message && <div className="lux-log-msg text-danger small mt-1">{log.message}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        )}
        
        {/* Luxury Styles Embedded */}
        <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');

            .lux-drawer-root { font-family: 'Jost', sans-serif; position: fixed; inset: 0; z-index: 9999; display: flex; justify-content: flex-end; }
            .lux-drawer-backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); }
            .lux-drawer-panel { position: relative; width: 100%; max-width: 500px; background: #fff; display: flex; flex-direction: column; box-shadow: -25px 0 50px -12px rgba(0,0,0,0.5); border-left: 1px solid rgba(212,175,55,0.2); z-index: 1; }
            
            .lux-drawer-header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; color: #fff; border-bottom: 3px solid #D4AF37; display: flex; justify-content: space-between; align-items: flex-start; }
            .lux-drawer-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 8px; }
            .lux-drawer-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 800; margin: 0; color: #fff; line-height: 1.2; }
            .lux-drawer-title span { color: #94a3b8; font-family: monospace; font-size: 18px; }
            
            .lux-drawer-close { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; color: #fff; cursor: pointer; transition: all 0.2s; padding: 8px; display: flex; align-items: center; justify-content: center; }
            .lux-drawer-close:hover { background: rgba(255,255,255,0.2); border-color: rgba(212,175,55,0.5); color: #D4AF37; transform: rotate(90deg); }
            
            .lux-btn-ghost-light { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
            .lux-btn-ghost-light:hover { background: rgba(255,255,255,0.2); border-color: rgba(212,175,55,0.5); color: #D4AF37; }

            .lux-drawer-body { flex: 1; padding: 32px; overflow-y: auto; background: #f8fafc; }
            .lux-drawer-body::-webkit-scrollbar { width: 6px; }
            .lux-drawer-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

            .lux-info-box { display: flex; flex-direction: column; background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: transform 0.2s; }
            .lux-info-box:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.05); border-color: rgba(212,175,55,0.2); }
            .lux-info-header { display: flex; align-items: center; gap: 12px; }
            .lux-info-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); color: #b8860b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .lux-info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
            
            .lux-info-content { display: flex; flex-direction: column; }
            .lux-info-value { font-size: 16px; color: #0f172a; font-weight: 700; word-break: break-word; }
            .lux-info-sub { font-size: 13px; color: #475569; margin-top: 4px; display: block; }

            .lux-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #fefce8; color: #b45309; border: 1px solid #fde68a; }

            .lux-drawer-section { margin-bottom: 24px; background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
            .lux-section-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; display: flex; align-items: center; }
            .lux-pill-count { background: #f1f5f9; color: #475569; font-family: 'Jost', sans-serif; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: auto; letter-spacing: 0.5px; font-weight: 600; text-transform: uppercase; border: 1px solid #e2e8f0; }

            .lux-items-list { display: flex; flex-direction: column; gap: 16px; }
            .lux-item-row { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; background: #f8fafc; transition: all 0.2s; }
            .lux-item-row:hover { background: #fff; border-color: rgba(212,175,55,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
            .lux-item-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; border: 1px solid #e2e8f0; background: #fff; }
            .lux-item-image-fallback { width: 56px; height: 56px; border-radius: 10px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; }
            .lux-item-details { flex: 1; display: flex; flex-direction: column; }
            .lux-item-name { font-size: 14px; color: #0f172a; font-weight: 700; margin-bottom: 2px; }
            .lux-item-qty { font-size: 12px; color: #64748b; font-weight: 600; }
            .lux-item-price { font-size: 15px; font-weight: 800; color: #0f172a; }

            .lux-payment-summary { display: flex; flex-direction: column; gap: 10px; }
            .lux-price-row { display: flex; justify-content: space-between; font-size: 14px; color: #475569; font-weight: 500; }
            .lux-price-row strong { color: #0f172a; font-weight: 700; }
            .lux-grand-total { font-weight: 800; font-size: 16px; color: #0f172a; }
            
            .lux-payment-logs { display: flex; flex-direction: column; gap: 12px; }
            .lux-log-item { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; transition: all 0.2s; border-left: 3px solid #cbd5e1; }
            .lux-log-item:hover { background: #fff; border-color: #e2e8f0; border-left-color: #D4AF37; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }

            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }

            @media (max-width: 600px) {
                .lux-drawer-panel { max-width: 100%; }
                .lux-drawer-header { padding: 24px; flex-direction: column; align-items: flex-start; gap: 16px; }
                .lux-drawer-close { position: absolute; right: 24px; top: 24px; }
                .lux-drawer-body { padding: 20px; }
                .lux-item-row { flex-wrap: wrap; }
                .lux-item-price { width: 100%; text-align: left; margin-top: 4px; }
            }
        `}} />
    </AnimatePresence>
  );
}   