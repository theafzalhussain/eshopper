
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { useSelector, useDispatch } from 'react-redux';
import { getCart } from '../Store/ActionCreaters/CartActionCreators';
import { useToast } from './ToastNotification';
import axios from 'axios';
import { BASE_URL } from '../constants';
import Spinner from './Spinner';
axios.defaults.baseURL = BASE_URL;

export default function Cart() {
    const dispatch = useDispatch();
    const cartState = useSelector(state => state.CartStateData);
    // Filter out duplicate items by _id to ensure unique React keys
    const cartRaw = cartState && cartState.items ? cartState.items : [];
    const cart = Array.isArray(cartRaw)
        ? cartRaw.filter((item, idx, arr) =>
            item && item._id && arr.findIndex(i => i && i._id === item._id) === idx)
        : [];
    const [removingIds, setRemovingIds] = useState([]);
    const toast = useToast();
    const [subtotal, setSubtotal] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [baseDiscount, setBaseDiscount] = useState(0);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [gst, setGst] = useState(0);
    const [coupon, setCoupon] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // For update/remove/coupon
    const [movingIds, setMovingIds] = useState([]);
    const userId = localStorage.getItem("userid");
    const [userMissing, setUserMissing] = useState(false);
    const totalDiscount = Number(baseDiscount) + Number(couponDiscount);

    const itemCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + Number(item.quantity ?? item.qty ?? 1), 0);
    }, [cart]);

    async function fetchCartAndSummary() {
        if (!userId) {
            setUserMissing(true);
            setSubtotal(0);
            setBaseDiscount(0);
            setCouponDiscount(0);
            setShipping(0);
            setGst(0);
            setLoading(false);
            return;
        }
        setUserMissing(false);
        setLoading(true);
        try {
            // Redux fetch
            await dispatch(getCart());
            const summaryRes = await axios.get(`/api/cart/order-summary?userId=${userId}`);
            const s = summaryRes.data.summary || {};
            setSubtotal(s.subtotal || 0);
            setBaseDiscount(s.discount || 0);
            setShipping(s.shipping || 0);
            setGst(s.gst || 0);

            // Keep coupon discount in sync when cart values change.
            if (couponApplied && coupon) {
                try {
                    const couponRes = await axios.post('/api/cart/apply-coupon', { userId, coupon });
                    if (couponRes.data && couponRes.data.success) {
                        setCouponDiscount(couponRes.data.discount || 0);
                        setCouponError("");
                    } else {
                        setCouponDiscount(0);
                    }
                } catch (couponErr) {
                    setCouponDiscount(0);
                    setCouponError(couponErr.response?.data?.message || "Coupon no longer applicable");
                }
            }
        } catch (e) {
            setSubtotal(0);
            setBaseDiscount(0);
            setCouponDiscount(0);
            setShipping(0);
            setGst(0);
        }
        setLoading(false);
    }

    async function updateQty(item, op) {
        let currentQty = Number(item.quantity ?? item.qty ?? 1);
        if (op === "dec" && currentQty === 1) return;
        let newQty = (op === "dec") ? currentQty - 1 : currentQty + 1;
        setActionLoading(true);
        try {
            await axios.put(`/api/cart/update-quantity/${item._id || item.id}`, { userId, quantity: newQty });
            await fetchCartAndSummary();
        } catch (e) {
            if (e.response && e.response.data && e.response.data.message && e.response.data.message.includes('Out of Stock')) {
                toast.error(e.response.data.message);
            } else {
                toast.error('Failed to update quantity.');
            }
        }
        setActionLoading(false);
    }

    async function removeProduct(id, silent = false) {
        setRemovingIds((prev) => [...prev, id]);
        setActionLoading(true);
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    await axios.delete(`/api/cart/remove-item/${id}`, {
                        params: { userId, userid: userId },
                        data: { userId, userid: userId }
                    });
                    await fetchCartAndSummary();
                    if (!silent) toast.info('Item removed from cart.');
                } catch (e) {
                    toast.error('Failed to remove item.');
                } finally {
                    setRemovingIds((prev) => prev.filter(rid => rid !== id));
                    setActionLoading(false);
                    resolve();
                }
            }, 250);
        });
    }

    async function moveToWishlist(item) {
        const itemId = item._id || item.id;
        const productId = item.productid || item.product?._id || item.product || itemId;
        if (!userId) {
            toast.error('Please login first.');
            return;
        }
        setMovingIds((prev) => [...prev, itemId]);
        setActionLoading(true);
        try {
            const wishlistRes = await axios.get('/wishlist');
            const existing = Array.isArray(wishlistRes.data) ? wishlistRes.data : [];
            const alreadyInWishlist = existing.some((w) =>
                String(w.userid) === String(userId) && String(w.productid) === String(productId)
            );

            if (!alreadyInWishlist) {
                await axios.post('/wishlist', {
                    userid: userId,
                    productid: productId,
                    name: item.name || item.product?.name,
                    color: item.color || item.product?.color,
                    size: item.size || item.product?.size,
                    price: Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0),
                    pic: item.pic || item.product?.pic1 || ''
                });
            }

            await removeProduct(itemId, true);
            toast.success(alreadyInWishlist ? 'Already in wishlist, removed from cart.' : 'Moved to wishlist successfully.');
        } catch (e) {
            toast.error('Failed to move item to wishlist.');
        } finally {
            setMovingIds((prev) => prev.filter((id) => id !== itemId));
            setActionLoading(false);
        }
    }

    async function handleApplyCoupon() {
        if (!coupon || couponApplied) return;
        setCouponError("");
        setActionLoading(true);
        try {
            const res = await axios.post('/api/cart/apply-coupon', { userId, coupon });
            if (res.data && res.data.success) {
                setCouponDiscount(res.data.discount || 0);
                setCouponApplied(true);
                setCouponError("");
            } else {
                setCouponError(res.data.message || "Invalid coupon");
            }
        } catch (err) {
            setCouponError(err.response?.data?.message || "Invalid or already applied coupon");
        }
        setActionLoading(false);
    }

    useEffect(() => { fetchCartAndSummary(); }, []);

    return (
        <div className="cart-page-shell" style={{ minHeight: "100vh", boxSizing: 'border-box', maxWidth: '100vw', position: 'relative' }}>
            {/* Spinner Overlay for Loading States */}
            {(loading || actionLoading) && <Spinner />}
            {/* Header Section */}
            <div className="py-5 text-center shadow-sm cart-hero-band">
                <h2 className="text-white font-weight-bold mb-1">Shopping Cart</h2>
                <p className="text-white-50 mb-2">Luxury picks, ready for checkout</p>
                <nav className="small mt-1"><Link to="/" className="text-info">Home</Link> <span className="text-white-50">/ Cart</span></nav>
            </div>

            <div className="container py-5">
                {userMissing ? (
                    <div className="text-center py-5">
                        <span className="text-danger">Please login to view your cart.</span>
                    </div>
                ) : loading ? (
                    <div className="text-center py-5"><span>Loading...</span></div>
                ) : cart && cart.length > 0 ? (
                    <div className="row">
                        {/* Cart Items List */}
                        <div className="col-lg-8 col-12 mb-4 mb-lg-0">
                            <div className="cart-premium-intro mb-3">
                                <div>
                                    <p className="intro-label mb-1">Your Bag</p>
                                    <h4 className="intro-title mb-0">{itemCount} curated item{itemCount !== 1 ? 's' : ''}</h4>
                                </div>
                                <div className="intro-value">₹{subtotal}</div>
                            </div>
                            <div className="d-none d-md-flex row border-bottom pb-2 mb-3 text-muted small font-weight-bold px-3">
                                <div className="col-5">PRODUCT</div>
                                <div className="col-2 text-center">PRICE</div>
                                <div className="col-3 text-center">QUANTITY</div>
                                <div className="col-2 text-right">TOTAL</div>
                            </div>
                            <AnimatePresence>
                                {cart.map((item) => {
                                    const itemId = item._id || item.id;
                                    const itemName = item.name || item.product?.name || 'Product';
                                    const itemColor = item.color || item.product?.color || 'N/A';
                                    const itemSize = item.size || item.product?.size || 'N/A';
                                    const itemPic = item.pic || item.product?.pic1 || '/assets/images/noimage.png';
                                    const itemQty = Number(item.quantity ?? item.qty ?? 1);
                                    const itemPrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0);
                                    const itemTotal = itemPrice * itemQty;
                                    const isMoving = movingIds.includes(itemId);

                                    return (
                                    <motion.div
                                        key={itemId}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: 200 }}
                                        transition={{ duration: 0.35 }}
                                        className="cart-premium-row bg-white p-3 mb-3 border-0 rounded-lg shadow-sm position-relative"
                                        style={removingIds.includes(itemId) ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                                    >
                                        <button
                                            key={itemId + '-remove-top'}
                                            onClick={() => removeProduct(itemId)}
                                            className="btn btn-link p-0 premium-x-btn premium-x-top"
                                            title="Remove"
                                            disabled={isMoving}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#fff4f4"/><path d="M7 7l6 6M13 7l-6 6" stroke="#d9534f" strokeWidth="2" strokeLinecap="round"/></svg>
                                        </button>
                                        <div className="d-flex align-items-center premium-cart-grid">
                                            {/* Product Image - Fixed Aspect Ratio, Fully Rounded */}
                                            <div className="cart-img-col d-flex align-items-center justify-content-center" style={{ minWidth: 90, minHeight: 90 }}>
                                                <div style={{ width: 90, height: 90, aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                                    <img src={optimizeCloudinaryUrlAdvanced(itemPic, { maxWidth: 240, crop: 'fill' })}
                                                        loading="lazy"
                                                        decoding="async"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                        alt=""
                                                        key={itemId + '-img'}
                                                    />
                                                </div>
                                            </div>
                                            {/* Product Details */}
                                            <div className="cart-details-col flex-grow-1 px-3">
                                                <h6 className="mb-1 font-weight-bold text-dark" key={itemId + '-name'}>{itemName}</h6>
                                                <div className="small text-muted mb-1" key={itemId + '-color'}>{itemColor} | Size: {itemSize}</div>
                                                <div className="d-flex align-items-center mt-2 cart-action-row">
                                                    <button
                                                        key={itemId + '-wishlist'}
                                                        onClick={() => moveToWishlist(item)}
                                                        className="btn btn-sm premium-wishlist-btn mr-2"
                                                        disabled={isMoving}
                                                    >
                                                        {isMoving ? 'Moving...' : 'Move to Wishlist'}
                                                    </button>
                                                    <span className="badge premium-id-pill px-2 py-1" key={itemId + '-badge'}>SKU: {itemId}</span>
                                                </div>
                                            </div>
                                            {/* Quantity & Price */}
                                            <div className="cart-qtyprice-col d-flex flex-column align-items-center justify-content-center">
                                                <div className="d-flex align-items-center mb-1 premium-qty-line">
                                                    <div className="d-flex align-items-center premium-qty-wrap mr-2">
                                                    <button key={itemId + '-dec'} onClick={() => updateQty(item, "dec")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn" disabled={isMoving}>−</button>
                                                    <span className="mx-2 font-weight-bold premium-qty-count" style={{ minWidth: "30px" }} key={itemId + '-qty'}>{itemQty}</span>
                                                    <button key={itemId + '-inc'} onClick={() => updateQty(item, "inc")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn" disabled={isMoving}>+</button>
                                                    </div>
                                                    <div className="font-weight-bold text-info premium-live-price" key={itemId + '-price'}>₹{itemTotal}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                            <div className="mt-4">
                                <Link to="/shop/All" className="btn btn-outline-dark rounded-pill px-4 btn-sm">← Back to Shop</Link>
                            </div>
                        </div>
                        {/* Order Summary Sidebar */}
                        <div className="col-lg-4 col-12 mt-0 mt-lg-0">
                            <div className="card border-0 p-4 bg-white sticky-top premium-summary-card" style={{ top: "100px", border: "1px solid #eee" }}>
                                <h5 className="font-weight-bold mb-4" style={{ color: "#B8860B", letterSpacing: 1 }}>Order Summary</h5>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Subtotal (MRP)</span>
                                    <span className="font-weight-bold" style={{ color: "#B8860B" }}>₹{subtotal}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Instant Discount</span>
                                    <span className="text-success font-weight-bold" style={{ color: "#B8860B" }}>-₹{totalDiscount}</span>
                                </div>
                                {couponApplied && couponDiscount > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Coupon ({coupon.toUpperCase()})</span>
                                        <span className="text-success font-weight-bold">-₹{couponDiscount}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Shipping Fee</span>
                                    <span className={shipping === 0 ? "text-success font-weight-bold" : "font-weight-bold"} style={{ color: shipping === 0 ? "#B8860B" : undefined }}>
                                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">GST/Tax (5%)</span>
                                    <span className="font-weight-bold" style={{ color: "#B8860B" }}>₹{gst}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-3 border-top pt-3">
                                    <h5 className="font-weight-bold">Grand Total</h5>
                                    <h5 className="font-weight-bold" style={{ color: "#B8860B" }}>₹{subtotal - totalDiscount + shipping + gst}</h5>
                                </div>
                                {/* Coupon Input */}
                                <div className="input-group mb-3 premium-coupon-group">
                                    <input type="text" className="form-control" placeholder="Apply Coupon" value={coupon} onChange={e => setCoupon(e.target.value)} disabled={couponApplied}
                                        style={{ border: "1px solid #eee", borderRight: 0, borderRadius: "50px 0 0 50px" }} />
                                    <div className="input-group-append">
                                        <button className="btn" style={{ border: "1px solid #eee", borderLeft: 0, borderRadius: "0 50px 50px 0", background: "#B8860B", color: "#fff" }} type="button" onClick={handleApplyCoupon} disabled={couponApplied || !coupon.trim()}>Apply</button>
                                    </div>
                                </div>
                                {couponError && <div className="text-danger small mb-2">{couponError}</div>}
                                {couponApplied && <div className="text-success small mb-2">Coupon Applied!</div>}
                                {/* Sticky Checkout Button for Mobile */}
                                <Link to="/checkout" className="btn btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold premium-checkout-btn mt-2 sticky-mobile-checkout" style={{ background: "linear-gradient(90deg, #B8860B 0%, #f6e27a 100%)", color: "#222", border: "none", letterSpacing: 1 }}>
                                    {`PROCEED TO CHECKOUT (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
                                </Link>
                                {/* Security Badges */}
                                <div className="text-center mt-4">
                                    <div className="d-flex flex-column align-items-center">
                                        <div className="d-flex align-items-center mb-2">
                                            <img src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png" alt="secure" width="28" height="28" style={{marginRight:8}} />
                                            <span className="small font-weight-bold text-success">Secure Checkout</span>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="original" width="28" height="28" style={{marginRight:8}} />
                                            <span className="small font-weight-bold text-primary">100% Original Products</span>
                                        </div>
                                    </div>
                                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/AM_mc_vs_dc_ae.jpg" width="100%" style={{ opacity: 0.6, filter: "grayscale(1)" }} alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-5 bg-white shadow-sm rounded-lg">
                        <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" width="150" alt="empty-cart" className="mb-4 opacity-50" />
                        <h3 className="text-muted">Your cart is feeling lonely!</h3>
                        <Link to="/shop/All" className="btn btn-info mt-4 px-5 rounded-pill shadow">Explore Products</Link>
                    </div>
                )}
            </div>
            {/* Custom Styling */}
            <style dangerouslySetInnerHTML={{ __html: `
                /* Checkbox scale fix */
                input[type="checkbox"] { width: 18px !important; height: 18px !important; }
                .cart-page-shell {
                    background:
                        radial-gradient(circle at 2% 2%, rgba(191, 219, 254, 0.2), transparent 30%),
                        radial-gradient(circle at 98% 4%, rgba(253, 230, 138, 0.22), transparent 30%),
                        linear-gradient(180deg, #f5f7fa 0%, #edf1f5 100%);
                }
                .cart-hero-band {
                    background: linear-gradient(120deg, #1f2937, #111827 55%, #374151);
                }
                .cart-premium-intro {
                    border: 1px solid #e7ebf0;
                    border-radius: 16px;
                    padding: 14px 16px;
                    background: linear-gradient(130deg, #ffffff 0%, #f8fafc 100%);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
                }
                .intro-label {
                    color: #64748b;
                    font-size: 12px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    font-weight: 700;
                }
                .intro-title {
                    color: #0f172a;
                    font-size: 1.15rem;
                    font-weight: 800;
                }
                .intro-value {
                    background: linear-gradient(90deg, #0ea5b7, #0284c7);
                    color: #ffffff;
                    border-radius: 999px;
                    padding: 8px 14px;
                    font-weight: 800;
                    font-size: 0.95rem;
                    box-shadow: 0 6px 14px rgba(2, 132, 199, 0.28);
                }
                /* Sticky checkout button for mobile */
                @media (max-width: 767.98px) {
                    .sticky-mobile-checkout {
                        position: fixed !important;
                        left: 0; right: 0; bottom: 0; z-index: 1002;
                        border-radius: 0 !important;
                        width: 100vw !important;
                        max-width: 100vw !important;
                        margin: 0 !important;
                        box-shadow: 0 -2px 16px #e5e5e5 !important;
                    }
                    .premium-summary-card { margin-bottom: 80px !important; }
                }
                @media (max-width: 991.98px) {
                    .premium-summary-card { margin-top: 32px !important; position: static !important; }
                }
                .rounded-lg { border-radius: 1.5rem !important; }
                .hover-shadow:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; }
                .transition-all { transition: all 0.3s ease; }
                .rounded-pill { border-radius: 50px !important; }
                .btn-info { background-color: #17a2b8; border-color: #17a2b8; }
                .btn-info:hover { background-color: #138496; border-color: #117a8b; transform: translateY(-2px); }
                .cart-premium-row {
                    border-radius: 1.25rem !important;
                    border: 1px solid #e7ebf0 !important;
                    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06) !important;
                    background: linear-gradient(145deg, #ffffff 0%, #f9fbfd 100%);
                    padding-right: 42px !important;
                }
                .premium-cart-grid { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
                .cart-img-col { flex: 0 0 90px; min-width: 90px; min-height: 90px; }
                .cart-details-col { min-width: 180px; }
                .cart-qtyprice-col { min-width: 140px; margin-right: 8px; }
                .premium-wishlist-btn { border: 1px solid #b9963a; color: #7a5c1f; background: linear-gradient(90deg, #fff8e1, #fef3c7); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
                .premium-wishlist-btn:hover { background: #f9edc8; color: #5f4717; }
                .premium-id-pill { background: linear-gradient(120deg, #f3f4f6, #e9ecef); color: #556; border: 1px dashed #c8ced7; border-radius: 999px; font-weight: 700; font-size: 11px; }
                .premium-id-pill { max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
                .premium-x-btn svg { transition: box-shadow 0.2s; border-radius: 50%; }
                .premium-x-btn:hover svg { box-shadow: 0 2px 8px #f8d7da; background: #fff0f0; }
                .premium-x-top { position: absolute; top: 12px; right: 12px; z-index: 5; }
                .premium-qty-wrap { background: linear-gradient(145deg, #ffffff, #f8fafc); border: 1px solid #e5eaf0; border-radius: 999px; padding: 4px 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9); }
                .premium-qty-line { gap: 8px; }
                .premium-qty-count { text-align: center; color: #1f2937; }
                .premium-live-price { font-size: 1.2rem; line-height: 1; }
                .premium-qty-btn { width: 30px; height: 30px; font-size: 19px; background: #ffffff; color: #333; }
                .premium-qty-btn:hover { background: #e2e6ea; }
                .premium-wishlist-btn:disabled, .premium-qty-btn:disabled, .premium-x-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                .premium-summary-card {
                    border-radius: 1.4rem !important;
                    border: 1px solid #e7ebf0 !important;
                    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08) !important;
                    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
                }
                .premium-coupon-group input { border-radius: 50px 0 0 50px !important; }
                .premium-coupon-group .btn { border-radius: 0 50px 50px 0 !important; }
                .premium-checkout-btn { background: linear-gradient(90deg, #b19d5e 0%, #f6e27a 100%); color: #222; border: none; letter-spacing: 1px; }
                .premium-checkout-btn:hover { background: linear-gradient(90deg, #f6e27a 0%, #b19d5e 100%); color: #111; transform: translateY(-2px); }
                @media (max-width: 767.98px) {
                    .premium-cart-grid { align-items: flex-start; }
                    .cart-details-col { width: calc(100% - 102px); min-width: 0; padding-right: 4px !important; }
                    .cart-qtyprice-col { width: 100%; margin-left: 102px; align-items: center !important; }
                    .cart-premium-row { padding-right: 36px !important; }
                    .premium-x-top { top: 8px; right: 8px; }
                    .cart-action-row { flex-wrap: wrap; gap: 6px; }
                    .premium-id-pill { max-width: 140px; }
                    .premium-wishlist-btn { padding: 4px 10px; font-size: 11px; }
                    .cart-qtyprice-col { margin-top: 6px; }
                    .premium-qty-line { width: 100%; justify-content: center; }
                    .cart-premium-intro { padding: 12px; }
                    .intro-title { font-size: 1rem; }
                    .intro-value { font-size: 0.85rem; padding: 7px 12px; }
                }
            `}} />
        </div>
    );
}