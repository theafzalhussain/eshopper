import React from 'react';
import { Package, User, Mail, CreditCard, MapPin, Calendar, ShoppingBag, Clock } from 'lucide-react';
import './OrderDetailsDrawer.css';

export default function OrderDetailsDrawer({ open, onClose, order, loading }) {
  if (!open) return null;

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
          ) : order ? (
            <>
              <div className="drawer-section d-flex align-items-center">
                <CreditCard size={18} className="mr-2 text-info" />
                <span><strong>Order ID:</strong> {order.orderId}</span>
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
                <ShoppingBag size={18} className="mr-2 text-success" />
                <span><strong>Status:</strong> {order.orderStatus}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <CreditCard size={18} className="mr-2 text-danger" />
                <span><strong>Payment:</strong> {order.paymentMethod} ({order.paymentStatus})</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <span className="font-weight-bold text-dark mr-2">₹{Number(order.finalAmount || 0).toLocaleString('en-IN')}</span>
                <span className="text-muted">Total Amount</span>
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
                    <li key={i}>
                      <span className="font-weight-bold">{p.name}</span> x <span>{p.qty || 1}</span> @ ₹{p.price || p.baseprice}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="drawer-section">
                <Calendar size={18} className="mr-2 text-success" />
                <strong>Order Timeline:</strong>
                <ul className="drawer-timeline mt-2">
                  {order.statusHistory?.map((entry, idx) => (
                    <li key={idx}>
                      <span className="font-weight-bold text-primary">{entry.status}</span> - {new Date(entry.timestamp).toLocaleString('en-IN')}
                      {entry.message && <div className="drawer-timeline-msg">{entry.message}</div>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Calendar size={16} className="mr-2 text-muted" />
                <span><strong>Created:</strong> {new Date(order.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="drawer-section d-flex align-items-center">
                <Clock size={16} className="mr-2 text-muted" />
                <span><strong>Updated:</strong> {new Date(order.updatedAt).toLocaleString('en-IN')}</span>
              </div>
            </>
          ) : (
            <div className="drawer-error">Order not found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
