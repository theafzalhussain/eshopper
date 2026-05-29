import React, { useRef, useState } from 'react';
import OrderTimeline from './OrderTimeline';
import { Copy, Printer, FileText, X, Package, User, MapPin, CreditCard, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderDetailsModal({ order, open, onClose }) {
  const modalRef = useRef();
  const [copiedId, setCopiedId] = useState(false);

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

  const handleCopy = (text, isId = false) => {
    navigator.clipboard.writeText(text);
    if (isId) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Placeholder: Integrate PDF generation logic (jsPDF or backend endpoint)
    alert('PDF download coming soon!');
  };

  return (
    <AnimatePresence>
        {open && order && (
            <motion.div 
                className="lux-modal-backdrop" 
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div 
                    className="lux-modal-content" 
                    ref={modalRef} 
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="lux-modal-header">
                        <div>
                            <div className="lux-modal-eyebrow"><Package size={14} className="mr-1"/> Order Overview</div>
                            <h2 className="lux-modal-title">Receipt <span>#{String(order.orderId || 'N/A').slice(-8)}</span></h2>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="lux-modal-actions mr-3 d-none d-sm-flex">
                                <button onClick={() => handleCopy(order.orderId, true)} title="Copy Order ID" className="lux-btn-ghost-light">
                                    {copiedId ? <CheckCircle2 size={14} className="mr-1 text-success"/> : <Copy size={14} className="mr-1" />} ID
                                </button>
                                <button onClick={handlePrint} title="Print Invoice" className="lux-btn-ghost-light"><Printer size={14} className="mr-1" /> Print</button>
                                <button onClick={handleDownloadPDF} title="Download PDF" className="lux-btn-ghost-light"><FileText size={14} className="mr-1" /> PDF</button>
                            </div>
                            <button className="lux-modal-close" onClick={onClose}><X size={24} /></button>
                        </div>
                    </div>

                    <div className="lux-modal-body">
                        {/* Top Info Grid */}
                        <div className="row mb-4 g-3">
                            <div className="col-md-6">
                                <div className="lux-info-box">
                                    <div className="lux-info-icon"><User size={18} /></div>
                                    <div className="lux-info-content">
                                        <span className="lux-info-label">Customer Details</span>
                                        <strong className="lux-info-value">{order.userName || order.customerName || 'N/A'}</strong>
                                        <span className="lux-info-sub">{order.userEmail || order.email || 'N/A'}</span>
                                        <span className="lux-info-sub">{order.userPhone || order.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="lux-info-box">
                                    <div className="lux-info-icon"><MapPin size={18} /></div>
                                    <div className="lux-info-content">
                                        <span className="lux-info-label">Shipping Address</span>
                                        <strong className="lux-info-value d-block mt-1" style={{fontSize: '13px', lineHeight: 1.4, whiteSpace: 'normal'}}>
                                            {shippingAddressText || order.address || 'N/A'}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Info Grid */}
                        <div className="row mb-4 g-3">
                            <div className="col-md-6">
                                <div className="lux-info-box">
                                    <div className="lux-info-icon"><Clock size={18} /></div>
                                    <div className="lux-info-content">
                                        <span className="lux-info-label">Order Info</span>
                                        <strong className="lux-info-value">ID: {order.orderId || 'N/A'}</strong>
                                        <span className="lux-info-sub">Placed: {
                                            order.orderDate ? new Date(order.orderDate).toLocaleString() :
                                            order.createdAt ? new Date(order.createdAt).toLocaleString() :
                                            order.updatedAt ? new Date(order.updatedAt).toLocaleString() :
                                            'N/A'}
                                        </span>
                                        <span className="lux-info-sub mt-1">
                                            <span className="lux-badge">{order.orderStatus || 'N/A'}</span>
                                        </span>
                                        {order?.cancellation && order.cancellation.status && order.cancellation.status !== 'NOT_CANCELLED' && (
                                            <div style={{ marginTop: 8 }}>
                                                <span className="lux-info-label">Cancellation</span>
                                                <div style={{ color: '#b45309', fontWeight: 700 }}>{order.cancellation.status}</div>
                                                {order.cancellation.reason && <div style={{ color: '#475569', marginTop: 6 }}>{order.cancellation.reason}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="lux-info-box">
                                    <div className="lux-info-icon"><CreditCard size={18} /></div>
                                    <div className="lux-info-content">
                                        <span className="lux-info-label">Payment Summary</span>
                                        <strong className="lux-info-value" style={{fontSize: '18px', color: '#0f766e'}}>₹{Number(order.finalAmount || order.amount || 0).toLocaleString('en-IN')}</strong>
                                        <span className="lux-info-sub mt-1">Method: <strong>{order.paymentMethod || order.method || 'N/A'}</strong></span>
                                        <span className="lux-info-sub">Status: <strong>{order.paymentStatus || order.status || 'N/A'}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="lux-modal-section">
                            <h4 className="lux-section-title"><ShoppingBag size={16} className="mr-2" /> Ordered Items <span className="lux-pill-count">{totalQty} items</span></h4>
                            <div className="lux-items-list">
                                {items.length === 0 ? (
                                    <div className="text-center text-muted py-3">No items found in this order.</div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div key={idx} className="lux-item-row">
                                            <img src={item.pic1 || item.image || item.thumbnail || '/assets/images/noimage.png'} alt="" className="lux-item-img" />
                                            <div className="lux-item-details">
                                                <strong className="lux-item-name">{item.name || item.title || 'N/A'}</strong>
                                                <span className="lux-item-qty">Qty: {getItemQty(item)}</span>
                                            </div>
                                            <div className="lux-item-price">
                                                ₹{Number(item.price || item.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="lux-modal-section border-0 mb-0 pb-0">
                            <h4 className="lux-section-title"><Clock size={16} className="mr-2" /> Tracking Timeline</h4>
                            <OrderTimeline statusHistory={order.statusHistory || []} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
        
        {/* Luxury Styles Embedded */}
        <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');

            .lux-modal-backdrop { font-family: 'Jost', sans-serif; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
            .lux-modal-content { background: #fff; border-radius: 24px; width: 100%; max-width: 750px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; margin: auto; border: 1px solid rgba(212,175,55,0.2); }
            
            .lux-modal-header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 32px; color: #fff; border-bottom: 3px solid #D4AF37; display: flex; justify-content: space-between; align-items: center; }
            .lux-modal-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 4px; }
            .lux-modal-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 800; margin: 0; }
            .lux-modal-title span { color: #94a3b8; font-family: monospace; font-size: 18px; }
            .lux-modal-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; transition: color 0.2s; padding: 0; display: flex; }
            .lux-modal-close:hover { color: #fff; }
            .lux-modal-actions { display: flex; gap: 8px; }
            .lux-btn-ghost-light { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
            .lux-btn-ghost-light:hover { background: rgba(255,255,255,0.2); border-color: rgba(212,175,55,0.5); color: #D4AF37; }

            .lux-modal-body { padding: 32px; max-height: calc(90vh - 90px); overflow-y: auto; }
            .lux-modal-body::-webkit-scrollbar { width: 6px; }
            .lux-modal-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

            .lux-info-box { display: flex; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid #f1f5f9; height: 100%; }
            .lux-info-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); color: #b8860b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .lux-info-content { display: flex; flex-direction: column; width: 100%; overflow: hidden; }
            .lux-info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .lux-info-value { font-size: 15px; color: #0f172a; font-weight: 600; word-break: break-word; }
            .lux-info-sub { font-size: 12px; color: #475569; margin-top: 2px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .lux-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #fefce8; color: #b45309; border: 1px solid #fde68a; }

            .lux-modal-section { margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; }
            .lux-section-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; display: flex; align-items: center; }
            .lux-pill-count { background: #e2e8f0; color: #475569; font-family: 'Jost', sans-serif; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: auto; letter-spacing: 0.5px; font-weight: 600; text-transform: uppercase; }

            .lux-items-list { display: flex; flex-direction: column; gap: 12px; }
            .lux-item-row { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; transition: background 0.2s; }
            .lux-item-row:hover { background: #f8fafc; }
            .lux-item-img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #f1f5f9; }
            .lux-item-image-fallback { width: 48px; height: 48px; border-radius: 8px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; }
            .lux-item-details { flex: 1; display: flex; flex-direction: column; }
            .lux-item-name { font-size: 14px; color: #0f172a; font-weight: 600; margin-bottom: 2px; }
            .lux-item-qty { font-size: 12px; color: #64748b; font-weight: 500; }
            .lux-item-price { font-size: 15px; font-weight: 700; color: #0f172a; }

            @media (max-width: 600px) {
                .lux-modal-header { padding: 20px; flex-direction: column; align-items: flex-start; gap: 12px; }
                .lux-modal-close { position: absolute; right: 20px; top: 20px; }
                .lux-modal-body { padding: 20px; }
                .lux-item-row { flex-wrap: wrap; }
                .lux-item-price { width: 100%; text-align: right; }
            }
        `}} />
    </AnimatePresence>
  );
}
