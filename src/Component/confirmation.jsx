import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, FRONTEND_URL } from '../constants';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

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

  const statusTone = useMemo(() => {
    const s = String(order?.status || 'Ordered').toLowerCase();
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
        }
      } catch (err) {
        console.error('Order sync failed:', err?.message || err);
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
      }
    } catch (e) {
      console.error('Refresh failed:', e?.message || e);
    } finally {
      setRefreshing(false);
    }
  }

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
          .brand img {
            width: 150px;
            max-width: 100%;
            display: block;
            margin-left: auto;
            margin-bottom: 8px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 8px;
            padding: 4px;
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
              <img src="${BRAND_LOGO_URL}" alt="Brand" />
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
    { title: 'Order Confirmed', meta: 'Just now' },
    { title: 'Packed & Quality Checked', meta: 'Today' },
    { title: 'Dispatched', meta: 'In 1-2 days' },
    { title: `Delivery (${deliverySlot})`, meta: estimatedDate },
  ];

  return (
    <div className='confirm-shell'>
      <div className='confirm-bg-orb orb-a' />
      <div className='confirm-bg-orb orb-b' />

      <div className='container py-5'>
        <motion.section className='hero-card' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className='hero-badge'>ORDER SUCCESS</div>
          <h1>Thank you, your order is confirmed</h1>
          <p>Order ID: {order.orderId || 'N/A'} • Estimated delivery by {estimatedDate}</p>
          <div className='hero-meta'>
            <span>Payment: {paymentMethod}</span>
            <span>Slot: {deliverySlot}</span>
            <span className={statusTone}>Status: {order.status || 'Ordered'}</span>
          </div>
          <div className='hero-actions'>
            <button className='hero-btn' onClick={handleCopyOrderId}>{copied ? 'Copied' : 'Copy Order ID'}</button>
            <button className='hero-btn' onClick={handleRefreshStatus}>{refreshing ? 'Refreshing...' : 'Refresh Status'}</button>
            <button className='hero-btn' onClick={handlePremiumInvoice}>View Tax Invoice</button>
            <button className='hero-btn' onClick={() => navigate(`/order-tracking/${encodeURIComponent(order.orderId || '')}`)}>Track Live</button>
          </div>
        </motion.section>

        <div className='row mt-4 g-4'>
          <motion.div className='col-lg-7' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className='panel-card'>
              <div className='panel-title-row'>
                <h4>Items in this order</h4>
                <span className='count-pill'>{items.length} items</span>
              </div>

              <div className='items-wrap'>
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
              <div className='timeline-wrap'>
                {timeline.map((step, i) => (
                  <div className='timeline-row' key={step.title}>
                    <div className='timeline-dot-wrap'>
                      <span className='timeline-dot' />
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
              <h4>Payment Summary</h4>

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

              <div className='action-grid'>
                <button className='btn-premium' onClick={() => navigate('/my-orders')}>Track Order</button>
                <button className='btn-secondary-premium' onClick={() => navigate('/shop/all')}>Continue Shopping</button>
              </div>
            </div>
          </motion.div>
        </div>

        {recommended.length > 0 ? (
          <motion.section className='panel-card mt-4' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className='panel-title-row'>
              <h4>You may also like</h4>
              <span className='count-pill'>{recommended.length} picks</span>
            </div>
            <div className='rec-grid'>
              {recommended.map((p, i) => (
                <div key={p._id || p.id || i} className='rec-card'>
                  <img src={optimizeCloudinaryUrlAdvanced(p.pic1 || '/assets/images/noimage.png', { maxWidth: 320, crop: 'fill' })} alt={p.name || 'product'} />
                  <h6>{p.name || 'Product'}</h6>
                  <p>{money(p.finalprice || p.price || 0)}</p>
                  <button onClick={() => navigate(`/single-product/${encodeURIComponent(p._id || p.id || '')}`)}>View</button>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .confirm-shell {
    min-height: 100vh;
    background: radial-gradient(circle at 0% 0%, rgba(186, 230, 253, 0.35), transparent 30%), radial-gradient(circle at 100% 0%, rgba(253, 230, 138, 0.25), transparent 28%), linear-gradient(180deg, #f5f7fb 0%, #ecf1f6 100%);
    position: relative;
    overflow: hidden;
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
    background: linear-gradient(120deg, #0f172a, #1e293b 55%, #0b1220);
    color: #fff;
    border-radius: 18px;
    padding: 24px;
    border: 1px solid rgba(186, 230, 253, 0.24);
    box-shadow: 0 16px 28px rgba(15, 23, 42, 0.26);
    position: relative;
    overflow: hidden;
  }
  .hero-badge {
    display: inline-block;
    border: 1px solid #67e8f9;
    color: #67e8f9;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .hero-card h1 {
    font-size: 1.9rem;
    font-weight: 900;
    margin-bottom: 6px;
    letter-spacing: -0.4px;
  }
  .hero-card p {
    color: #cbd5e1;
    margin-bottom: 10px;
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hero-meta span {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 700;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .hero-btn {
    border: 1px solid rgba(255, 255, 255, 0.24);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 700;
  }
  .tone-success { border-color: #86efac !important; color: #86efac; }
  .tone-info { border-color: #7dd3fc !important; color: #7dd3fc; }
  .tone-danger { border-color: #fca5a5 !important; color: #fca5a5; }
  .tone-warn { border-color: #fde68a !important; color: #fde68a; }

  .panel-card {
    border: 1px solid #dbe4ef;
    border-radius: 16px;
    background: linear-gradient(145deg, #ffffff, #f8fbff);
    box-shadow: 0 14px 24px rgba(15, 23, 42, 0.07);
    padding: 16px;
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
  .order-item {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 10px;
    align-items: center;
    border: 1px solid #e2e8f0;
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
  .timeline-row {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }
  .timeline-row:last-child { margin-bottom: 0; }
  .timeline-dot-wrap {
    position: relative;
    display: flex;
    justify-content: center;
  }
  .timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(90deg, #0ea5b7, #0284c7);
    margin-top: 3px;
  }
  .timeline-line {
    position: absolute;
    top: 15px;
    bottom: -8px;
    width: 2px;
    background: #bfdbfe;
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
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .rec-card {
    border: 1px solid #dbe4ef;
    border-radius: 12px;
    background: #fff;
    padding: 10px;
    text-align: center;
  }
  .rec-card img {
    width: 100%;
    height: 110px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 8px;
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
  .btn-secondary-premium {
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #fff;
    color: #1e293b;
    padding: 10px 12px;
    font-weight: 800;
    font-size: 0.92rem;
  }

  @media (max-width: 991.98px) {
    .sticky-side { position: static; }
  }
  @media (max-width: 767.98px) {
    .hero-card { padding: 18px; }
    .hero-card h1 { font-size: 1.45rem; }
    .order-item { grid-template-columns: 56px 1fr; }
    .order-item img { width: 56px; height: 56px; }
    .item-price { grid-column: span 2; text-align: right; }
    .action-grid { grid-template-columns: 1fr; }
    .help-grid { grid-template-columns: 1fr; }
    .rec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hero-actions { flex-direction: column; align-items: stretch; }
  }
`;
