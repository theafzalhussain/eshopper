import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    CalendarDays,
    Clock3,
    Compass,
    KeyRound,
    LocateFixed,
    Package,
    Phone,
    Route,
    ShoppingBag,
    Sparkles,
    StickyNote,
    Truck,
    X
} from 'lucide-react';
import './OrderActionDrawer.css';

const formatOrderDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN');
};

const formatInr = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const buildProductView = (product = {}, apiBaseUrl = '') => {
    const name =
        product?.name ||
        product?.productName ||
        product?.title ||
        product?.productid?.name ||
        'Product';

    const description = product?.description || product?.productid?.description || '';

    const qtyValue = Number(product?.quantity || product?.qty || product?.count || 1);
    const quantity = Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1;

    const unitPriceValue = Number(
        product?.price ||
        product?.salePrice ||
        product?.finalprice ||
        product?.baseprice ||
        product?.productid?.finalprice ||
        product?.productid?.baseprice ||
        0
    );
    const unitPrice = Number.isFinite(unitPriceValue) ? unitPriceValue : 0;

    const lineTotalValue = Number(product?.totalPrice || product?.total || unitPrice * quantity);
    const lineTotal = Number.isFinite(lineTotalValue) ? lineTotalValue : unitPrice * quantity;

    const imageValue = product?.image || product?.pic1 || product?.productid?.pic1 || product?.productid?.image || '';
    const imageUrl = typeof imageValue === 'string' && imageValue.trim()
        ? (imageValue.startsWith('http') || imageValue.startsWith('data:')
            ? imageValue
            : `${apiBaseUrl}/productimages/${imageValue}`)
        : '';

    return {
        name,
        description,
        quantity,
        unitPrice,
        lineTotal,
        imageUrl
    };
};

