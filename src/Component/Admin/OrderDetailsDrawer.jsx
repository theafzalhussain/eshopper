import React, { useState, useEffect, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Package, User, Mail, CreditCard, MapPin, Calendar, ShoppingBag, Clock, AlertCircle } from 'lucide-react';
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

  const imageValue = product?.image || product?.pic1 || product?.productid?.pic1 || '';
  const imageSrc = typeof imageValue === 'string' && imageValue.length > 0
    ? (imageValue.startsWith('http') ? imageValue : `${BASE_URL}/productimages/${imageValue}`)
    : '';

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

export default function OrderDetailsDrawer({ open, onClose, order }) {
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
    const subtotal = Number(fullOrderData?.totalAmount ?? computedSubtotal) || 0;
    const shipping = Number(fullOrderData?.shippingAmount || 0) || 0;
    const finalAmount = Number(fullOrderData?.finalAmount ?? (subtotal + shipping)) || 0;
    const itemCount = productRows.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

    return {
      subtotal,
      shipping,
      finalAmount,
      itemCount
    };
  }, [fullOrderData?.totalAmount, fullOrderData?.shippingAmount, fullOrderData?.finalAmount, productRows]);

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
    <div className={`order-details-drawer premium-glass${open ? ' open' : ''}`}>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-content premium-animate">
        <button className="drawer-close" onClick={onClose}>&times;</button>
        <div className="drawer-header-gradient d-flex align-items-center mb-0">
          <Package size={32} className="mr-2 text-gradient" />
          <h2 className="mb-0 font-weight-bold">Order Details</h2>
        </div>
        <div className="drawer-body-scroll">
          {loading ? (
            <div className="drawer-loading"><Clock className="mr-2" />Loading order details...</div>
          ) : !fullOrderData ? (
            <div className="drawer-error text-center py-4">
              <AlertCircle size={48} className="text-danger mb-3" />
              <h5>Unable to Load Order Details</h5>
              <p className="text-muted mb-0">The order details could not be loaded. Please check your permissions and try again.</p>
            </div>
          ) : (
            <>
              <div className="drawer-section d-flex align-items-center">
                <CreditCard size={18} className="mr-2 text-info" />
                <span><strong>Order ID:</strong> {fullOrderData.orderId || 'N/A'}</span>
                <button
                  className="btn btn-sm btn-outline-primary ml-2 d-flex align-items-center"
                  style={{borderRadius: '16px', fontSize: 13, padding: '2px 10px', marginLeft: 10, height: 28}}
                  onClick={handleCopyOrderId}
                  title="Copy Order ID"
                >
                  <Copy size={15} style={{marginRight: 4, marginTop: -2}} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <User size={18} className="mr-2 text-primary" />
                <span><strong>Customer:</strong> {fullOrderData.userName || fullOrderData.shippingAddress?.fullName || 'N/A'}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Mail size={18} className="mr-2 text-warning" />
                <span><strong>Email:</strong> {fullOrderData.userEmail || fullOrderData.email || 'N/A'}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Calendar size={18} className="mr-2 text-success" />
                <span><strong>Order Date:</strong> {formatDate(getOrderDate(fullOrderData, 'created'))}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Clock size={18} className="mr-2 text-info" />
                <span><strong>Last Updated:</strong> {formatDate(getOrderDate(fullOrderData, 'updated'))}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <ShoppingBag size={18} className="mr-2 text-success" />
                <span><strong>Status:</strong> {fullOrderData.orderStatus || fullOrderData.orderstatus || 'N/A'}</span>
              </div>
              <div className="drawer-section payment-summary-section">
                <div className="d-flex align-items-center payment-summary-head">
                  <CreditCard size={18} className="mr-2 text-danger" />
                  <span><strong>Payment:</strong> {fullOrderData.paymentMethod || 'N/A'} ({fullOrderData.paymentStatus || 'N/A'})</span>
                </div>
                <div className="payment-breakdown-wrap mt-2">
                  <div className="payment-breakdown-row">
                    <span>Subtotal</span>
                    <strong>{formatAmount(paymentSummary.subtotal)}</strong>
                  </div>
                  <div className="payment-breakdown-row">
                    <span>Shipping</span>
                    <strong>{formatAmount(paymentSummary.shipping)}</strong>
                  </div>
                  <div className="payment-breakdown-row grand-total">
                    <span>Total Amount</span>
                    <strong>{formatAmount(paymentSummary.finalAmount)}</strong>
                  </div>
                </div>
              </div>
              <div className="drawer-section">
                <MapPin size={18} className="mr-2 text-secondary" />
                <strong>Shipping Address:</strong>
                <div className="drawer-address mt-2">
                  {fullOrderData.shippingAddress?.fullName}<br />
                  {fullOrderData.shippingAddress?.addressline1}<br />
                  {fullOrderData.shippingAddress?.city}, {fullOrderData.shippingAddress?.state} - {fullOrderData.shippingAddress?.pin}<br />
                  {fullOrderData.shippingAddress?.country}
                  <br />Phone: {fullOrderData.shippingAddress?.phone}
                </div>
              </div>
              <div className="drawer-section products-summary-section">
                <div className="products-header-row">
                  <div className="d-flex align-items-center">
                    <ShoppingBag size={18} className="mr-2 text-info" />
                    <strong>Products:</strong>
                  </div>
                  <span className="products-count-pill">{paymentSummary.itemCount || productRows.length} items</span>
                </div>

                <ul className="drawer-products mt-2">
                  {productRows.map((product) => (
                    <li key={product.id} className="drawer-product-item">
                      {product.imageSrc ? (
                        <img
                          src={product.imageSrc}
                          alt={product.name}
                          className="drawer-product-image"
                        />
                      ) : (
                        <div className="drawer-product-image drawer-product-image-fallback">No Image</div>
                      )}

                      <div className="drawer-product-content">
                        <span className="drawer-product-name">{product.name}</span>
                        {product.description ? (
                          <span className="drawer-product-description">{product.description}</span>
                        ) : null}
                        <span className="drawer-product-meta">
                          Qty {product.quantity} x {formatAmount(product.unitPrice)}
                        </span>
                        <span className="drawer-product-total">Line Total: {formatAmount(product.lineTotal)}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="products-grand-total mt-2">
                  <span>Grand Total</span>
                  <strong>{formatAmount(paymentSummary.finalAmount)}</strong>
                </div>
              </div>
              {/* Payment History Section */}
              {fullOrderData.paymentLogs && Array.isArray(fullOrderData.paymentLogs) && fullOrderData.paymentLogs.length > 0 && (
                <div className="drawer-section">
                  <CreditCard size={18} className="mr-2 text-danger" />
                  <strong>Payment History:</strong>
                  <ul style={{marginTop:8,paddingLeft:0,listStyle:'none'}}>
                    {fullOrderData.paymentLogs.map((log, idx) => (
                      <li key={idx} style={{marginBottom:6,padding:6,background:'#f8f9fa',borderRadius:6}}>
                        <div style={{fontSize:14}}>
                          <span className="font-weight-bold">{log.status}</span> — ₹{log.amount} via {log.gateway || log.method}
                        </div>
                        <div style={{fontSize:12,color:'#888'}}>
                          {log.txnId && <span>Txn: {log.txnId} </span>}
                          {log.date && <span style={{marginLeft:8}}>{formatDateTime(log.date)}</span>}
                        </div>
                        {log.message && <div style={{fontSize:12,color:'#b91c1c',marginTop:2}}>{log.message}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}   