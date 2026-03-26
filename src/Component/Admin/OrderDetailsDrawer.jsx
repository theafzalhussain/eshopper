import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import OrderTimeline from './OrderTimeline';
import { Package, User, Mail, CreditCard, MapPin, Calendar, ShoppingBag, Clock, AlertCircle } from 'lucide-react';
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

export default function OrderDetailsDrawer({ open, onClose, order, loading }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const isAdmin = localStorage.getItem('role') === 'admin';
  const [copied, setCopied] = useState(false);

  // Debug: Log the admin secret to verify it's set
  useEffect(() => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('REACT_APP_ADMIN_SECRET:', process.env.REACT_APP_ADMIN_SECRET);
    }
  }, []);

  const handleCopyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  useEffect(() => {
    if (open && order?.orderId && isAdmin) {
      fetchNotes();
    } else {
      setNotes([]);
    }
    // eslint-disable-next-line
  }, [open, order?.orderId]);

  const fetchNotes = async () => {
    setNotesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/order/${order.orderId}/notes`, {
        headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET }
      });
      const data = await res.json();
      if (data.success) setNotes(data.notes);
    } catch (e) {}
    setNotesLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/order/${order.orderId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET
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
            <div className="drawer-loading"><Clock className="mr-2" />Loading...</div>
          ) : !order ? (
            <div className="drawer-error text-center py-4">
              <AlertCircle size={48} className="text-danger mb-3" />
              <h5>Unable to Load Order Details</h5>
              <p className="text-muted mb-0">The order details could not be loaded. Please check your permissions and try again.</p>
            </div>
          ) : (
            <>
              <div className="drawer-section d-flex align-items-center">
                <CreditCard size={18} className="mr-2 text-info" />
                <span><strong>Order ID:</strong> {order.orderId}</span>
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
                <span><strong>Customer:</strong> {order.userName}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Mail size={18} className="mr-2 text-warning" />
                <span><strong>Email:</strong> {order.userEmail}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Calendar size={18} className="mr-2 text-success" />
                <span><strong>Order Date:</strong> {formatDate(getOrderDate(order, 'created'))}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Clock size={18} className="mr-2 text-info" />
                <span><strong>Last Updated:</strong> {formatDate(getOrderDate(order, 'updated'))}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <ShoppingBag size={18} className="mr-2 text-success" />
                <span><strong>Status:</strong> {order.orderStatus}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <CreditCard size={18} className="mr-2 text-danger" />
                <span><strong>Payment:</strong> {order.paymentMethod} ({order.paymentStatus})</span>
              </div>
              <div className="drawer-section">
                <MapPin size={18} className="mr-2 text-secondary" />
                <strong>Shipping Address:</strong>
                <div className="drawer-address mt-2">
                  {order.shippingAddress?.fullName}<br />
                  {order.shippingAddress?.addressline1}<br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pin}<br />
                  {order.shippingAddress?.country}
                  <br />Phone: {order.shippingAddress?.phone}
                </div>
              </div>
              <div className="drawer-section">
                <ShoppingBag size={18} className="mr-2 text-info" />
                <strong>Products:</strong>
                <ul className="drawer-products mt-2">
                  {order.products?.map((p, i) => (
                    <li key={i} style={{display:'flex',alignItems:'center',marginBottom:8}}>
                      {p.image && (
                        <img
                          src={p.image.startsWith('http') ? p.image : `${BASE_URL}/productimages/${p.image}`}
                          alt={p.name}
                          style={{width:44,height:44,objectFit:'cover',borderRadius:8,marginRight:12,border:'1.5px solid #eee'}}
                        />
                      )}
                      <div style={{marginLeft:12}}>
                        <span>{p.name}</span>
                        <span style={{fontSize:12,color:'#b91c1c',marginTop:2}}>{p.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Payment History Section */}
              {order.paymentLogs && Array.isArray(order.paymentLogs) && order.paymentLogs.length > 0 && (
                <div className="drawer-section">
                  <CreditCard size={18} className="mr-2 text-danger" />
                  <strong>Payment History:</strong>
                  <ul style={{marginTop:8,paddingLeft:0,listStyle:'none'}}>
                    {order.paymentLogs.map((log, idx) => (
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