export default function OrderActionDrawer({
    open,
    onClose,
    order,
    updating,
    apiBaseUrl,
    adminSecret,
    allowedStatuses,
    deliveryTimeSlots,
    status,
    setStatus,
    deliveryDate,
    setDeliveryDate,
    deliveryTime,
    setDeliveryTime,
    adminNote,
    setAdminNote,
    riderName,
    setRiderName,
    riderPhone,
    setRiderPhone,
    locationName,
    setLocationName,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    deliveryOtp,
    setDeliveryOtp,
    onToday,
    onTomorrow,
    onApply
}) {
    const [fullOrder, setFullOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchFullOrder = async () => {
            if (!open) {
                setFullOrder(null);
                setLoadingOrder(false);
                return;
            }

            setFullOrder(order || null);

            if (!order?.orderId || !apiBaseUrl) {
                return;
            }

            try {
                setLoadingOrder(true);
                const response = await axios.get(`${apiBaseUrl}/api/admin/order/${order.orderId}`, {
                    headers: adminSecret ? { 'x-admin-secret': adminSecret } : {}
                });

                const payload = response?.data?.order && typeof response.data.order === 'object'
                    ? response.data.order
                    : response.data;

                if (!isMounted) return;

                const mergedOrder = {
                    ...(order || {}),
                    ...(payload || {})
                };

                if (!Array.isArray(mergedOrder.products) || mergedOrder.products.length === 0) {
                    mergedOrder.products = Array.isArray(order?.products) ? order.products : [];
                }

                setFullOrder(mergedOrder);
            } catch (error) {
                if (!isMounted) return;
                setFullOrder(order || null);
            } finally {
                if (isMounted) {
                    setLoadingOrder(false);
                }
            }
        };

        fetchFullOrder();
        return () => {
            isMounted = false;
        };
    }, [open, order?.orderId, apiBaseUrl, adminSecret]);

    const orderView = fullOrder || order || {};

    const productRows = useMemo(
        () => (Array.isArray(orderView.products) ? orderView.products : []).map((item) => buildProductView(item, apiBaseUrl)),
        [orderView.products, apiBaseUrl]
    );

    const totalItems = useMemo(
        () => productRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        [productRows]
    );

    const totalAmount = Number(orderView.finalAmount || orderView.totalAmount || 0);

    if (!open) {
        return null;
    }

    return (
        <div className="order-action-drawer-root open">
            <div className="order-action-overlay" onClick={onClose} />
            <aside className="order-action-panel" role="dialog" aria-modal="true" aria-label="Update order status panel">
                <button type="button" className="order-action-close" onClick={onClose} disabled={updating}>
                    <X size={20} />
                </button>

                <div className="order-action-header">
                    <div className="order-action-header-icon">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3>Update Status</h3>
                        <p>Luxury action center for order updates</p>
                    </div>
                </div>

                <div className="order-action-body">
                    <section className="order-action-summary-card">
                        <div>
                            <span className="summary-label">Order ID</span>
                            <strong>{orderView.orderId || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="summary-label">Customer</span>
                            <strong>{orderView.userName || orderView.shippingAddress?.fullName || 'N/A'}</strong>
                        </div>
                        <div>
                            <span className="summary-label">Current Status</span>
                            <strong>{orderView.orderStatus || 'Pending'}</strong>
                        </div>
                                {orderView?.cancellation && orderView.cancellation.status && orderView.cancellation.status !== 'NOT_CANCELLED' && (
                                    <div>
                                        <span className="summary-label">Cancellation</span>
                                        <strong style={{ display: 'block', color: '#b45309' }}>{orderView.cancellation.status}</strong>
                                        {orderView.cancellation.reason && <div style={{ marginTop: 6, color: '#475569' }}>{orderView.cancellation.reason}</div>}
                                    </div>
                                )}
                                {orderView?.refund && orderView.refund.status && (
                                    <div>
                                        <span className="summary-label">Refund</span>
                                        <strong style={{ display: 'block', color: orderView.refund.status === 'COMPLETED' ? '#16a34a' : '#b91c1c' }}>{orderView.refund.status}</strong>
                                        {orderView.refund.amount ? <div style={{ marginTop: 6, color: '#475569' }}>{formatInr(orderView.refund.amount)}</div> : null}
                                        {orderView.refund.status !== 'COMPLETED' && adminSecret && (
                                            <div style={{ marginTop: 8 }}>
                                                <button className="order-retry-btn" onClick={async () => {
                                                    try {
                                                        const hdr = adminSecret ? { 'x-admin-secret': adminSecret } : {};
                                                        await axios.post(`${apiBaseUrl}/api/admin/orders/${encodeURIComponent(orderView.orderId)}/refund/retry`, {}, { headers: hdr });
                                                        alert('Refund retried and queued');
                                                    } catch (e) {
                                                        alert('Failed to queue refund retry');
                                                    }
                                                }}>Retry Refund</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                        <div>
                            <span className="summary-label">Current ETA</span>
                            <strong>{formatOrderDate(orderView.deliverySchedule?.date || orderView.estimatedArrival)}</strong>
                        </div>
                        <div>
                            <span className="summary-label">Total Amount</span>
                            <strong className="summary-amount">{formatInr(totalAmount)}</strong>
                        </div>
                        <div>
                            <span className="summary-label">Items</span>
                            <strong>{totalItems || productRows.length || 0}</strong>
                        </div>
                    </section>

                    <section className="order-action-products-card">
                        <div className="products-card-title">
                            <ShoppingBag size={15} /> Product Details
                        </div>

                        {loadingOrder ? (
                            <div className="products-loading">Loading products...</div>
                        ) : productRows.length === 0 ? (
                            <div className="products-empty">No product details available for this order.</div>
                        ) : (
                            <ul className="order-action-products-list">
                                {productRows.map((item, index) => (
                                    <li key={`${item.name}-${index}`} className="order-product-row">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                className="order-product-image"
                                            />
                                        ) : (
                                            <span className="order-product-image placeholder">
                                                <Package size={15} />
                                            </span>
                                        )}

                                        <div className="order-product-content">
                                            <strong className="order-product-name">{item.name}</strong>
                                            {item.description ? (
                                                <span className="order-product-description">{item.description}</span>
                                            ) : null}
                                            <span className="order-product-meta">
                                                x {item.quantity} @ {formatInr(item.unitPrice)}
                                                {item.lineTotal > 0 ? ` | Line Total: ${formatInr(item.lineTotal)}` : ''}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="order-action-form-card">
                        <label className="action-field-label">
                            <Truck size={14} /> New Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={updating}
                        >
                            {allowedStatuses.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>

                        <label className="action-field-label">
                            <CalendarDays size={14} /> Delivery Date
                        </label>
                        <input
                            type="date"
                            value={deliveryDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            disabled={updating}
                        />

                        <div className="quick-day-grid">
                            <button type="button" onClick={onToday} disabled={updating}>Today</button>
                            <button type="button" onClick={onTomorrow} disabled={updating}>Tomorrow</button>
                        </div>

                        <label className="action-field-label">
                            <Clock3 size={14} /> Time Slot
                        </label>
                        <select
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                            disabled={updating}
                        >
                            {deliveryTimeSlots.map((slot) => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))}
                        </select>

                        <label className="action-field-label">
                            <StickyNote size={14} /> Admin Note (optional)
                        </label>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="Add internal note for status update..."
                            disabled={updating}
                        />

                        <label className="action-field-label">
                            <Truck size={14} /> Rider Name
                        </label>
                        <input
                            type="text"
                            value={riderName}
                            onChange={(e) => setRiderName(e.target.value)}
                            placeholder="Assigned rider name"
                            disabled={updating}
                        />

                        <label className="action-field-label">
                            <Phone size={14} /> Rider Phone
                        </label>
                        <input
                            type="text"
                            value={riderPhone}
                            onChange={(e) => setRiderPhone(e.target.value)}
                            placeholder="Rider contact number"
                            disabled={updating}
                        />

                        <label className="action-field-label">
                            <Route size={14} /> Current Location
                        </label>
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="Area / landmark"
                            disabled={updating}
                        />

                        <div className="geo-grid">
                            <div>
                                <label className="action-field-label">
                                    <Compass size={14} /> Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="28.6139"
                                    disabled={updating}
                                />
                            </div>
                            <div>
                                <label className="action-field-label">
                                    <LocateFixed size={14} /> Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="77.2090"
                                    disabled={updating}
                                />
                            </div>
                        </div>

                        {status === 'Out for Delivery' && orderView?.deliveryOtp ? (
                            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.08)', color: '#7a5a17', fontSize: 12, fontWeight: 600 }}>
                                Delivery OTP generated: <strong style={{ letterSpacing: '0.14em', fontSize: 14 }}>{orderView.deliveryOtp}</strong>
                            </div>
                        ) : null}

                        {status === 'Delivered' && (
                            <>
                                <label className="action-field-label">
                                    <KeyRound size={14} /> Delivery OTP (Customer)
                                </label>
                                <input
                                    type="text"
                                    value={deliveryOtp}
                                    onChange={(e) => setDeliveryOtp(String(e.target.value || '').replace(/\D/g, '').slice(0, 6))}
                                    placeholder="Enter OTP shared by customer"
                                    disabled={updating}
                                />
                                <div style={{ marginTop: -2, marginBottom: 4, fontSize: 11, color: '#7a7f8d', lineHeight: 1.5 }}>
                                    Delivered status तभी लगेगा jab OTP verify ho.
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            className="apply-action-btn"
                            onClick={onApply}
                            disabled={updating}
                        >
                            {updating ? 'Updating...' : 'Apply Premium Update'}
                        </button>
                    </section>
                </div>
            </aside>
            <style dangerouslySetInnerHTML={{ __html: `
                @media (min-width: 768px) {
                    .order-action-drawer-root {
                        display: flex !important;
                        justify-content: flex-end !important;
                    }
                    .order-action-panel {
                        max-width: 500px !important;
                        width: 100% !important;
                        margin-left: auto !important;
                        position: absolute !important;
                        right: 0 !important;
                        left: auto !important;
                    }
                }
            `}} />
        </div>
    );
}
