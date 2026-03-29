
import React, { useState, useEffect } from 'react';
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
    const [discount, setDiscount] = useState(0);
    const [gst, setGst] = useState(0);
    const [coupon, setCoupon] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // For update/remove/coupon
    const userId = localStorage.getItem("userid");
    const [userMissing, setUserMissing] = useState(false);

    async function fetchCartAndSummary() {
        if (!userId) {
            setUserMissing(true);
            setSubtotal(0);
            setDiscount(0);
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
            setDiscount(s.discount || 0);
            setShipping(s.shipping || 0);
            setGst(s.gst || 0);
        } catch (e) {
            setSubtotal(0);
            setDiscount(0);
            setShipping(0);
            setGst(0);
        }
        setLoading(false);
    }

    async function updateQty(item, op) {
        let currentQty = Number(item.quantity);
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

    async function removeProduct(id) {
        if (window.confirm("Remove this item?")) {
            setRemovingIds((prev) => [...prev, id]);
            setActionLoading(true);
            setTimeout(async () => {
                try {
                    await axios.delete(`/api/cart/remove-item/${id}`, { data: { userId } });
                    await fetchCartAndSummary();
                    toast.info('Item removed from cart.');
                } catch (e) {
                    toast.error('Failed to remove item.');
                } finally {
                    setRemovingIds((prev) => prev.filter(rid => rid !== id));
                    setActionLoading(false);
                }
            }, 350); // match animation duration
        }
    }


    // Save for Later (moves to Wishlist collection in DB)
    const { addWishlist } = require("../Store/ActionCreaters/WishlistActionCreators");
    async function saveForLater(item) {
        setActionLoading(true);
        try {
            // Add to wishlist in DB
            await axios.post('/wishlist', {
                userid: userId,
                productid: item.productid || item.product?._id || item.product || item._id || item.id,
                name: item.name,
                color: item.color,
                size: item.size,
                price: item.price,
                pic: item.pic
            });
            // Remove from cart
            await removeProduct(item._id || item.id);
            toast.success('Saved for later!');
        } catch (e) {
            toast.error('Failed to save for later.');
        }
        setActionLoading(false);
    }

    async function handleApplyCoupon() {
        if (!coupon || couponApplied) return;
        setCouponError("");
        setActionLoading(true);
        try {
            const res = await axios.post('/api/cart/apply-coupon', { userId, coupon });
            if (res.data && res.data.success) {
                setDiscount((prev) => prev + (res.data.discount || 0));
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
        <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh", boxSizing: 'border-box', maxWidth: '100vw', position: 'relative' }}>
            {/* Spinner Overlay for Loading States */}
            {(loading || actionLoading) && <Spinner />}
            {/* Header Section */}
            <div className="py-5 bg-dark text-center shadow-sm">
                <h2 className="text-white font-weight-bold mb-0">Shopping Cart</h2>
                <nav className="small mt-2"><Link to="/" className="text-info">Home</Link> <span className="text-white-50">/ Cart</span></nav>
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
                            <div className="d-none d-md-flex row border-bottom pb-2 mb-3 text-muted small font-weight-bold px-3">
                                <div className="col-5">PRODUCT</div>
                                <div className="col-2 text-center">PRICE</div>
                                <div className="col-3 text-center">QUANTITY</div>
                                <div className="col-2 text-right">TOTAL</div>
                            </div>
                            <AnimatePresence>
                                {cart.map((item) => (
                                    <motion.div
                                        key={item._id || item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: 200 }}
                                        transition={{ duration: 0.35 }}
                                        className="cart-premium-row bg-white p-3 mb-3 border-0 rounded-lg shadow-sm"
                                        style={removingIds.includes(item._id || item.id) ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                                    >
                                        <div className="d-flex align-items-center premium-cart-grid">
                                            {/* Product Image - Fixed Aspect Ratio, Fully Rounded */}
                                            <div className="cart-img-col d-flex align-items-center justify-content-center" style={{ minWidth: 90, minHeight: 90 }}>
                                                <div style={{ width: 90, height: 90, aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                                    <img src={item.pic ? optimizeCloudinaryUrlAdvanced(item.pic, { maxWidth: 240, crop: 'fill' }) : "/assets/images/noimage.png"}
                                                        loading="lazy"
                                                        decoding="async"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                        alt=""
                                                        key={item._id || item.id + '-img'}
                                                    />
                                                </div>
                                            </div>
                                            {/* Product Details */}
                                            <div className="cart-details-col flex-grow-1 px-3">
                                                <h6 className="mb-1 font-weight-bold text-dark" key={item._id || item.id + '-name'}>{item.name}</h6>
                                                <div className="small text-muted mb-1" key={item._id || item.id + '-color'}>{item.color} | Size: {item.size}</div>
                                                <div className="d-flex align-items-center mt-2">
                                                    <button key={item._id || item.id + '-save'} onClick={() => saveForLater(item)} className="btn btn-link btn-sm text-primary p-0 mr-2">Save for Later</button>
                                                    <button key={item._id || item.id + '-wishlist'} onClick={() => addWishlist(item)} className="btn btn-link btn-sm text-warning p-0 mr-2">Move to Wishlist (Local)</button>
                                                    <span className="badge badge-light border px-2 py-1 ml-2" key={item._id || item.id + '-badge'}>ID: {item._id || item.id}</span>
                                                </div>
                                            </div>
                                            {/* Quantity & Price */}
                                            <div className="cart-qtyprice-col d-flex flex-column align-items-end">
                                                <div className="d-flex align-items-center mb-2">
                                                    <button key={item._id || item.id + '-dec'} onClick={() => updateQty(item, "dec")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn">−</button>
                                                    <span className="mx-2 font-weight-bold" style={{ minWidth: "24px" }} key={item._id || item.id + '-qty'}>{item.quantity}</span>
                                                    <button key={item._id || item.id + '-inc'} onClick={() => updateQty(item, "inc")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn">+</button>
                                                </div>
                                                <div className="font-weight-bold text-info mb-1" key={item._id || item.id + '-price'}>₹{item.product?.price || item.price}</div>
                                                <div className="text-muted small" key={item._id || item.id + '-total'}>Total: ₹{(item.product?.price || item.price) * item.quantity}</div>
                                            </div>
                                            {/* Delete Icon */}
                                            <div className="cart-delete-col ml-3">
                                                <button key={item._id || item.id + '-remove'} onClick={() => removeProduct(item._id || item.id)} className="btn btn-link p-0 premium-x-btn" title="Remove">
                                                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#f8f9fa"/><path d="M7 7l6 6M13 7l-6 6" stroke="#d9534f" strokeWidth="2" strokeLinecap="round"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
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
                                    <span className="text-success font-weight-bold" style={{ color: "#B8860B" }}>-₹{discount}</span>
                                </div>
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
                                    <h5 className="font-weight-bold" style={{ color: "#B8860B" }}>₹{subtotal - discount + shipping + gst}</h5>
                                </div>
                                {/* Coupon Input */}
                                <div className="input-group mb-3 premium-coupon-group">
                                    <input type="text" className="form-control" placeholder="Apply Coupon" value={coupon} onChange={e => setCoupon(e.target.value)} disabled={couponApplied}
                                        style={{ border: "1px solid #eee", borderRight: 0, borderRadius: "50px 0 0 50px" }} />
                                    <div className="input-group-append">
                                        <button className="btn" style={{ border: "1px solid #eee", borderLeft: 0, borderRadius: "0 50px 50px 0", background: "#B8860B", color: "#fff" }} type="button" onClick={handleApplyCoupon} disabled={couponApplied}>Apply</button>
                                    </div>
                                </div>
                                {couponError && <div className="text-danger small mb-2">{couponError}</div>}
                                {couponApplied && <div className="text-success small mb-2">Coupon Applied!</div>}
                                {/* Sticky Checkout Button for Mobile */}
                                <Link to="/checkout" className="btn btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold premium-checkout-btn mt-2 sticky-mobile-checkout" style={{ background: "linear-gradient(90deg, #B8860B 0%, #f6e27a 100%)", color: "#222", border: "none", letterSpacing: 1 }}>
                                    {`PROCEED TO CHECKOUT (${cart.reduce((acc, item) => acc + Number(item.quantity), 0)} item${cart.reduce((acc, item) => acc + Number(item.quantity), 0) !== 1 ? 's' : ''})`}
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
                .cart-premium-row { border-radius: 1.2rem !important; box-shadow: 0 2px 12px #f3f3f3 !important; }
                .premium-cart-grid { display: flex; flex-wrap: wrap; align-items: center; }
                .cart-img-col { flex: 0 0 90px; min-width: 90px; min-height: 90px; }
                .cart-details-col { min-width: 180px; }
                .cart-qtyprice-col { min-width: 120px; }
                .cart-delete-col { min-width: 40px; }
                .premium-x-btn svg { transition: box-shadow 0.2s; border-radius: 50%; }
                .premium-x-btn:hover svg { box-shadow: 0 2px 8px #f8d7da; background: #fff0f0; }
                .premium-qty-btn { width: 32px; height: 32px; font-size: 20px; background: #f8f9fa; color: #333; }
                .premium-qty-btn:hover { background: #e2e6ea; }
                .premium-summary-card { border-radius: 1.5rem !important; box-shadow: 0 4px 24px #f3f3f3 !important; }
                .premium-coupon-group input { border-radius: 50px 0 0 50px !important; }
                .premium-coupon-group .btn { border-radius: 0 50px 50px 0 !important; }
                .premium-checkout-btn { background: linear-gradient(90deg, #b19d5e 0%, #f6e27a 100%); color: #222; border: none; letter-spacing: 1px; }
                .premium-checkout-btn:hover { background: linear-gradient(90deg, #f6e27a 0%, #b19d5e 100%); color: #111; transform: translateY(-2px); }
            `}} />
        </div>
    );
}