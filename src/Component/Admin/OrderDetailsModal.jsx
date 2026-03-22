import React, { useRef } from 'react';
import { Copy, Printer, FileText, X } from 'lucide-react';
import './OrderDetailsModal.css';

export default function OrderDetailsModal({ order, open, onClose }) {
  const modalRef = useRef();
  if (!open || !order) return null;

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
          <div><b>Order ID:</b> {order.orderId}</div>
          <div><b>Date:</b> {new Date(order.orderDate || order.createdAt).toLocaleString()}</div>
          <div><b>Status:</b> {order.orderStatus}</div>
        </div>
        <div className="order-modal-section">
          <h4>Customer</h4>
          <div><b>Name:</b> {order.userName}</div>
          <div><b>Email:</b> {order.userEmail}</div>
          <div><b>Phone:</b> {order.userPhone || 'N/A'}</div>
        </div>
        <div className="order-modal-section">
          <h4>Shipping Address</h4>
          <div>{order.shippingAddress || 'N/A'}</div>
        </div>
        <div className="order-modal-section">
          <h4>Items</h4>
          <ul className="order-modal-items">
            {(order.products || order.orderItems || []).map((item, idx) => (
              <li key={idx} className="order-modal-item">
                <img src={item.pic1 || item.image || item.thumbnail} alt="" width={40} height={40} style={{objectFit:'cover',borderRadius:8,marginRight:8}} />
                <span>{item.name} x {item.qty || item.quantity || 1} <span className="text-muted">₹{item.price}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div className="order-modal-section">
          <h4>Payment</h4>
          <div><b>Method:</b> {order.paymentMethod}</div>
          <div><b>Status:</b> {order.paymentStatus}</div>
          <div><b>Amount:</b> ₹{order.finalAmount}</div>
        </div>
        <div className="order-modal-section">
          <h4>Status Timeline</h4>
          <ul className="order-modal-timeline">
            {(order.statusHistory || []).map((entry, idx) => (
              <li key={idx}>
                <b>{entry.status}</b> <span className="text-muted">{new Date(entry.timestamp).toLocaleString()}</span>
                {entry.message && <div className="small text-muted">{entry.message}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
