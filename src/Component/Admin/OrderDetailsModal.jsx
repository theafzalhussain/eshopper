import React, { useRef } from 'react';
import OrderTimeline from './OrderTimeline';
import { Copy, Printer, FileText, X } from 'lucide-react';
import './OrderDetailsModal.css';

export default function OrderDetailsModal({ order, open, onClose }) {
  const modalRef = useRef();

  if (!open || !order) return null;

  const items = Array.isArray(order.products) ? order.products : (Array.isArray(order.orderItems) ? order.orderItems : []);
  const getItemQty = (item = {}) => {
    const qtyValue = Number(item.quantity ?? item.qty ?? item.count ?? item.orderedQty ?? 1);
    return Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1;
  };
  const totalQty = items.reduce((sum, item) => sum + getItemQty(item), 0);
  const shippingAddressText = typeof order.shippingAddress === 'string'
    ? order.shippingAddress
    : [
      order.shippingAddress?.fullName,
      order.shippingAddress?.phone,
      order.shippingAddress?.addressline1,
      order.shippingAddress?.city,
      order.shippingAddress?.state,
      order.shippingAddress?.pin,
      order.shippingAddress?.country
    ].filter(Boolean).join(', ');

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Placeholder: Integrate PDF generation logic (jsPDF or backend endpoint)
    alert('PDF download coming soon!');
  };

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div className="order-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <button className="order-modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="order-modal-title">Order Details</h2>
        <div className="order-modal-actions mb-3">
          <button onClick={() => handleCopy(order.orderId)} title="Copy Order ID" className="btn btn-light btn-sm mr-2"><Copy size={16} /> Order ID</button>
          <button onClick={() => handleCopy(order.userEmail)} title="Copy Email" className="btn btn-light btn-sm mr-2"><Copy size={16} /> Email</button>
          <button onClick={handlePrint} title="Print Invoice" className="btn btn-light btn-sm mr-2"><Printer size={16} /> Print</button>
          <button onClick={handleDownloadPDF} title="Download PDF" className="btn btn-light btn-sm"><FileText size={16} /> PDF</button>
        </div>
        <div className="order-modal-section">
          <h4>Order Info</h4>
          <div><b>Order ID:</b> {order.orderId || 'N/A'}</div>
          <div><b>Date:</b> {
            order.orderDate ? new Date(order.orderDate).toLocaleString() :
            order.createdAt ? new Date(order.createdAt).toLocaleString() :
            order.updatedAt ? new Date(order.updatedAt).toLocaleString() :
            'N/A'}
          </div>
          <div><b>Status:</b> {order.orderStatus || 'N/A'}</div>
        </div>
        <div className="order-modal-section">
          <h4>Customer</h4>
          <div><b>Name:</b> {order.userName || order.customerName || 'N/A'}</div>
          <div><b>Email:</b> {order.userEmail || order.email || 'N/A'}</div>
          <div><b>Phone:</b> {order.userPhone || order.phone || 'N/A'}</div>
        </div>
        <div className="order-modal-section">
          <h4>Shipping Address</h4>
          <div>{shippingAddressText || order.address || 'N/A'}</div>
        </div>
        <div className="order-modal-section">
          <h4>Items (Total Qty: {totalQty})</h4>
          <ul className="order-modal-items">
            {items.length === 0 ? (
              <li className="text-muted">No items found</li>
            ) : (
              items.map((item, idx) => (
                <li key={idx} className="order-modal-item">
                  <img src={item.pic1 || item.image || item.thumbnail || ''} alt="" width={40} height={40} style={{objectFit:'cover',borderRadius:8,marginRight:8}} />
                  <span>{item.name || item.title || 'N/A'} x {getItemQty(item)} <span className="text-muted">₹{item.price || item.amount || 0}</span></span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="order-modal-section">
          <h4>Payment</h4>
          <div><b>Method:</b> {order.paymentMethod || order.method || 'N/A'}</div>
          <div><b>Status:</b> {order.paymentStatus || order.status || 'N/A'}</div>
          <div><b>Amount:</b> ₹{order.finalAmount || order.amount || 0}</div>
        </div>
        <div className="order-modal-section">
          <h4>Status Timeline</h4>
          <OrderTimeline statusHistory={order.statusHistory || []} />
        </div>
      </div>
    </div>
  );
}
