
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { useSelector, useDispatch } from 'react-redux';
import { getCart } from '../Store/ActionCreaters/CartActionCreators';
import { GET_CART_RED } from '../Store/Constant';
import { useToast } from './ToastNotification';
import axios from 'axios';
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants';
import Spinner from './Spinner';
import io from 'socket.io-client';
axios.defaults.baseURL = BASE_URL;

export default function Cart() {
    const dispatch = useDispatch();
    const socketRef = useRef(null);
    const cartState = useSelector(state => state.CartStateData);
    // Filter out duplicate items by _id to ensure unique React keys
    const cartRaw = cartState && cartState.items ? cartState.items : [];
    const cart = Array.isArray(cartRaw)
        ? cartRaw.filter((item, idx, arr) =>
            item && item._id && arr.findIndex(i => i && i._id === item._id) === idx)
        : [];
    const savedRaw = cartState && cartState.savedItems ? cartState.savedItems : [];
    const savedItems = Array.isArray(savedRaw)
        ? savedRaw.filter((item, idx, arr) =>
            item && item._id && arr.findIndex(i => i && i._id === item._id) === idx)
        : [];
    const [removingIds, setRemovingIds] = useState([]);
    // For live green indicator
    const [cartNotifications, setCartNotifications] = useState({});
    const toast = useToast();
    const [subtotal, setSubtotal] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [baseDiscount, setBaseDiscount] = useState(0);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [gst, setGst] = useState(0);
    const [coupon, setCoupon] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);
    const [appliedCouponCode, setAppliedCouponCode] = useState("");
    const [couponError, setCouponError] = useState("");
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [loading, setLoading] = useState(true); // legacy, for full page
    const [cartLoading, setCartLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [couponLoading, setCouponLoading] = useState(true);
    const [movingIds, setMovingIds] = useState([]);
    const [savingIds, setSavingIds] = useState([]);
    const [savedActionIds, setSavedActionIds] = useState([]);
    const [deliveryPincode, setDeliveryPincode] = useState('');
    const [deliveryEstimateMsg, setDeliveryEstimateMsg] = useState('');
    const [deliveryEstimateError, setDeliveryEstimateError] = useState('');
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const userId = localStorage.getItem("userid");
    const [userMissing, setUserMissing] = useState(false);
    const totalDiscount = Number(baseDiscount) + Number(couponDiscount);

    const itemCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + Number(item.quantity ?? item.qty ?? 1), 0);
    }, [cart]);

    // Parallel fetch for cart, summary, coupons
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
        setLoading(false); // never block full page
        setCartLoading(true);
        setSummaryLoading(true);
        setCouponLoading(true);
        // Redux fetch (shows cart instantly)
        await dispatch(getCart());
        // Parallel API fetch
        await Promise.all([
            (async () => {
                try {
                    const cartRes = await axios.get(`/api/cart?userId=${userId}`);
                    // Delivery estimate should NOT auto-show on page load
                    setDeliveryPincode('');
                    setDeliveryEstimateMsg('');
                } catch {
                    setDeliveryEstimateMsg('');
                }
                setCartLoading(false);
            })(),
            (async () => {
                try {
                    const summaryRes = await axios.get(`/api/cart/order-summary?userId=${userId}`);
                    const s = summaryRes.data.summary || {};
                    setSubtotal(s.subtotal || 0);
                    setBaseDiscount(s.discount || 0);
                    setShipping(s.shipping || 0);
                    setGst(s.gst || 0);
                } catch {
                    setSubtotal(0);
                    setBaseDiscount(0);
                    setShipping(0);
                    setGst(0);
                }
                setSummaryLoading(false);
            })(),
            (async () => {
                try {
                    const res = await axios.get('/api/cart/coupons', { params: { userId } });
                    const list = res?.data?.coupons;
                    setAvailableCoupons(Array.isArray(list) ? list : []);
                } catch {
                    setAvailableCoupons([]);
                }
                setCouponLoading(false);
            })()
        ]);
    }

    async function refreshSummaryOnly() {
        if (!userId) return;
        try {
            const summaryRes = await axios.get(`/api/cart/order-summary?userId=${userId}`);
            const s = summaryRes.data.summary || {};
            setSubtotal(s.subtotal || 0);
            setBaseDiscount(s.discount || 0);
            setShipping(s.shipping || 0);
            setGst(s.gst || 0);
        } catch (e) {
            // Keep existing totals on transient failure to avoid UI flicker.
        }
    }

    function syncCartFromResponse(responseData) {
        const cartData = responseData?.cart;
        if (!cartData) return;
        dispatch({ type: GET_CART_RED, data: cartData });
        // Do NOT auto-show delivery estimate after cart actions
        setDeliveryPincode('');
        setDeliveryEstimateMsg('');
    }
    // Clear delivery estimate on mount/unmount (refresh or navigation)
    useEffect(() => {
        setDeliveryEstimateMsg('');
        setDeliveryEstimateError('');
        setDeliveryPincode('');
        // On unmount, clear as well
        return () => {
            setDeliveryEstimateMsg('');
            setDeliveryEstimateError('');
            setDeliveryPincode('');
        };
    }, []);

    async function saveForLater(item) {
        const itemId = item._id || item.id;
        if (!userId) {
            toast.error('Please login first.');
            return;
        }
        setSavingIds((prev) => [...prev, itemId]);
        try {
            const res = await axios.post(`/api/cart/save-for-later/${itemId}`, { userId, size: item.size, color: item.color });
            syncCartFromResponse(res.data);
            await refreshSummaryOnly();
            toast.success('Item saved for later.');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to save item for later.');
        } finally {
            setSavingIds((prev) => prev.filter((id) => id !== itemId));
        }
    }

    async function moveSavedToCart(item) {
        const itemId = item._id || item.id;
        if (!userId) {
            toast.error('Please login first.');
            return;
        }
        setSavedActionIds((prev) => [...prev, itemId]);
        try {
            const res = await axios.post(`/api/cart/move-saved-to-cart/${itemId}`, { userId, size: item.size, color: item.color });
            syncCartFromResponse(res.data);
            await refreshSummaryOnly();
            // Show live green indicator instantly
            setCartNotifications((prev) => ({ ...prev, [item.productid || item._id || item.id]: (prev[item.productid || item._id || item.id] || 0) + 1 }));
            setTimeout(() => {
                setCartNotifications((prev) => {
                    const copy = { ...prev };
                    delete copy[item.productid || item._id || item.id];
                    return copy;
                });
            }, 2000);
            toast.success('Saved item moved to cart.');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to move item to cart.');
        } finally {
            setSavedActionIds((prev) => prev.filter((id) => id !== itemId));
        }
    }

    async function removeSavedItem(item) {
        const itemId = item._id || item.id;
        if (!userId) {
            toast.error('Please login first.');
            return;
        }
        setSavedActionIds((prev) => [...prev, itemId]);
        try {
            const res = await axios.delete(`/api/cart/remove-saved-item/${itemId}`, {
                params: { userId },
                data: { userId }
            });
            syncCartFromResponse(res.data);
            await refreshSummaryOnly();
            toast.info('Saved item removed.');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to remove saved item.');
        } finally {
            setSavedActionIds((prev) => prev.filter((id) => id !== itemId));
        }
    }

    async function applyDeliveryEstimate() {
        if (!userId) {
            setDeliveryEstimateError('Please login to check delivery estimate.');
            return;
        }
        if (!/^\d{6}$/.test(String(deliveryPincode || '').trim())) {
            setDeliveryEstimateError('Please enter a valid 6-digit pincode.');
            setDeliveryEstimateMsg('');
            return;
        }
        try {
            setDeliveryLoading(true);
            setDeliveryEstimateError('');
            const res = await axios.post('/api/cart/delivery-estimate', {
                userId,
                pincode: String(deliveryPincode).trim(),
            });
            const label = res?.data?.estimate?.label || res?.data?.message || '';
            setDeliveryEstimateMsg(label);
            setDeliveryPincode(''); // Clear input field after successful check
            if (label) toast.success(label);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Could not fetch delivery estimate.';
            setDeliveryEstimateError(msg);
            setDeliveryEstimateMsg('');
        } finally {
            setDeliveryLoading(false);
        }
    }

    async function updateQty(item, op) {
        let currentQty = Number(item.quantity ?? item.qty ?? 1);
        if (op === "dec" && currentQty === 1) return;
        let newQty = (op === "dec") ? currentQty - 1 : currentQty + 1;
        
        console.log(`📊 Updating qty for ${item._id}: ${currentQty} → ${newQty}`);
        
        // Always use HTTP directly (most reliable)
        try {
            await axios.put(`/api/cart/update-quantity/${item._id || item.id}`, { userId, quantity: newQty });
            console.log('✅ Quantity updated via HTTP');
            await dispatch(getCart());
            await refreshSummaryOnly();
            toast.success('Quantity updated!');
            // Also try to sync via socket if available
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('cart:recalculate', { userId });
            }
        } catch (e) {
            console.error('❌ Quantity update failed:', e.message);
            if (e.response?.data?.message?.includes('Out of Stock')) {
                toast.error(e.response.data.message);
            } else {
                toast.error('Failed to update quantity.');
            }
        }
    }

    async function removeProduct(id, silent = false) {
        setRemovingIds((prev) => [...prev, id]);
        console.log(`🗑️ Removing item: ${id}`);

        // Always use HTTP directly (most reliable)
        try {
            await axios.delete(`/api/cart/remove-item/${id}`, {
                params: { userId, userid: userId },
                data: { userId, userid: userId }
            });
            console.log('✅ Item removed via HTTP');
            await dispatch(getCart());
            await refreshSummaryOnly();
            if (!silent) toast.info('Item removed from cart.');
            // Also try to sync via socket if available
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('cart:recalculate', { userId });
            }
        } catch (e) {
            console.error('❌ Remove failed:', e.message);
            const msg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to remove item.';
            toast.error(msg);
        } finally {
            setRemovingIds((prev) => prev.filter(rid => rid !== id));
        }

        return Promise.resolve();
    }

    async function moveToWishlist(item) {
        const itemId = item._id || item.id;
        const user = userId || localStorage.getItem('userid');
        const product = item.productid || item.product?._id || item.product || itemId;
        if (!user) {
            toast.error('Please login first.');
            return;
        }
        setMovingIds((prev) => [...prev, itemId]);
        try {
            // Try to get all product data, fetch if missing
            let name = item.name || item.product?.name || '';
            let pic = item.pic || item.product?.pic1 || '';
            let price = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0);
            let size = item.size || item.product?.size || '';
            let color = item.color || item.product?.color || '';
            // If any important field is missing, fetch product details
            if (!name || !pic || !price) {
                try {
                    const res = await axios.get(`/product/${product}`);
                    const prod = res.data;
                    console.log('Fetched product for wishlist:', prod);
                    name = name || prod.name || 'Product';
                    pic = pic || prod.pic1 || '/assets/images/noimage.png';
                    price = price || prod.finalprice || prod.price || 0;
                } catch (err) {
                    // Fallback if fetch fails
                    name = name || 'Product';
                    pic = pic || '/assets/images/noimage.png';
                    price = price || 0;
                }
            }
            await axios.post('/api/wishlist', {
                user,
                product,
                size,
                color,
                price,
                pic,
                name,
                quantity: item.quantity || item.qty || 1
            });
            await removeProduct(itemId, true);
            await refreshSummaryOnly();
            toast.success('Moved to wishlist successfully.');
        } catch (e) {
            toast.error('Failed to move item to wishlist.');
        } finally {
            setMovingIds((prev) => prev.filter((id) => id !== itemId));
        }
    }

    async function handleApplyCoupon() {
        const normalizedCoupon = String(coupon || '').trim().toUpperCase();
        if (!normalizedCoupon) return;
        setCouponError("");
        // If same coupon is already applied, show notification
        if (couponApplied && appliedCouponCode && normalizedCoupon === appliedCouponCode) {
            toast.info('This coupon is already applied.');
            setCouponError('This coupon is already applied.');
            return;
        }
        try {
            // If a different coupon is already applied, remove it first (backend will handle replace)
            const res = await axios.post('/api/cart/apply-coupon', { userId, coupon: normalizedCoupon });
            if (res.data && res.data.success) {
                setCouponDiscount(res.data.discount || 0);
                setCouponApplied(true);
                setAppliedCouponCode(normalizedCoupon);
                setCoupon('');
                setCouponError("");
                toast.success('Coupon applied successfully!');
                localStorage.setItem('appliedCoupon', JSON.stringify({
                    userId,
                    code: normalizedCoupon,
                    discount: Number(res.data.discount || 0)
                }));
            } else {
                setCouponError(res.data.message || "Invalid coupon");
                toast.error(res.data.message || "Invalid coupon");
            }
        } catch (err) {
            localStorage.removeItem('appliedCoupon');
            setCouponError(err.response?.data?.message || "Invalid or already applied coupon");
            toast.error(err.response?.data?.message || "Invalid or already applied coupon");
        }
    }

    async function fetchAvailableCoupons() {
        try {
            const res = await axios.get('/api/cart/coupons', { params: { userId } });
            const list = res?.data?.coupons;
            setAvailableCoupons(Array.isArray(list) ? list : []);
        } catch (err) {
            setAvailableCoupons([]);
        }
    }

    useEffect(() => {
        const savedCouponRaw = localStorage.getItem('appliedCoupon');
        if (savedCouponRaw) {
            try {
                const parsed = JSON.parse(savedCouponRaw);
                if (parsed && String(parsed.userId) === String(userId) && parsed.code) {
                    setCoupon('');
                    setCouponApplied(true);
                    setAppliedCouponCode(String(parsed.code));
                    setCouponDiscount(Number(parsed.discount || 0));
                }
            } catch (e) {
                localStorage.removeItem('appliedCoupon');
            }
        }

        if (!userId) {
            setUserMissing(true);
            setLoading(false);
            return;
        }

        // Set up optional Socket.IO for real-time sync (best effort, HTTP is reliable fallback)
        if (!socketRef.current) {
            try {
                socketRef.current = io(BASE_URL, {
                    auth: { userId },
                    reconnection: true,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 10000,
                    reconnectionAttempts: 2,
                    transports: SOCKET_TRANSPORTS,
                    forceNew: false,
                    timeout: 5000
                });

                // Connection handlers
                socketRef.current.on('connected', (data) => {
                    console.log('✅ Socket connected (bonus real-time):', data);
                });

                socketRef.current.on('connect_error', (error) => {
                    console.warn('⚠️ Socket error (using HTTP fallback):', error.message);
                });

                socketRef.current.on('disconnect', () => {
                    console.log('ℹ️ Socket disconnected (HTTP fallback active)');
                });
            } catch (e) {
                console.error('Socket.IO setup error:', e);
                socketRef.current = null;
            }
        }

        // Initial data fetch with HTTP (reliable)
        fetchCartAndSummary();

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                try {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                } catch (e) {
                    console.error('Socket disconnect error:', e);
                }
            }
        };
    }, [userId]);

    // Listen for cart changes (Redux) and show indicator for new items
    useEffect(() => {
        if (cart && cart.length > 0) {
            cart.forEach((item) => {
                if (item.justAdded) {
                    setCartNotifications((prev) => ({ ...prev, [item._id || item.id]: (prev[item._id || item.id] || 0) + 1 }));
                    setTimeout(() => {
                        setCartNotifications((prev) => {
                            const copy = { ...prev };
                            delete copy[item._id || item.id];
                            return copy;
                        });
                    }, 2000);
                }
            });
        }
    }, [cart]);

    return (
        <motion.div
            className="cart-page-shell"
            style={{ minHeight: "100vh", boxSizing: 'border-box', maxWidth: '100vw', position: 'relative' }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: cartLoading && !cart.length ? 0 : 1, y: cartLoading && !cart.length ? 40 : 0 }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 70 }}
        >
            {/* Skeletons for cart and summary */}
            {cartLoading && !cart.length && (
                <div className="container py-5">
                    <div className="row">
                        <div className="col-lg-8 col-12 mb-4 mb-lg-0">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="cart-premium-row bg-white p-3 mb-3 border-0 rounded-lg shadow-sm position-relative" style={{opacity:0.5}}>
                                    <div className="d-flex align-items-center premium-cart-grid">
                                        <div className="cart-img-col d-flex align-items-center justify-content-center" style={{ minWidth: 90, minHeight: 90 }}>
                                            <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#f3f4f6' }} />
                                        </div>
                                        <div className="cart-details-col flex-grow-1 px-3">
                                            <div className="skeleton-box mb-2" style={{height:18,width:'60%'}} />
                                            <div className="skeleton-box mb-1" style={{height:12,width:'40%'}} />
                                            <div className="skeleton-box mt-2" style={{height:14,width:'50%'}} />
                                        </div>
                                        <div className="cart-qtyprice-col d-flex flex-column align-items-center justify-content-center">
                                            <div className="skeleton-box" style={{height:28,width:80}} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="col-lg-4 col-12 mt-0 mt-lg-0">
                            <div className="card border-0 p-4 bg-white sticky-top premium-summary-card" style={{ top: "100px", border: "1px solid #eee", opacity:0.5 }}>
                                <div className="skeleton-box mb-3" style={{height:28,width:'60%'}} />
                                {[...Array(4)].map((_,i)=>(<div key={i} className="skeleton-box mb-2" style={{height:18,width:'80%'}} />))}
                                <div className="skeleton-box mt-4" style={{height:38,width:'100%'}} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Luxury Header Section */}
            <div className="cart-premium-hero">
                <div className="cart-hero-bg-glow"></div>
                <div className="container position-relative" style={{ zIndex: 1 }}>
                    <div className="row justify-content-center text-center">
                        <div className="col-12 col-md-10 col-lg-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <div className="cart-eyebrow">
                                    <span className="cart-eyebrow-line"></span>
                                    CHECKOUT
                                    <span className="cart-eyebrow-line"></span>
                                </div>
                                <h1 className="cart-title">
                                    Shopping <em>Cart</em>
                                </h1>
                                <p className="cart-desc">
                                    Luxury picks, ready for checkout
                                </p>
                                <nav className="cart-breadcrumb mt-4">
                                    <Link to="/" className="cart-breadcrumb-link">Home</Link>
                                    <span className="cart-breadcrumb-sep">/</span>
                                    <span className="cart-breadcrumb-current">Cart</span>
                                </nav>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container py-5">
                {userMissing ? (
                    <div className="text-center py-5">
                        <span className="text-danger">Please login to view your cart.</span>
                    </div>
                ) : cartLoading && !cart.length ? (
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
                                <div className="col-2 text-right premium-total-head">TOTAL</div>
                            </div>
                            <AnimatePresence>
                                {cart.map((item) => {
                                    const itemId = item._id || item.id;
                                    const itemName = item.name || item.product?.name || 'Product';
                                    const itemColor = item.color || item.product?.color || 'N/A';
                                    // Show only the selected size (not all sizes)
                                    let itemSize = item.size || item.product?.size || 'N/A';
                                    if (Array.isArray(itemSize)) itemSize = itemSize[0] || 'N/A';
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
                                            disabled={isMoving || savingIds.includes(itemId)}
                                        >
                                            <svg className="premium-trash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <path d="M3 6h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                <path d="M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            </svg>
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
                                                <div className="d-flex align-items-center justify-content-between mt-2 cart-action-row-fullwidth">
                                                    <div className="d-flex align-items-center cart-action-row">
                                                        <button
                                                            key={itemId + '-wishlist'}
                                                            onClick={() => moveToWishlist(item)}
                                                            className="btn btn-sm premium-wishlist-btn mr-2"
                                                            disabled={isMoving || savingIds.includes(itemId)}
                                                        >
                                                            {isMoving ? 'Moving...' : 'Move to Wishlist'}
                                                        </button>
                                                        <button
                                                            key={itemId + '-save-later'}
                                                            onClick={() => saveForLater(item)}
                                                            className="btn btn-sm premium-save-btn mr-2"
                                                            disabled={isMoving || savingIds.includes(itemId)}
                                                        >
                                                            {savingIds.includes(itemId) ? 'Saving...' : 'Save for Later'}
                                                        </button>
                                                    </div>
                                                    <div className="d-flex align-items-center premium-qty-line">
                                                        <div className="d-flex align-items-center premium-qty-wrap mr-2">
                                                            <button key={itemId + '-dec'} onClick={() => updateQty(item, "dec")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn" disabled={isMoving}>−</button>
                                                            <span className="mx-2 font-weight-bold premium-qty-count" style={{ minWidth: "30px" }} key={itemId + '-qty'}>{itemQty}</span>
                                                            <button key={itemId + '-inc'} onClick={() => updateQty(item, "inc")} className="btn btn-sm font-weight-bold border rounded-circle premium-qty-btn" disabled={isMoving}>+</button>
                                                        </div>
                                                        <div className="premium-live-price premium-total-price" key={itemId + '-price'}>₹{itemTotal}</div>
                                                        {cartNotifications[item.productid || item._id || item.id] && (
                                                            <motion.div
                                                                className="lux-cbadge"
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0, opacity: 0 }}
                                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                                style={{ marginLeft: 10, background: 'linear-gradient(135deg,#e4f0df 0%,#c6f7e2 100%)', color: '#2d6a1a', fontWeight: 700, fontSize: 12, border: '1px solid #a3e635', borderRadius: 8, padding: '4px 10px', display: 'inline-block' }}
                                                            >
                                                                ✓ Added
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>
                                                {deliveryEstimateMsg && (
                                                    <div className="small mt-2 premium-item-delivery">{deliveryEstimateMsg}</div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                            {savedItems.length > 0 && (
                                <div className="saved-items-wrap mt-4">
                                    <h5 className="saved-items-title mb-3">Saved for Later ({savedItems.length})</h5>
                                    {savedItems.map((item) => {
                                        const itemId = item._id || item.id;
                                        const itemName = item.name || item.product?.name || 'Product';
                                        const itemColor = item.color || item.product?.color || 'N/A';
                                        // Show only the selected size (not all sizes)
                                        let itemSize = item.size || item.product?.size || 'N/A';
                                        if (Array.isArray(itemSize)) itemSize = itemSize[0] || 'N/A';
                                        const itemPic = item.pic || item.product?.pic1 || '/assets/images/noimage.png';
                                        const itemQty = Number(item.quantity ?? item.qty ?? 1);
                                        const itemPrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0);
                                        const isSavedBusy = savedActionIds.includes(itemId);

                                        return (
                                            <div key={itemId} className="saved-item-row d-flex align-items-center justify-content-between p-3 mb-2">
                                                <div className="d-flex align-items-center min-w-0">
                                                    <div className="saved-item-thumb mr-3">
                                                        <img
                                                            src={optimizeCloudinaryUrlAdvanced(itemPic, { maxWidth: 180, crop: 'fill' })}
                                                            loading="lazy"
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-weight-bold text-dark text-truncate">{itemName}</div>
                                                        <div className="small text-muted text-truncate">{itemColor} | Size: {itemSize} | Qty: {itemQty}</div>
                                                        <div className="small font-weight-bold premium-total-price">₹{itemPrice * itemQty}</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center saved-action-row">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm premium-move-cart-btn mr-2"
                                                        onClick={() => moveSavedToCart(item)}
                                                        disabled={isSavedBusy}
                                                    >
                                                        {isSavedBusy ? 'Moving...' : 'Move to Cart'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm premium-remove-saved-btn"
                                                        onClick={() => removeSavedItem(item)}
                                                        disabled={isSavedBusy}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="mt-4">
                                <Link to="/shop/All" className="btn btn-outline-dark rounded-pill px-4 btn-sm">← Back to Shop</Link>
                            </div>
                        </div>
                        {/* Order Summary Sidebar */}
                        <div className="col-lg-4 col-12 mt-0 mt-lg-0">
                            <div className="card border-0 p-4 bg-white sticky-top premium-summary-card" style={{ top: "100px", border: "1px solid #eee" }}>
                                {summaryLoading && (
                                    <div className="skeleton-box mb-3" style={{height:28,width:'60%'}} />
                                )}
                                <h5 className="font-weight-bold mb-4" style={{ color: "#B8860B", letterSpacing: 1 }}>Order Summary</h5>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted premium-summary-label">Subtotal (MRP)</span>
                                    <span className="font-weight-bold premium-summary-amount" style={{ color: "#B8860B" }}>₹{subtotal}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted premium-summary-label">Instant Discount</span>
                                    <span className="text-success font-weight-bold premium-summary-amount" style={{ color: "#B8860B" }}>-₹{totalDiscount}</span>
                                </div>
                                {couponApplied && couponDiscount > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted premium-summary-label">Coupon ({appliedCouponCode || 'APPLIED'})</span>
                                        <span className="text-success font-weight-bold premium-summary-amount">-₹{couponDiscount}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted premium-summary-label">Shipping Fee</span>
                                    <span className={`${shipping === 0 ? "text-success" : ""} font-weight-bold premium-summary-amount`} style={{ color: shipping === 0 ? "#B8860B" : undefined }}>
                                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted premium-summary-label">GST/Tax (5%)</span>
                                    <span className="font-weight-bold premium-summary-amount" style={{ color: "#B8860B" }}>₹{gst}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-3 border-top pt-3">
                                    <h5 className="font-weight-bold premium-grand-label">Grand Total</h5>
                                    <h5 className="font-weight-bold premium-grand-amount" style={{ color: "#B8860B" }}>₹{subtotal - totalDiscount + shipping + gst}</h5>
                                </div>
                                <div className="premium-delivery-box mb-3">
                                    <div className="premium-delivery-title mb-2">Estimated Delivery</div>
                                    <div className="d-flex premium-delivery-row">
                                        <input
                                            type="text"
                                            className="form-control premium-delivery-input"
                                            placeholder="Enter pincode"
                                            maxLength={6}
                                            value={deliveryPincode}
                                            disabled={deliveryLoading}
                                            onChange={(e) => {
                                                const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setDeliveryPincode(onlyDigits);
                                                setDeliveryEstimateError('');
                                            }}
                                        />
                                        <button 
                                            type="button" 
                                            className="btn premium-delivery-btn" 
                                            onClick={applyDeliveryEstimate}
                                            disabled={deliveryLoading || !deliveryPincode || deliveryPincode.length < 6}
                                            style={{ opacity: (deliveryLoading || !deliveryPincode || deliveryPincode.length < 6) ? 0.6 : 1 }}
                                        >
                                            {deliveryLoading ? 'Checking...' : 'Check'}
                                        </button>
                                    </div>
                                    {deliveryEstimateMsg && <div className="premium-delivery-result mt-2">✓ {deliveryEstimateMsg}</div>}
                                    {deliveryEstimateError && <div className="small text-danger mt-2">✗ {deliveryEstimateError}</div>}
                                </div>
                                {/* Coupon Input */}
                                <div className="input-group mb-3 premium-coupon-group">
                                    {couponLoading && <div className="skeleton-box mb-2" style={{height:18,width:'80%'}} />}
                                    <input type="text" className="form-control" placeholder="Apply Coupon" value={coupon} onChange={e => { setCoupon(e.target.value); setCouponError(''); }}
                                        style={{ border: "1px solid #eee", borderRight: 0, borderRadius: "50px 0 0 50px" }} />
                                    <div className="input-group-append">
                                        <button className="btn" style={{ border: "1px solid #eee", borderLeft: 0, borderRadius: "0 50px 50px 0", background: "#B8860B", color: "#fff" }} type="button" onClick={handleApplyCoupon} disabled={!coupon.trim()}>Apply</button>
                                    </div>
                                </div>
                                {availableCoupons.length > 0 && (
                                    <div className="mb-3">
                                        <div className="small text-muted mb-2">Available Coupons</div>
                                        <div className="d-flex flex-wrap gap-2">
                                            {availableCoupons.map((c) => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    className="btn btn-sm premium-coupon-chip"
                                                    title={c.description || c.title || c.code}
                                                    onClick={() => setCoupon(c.code)}
                                                >
                                                    {c.code}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {couponError && <div className="text-danger small mb-2">{couponError}</div>}
                                {couponApplied && <div className="text-success small mb-2">Coupon Applied!</div>}
                                {/* Sticky Checkout Button for Mobile */}
                                <Link to="/checkout" className="btn btn-block btn-lg py-3 rounded-pill shadow-lg font-weight-bold premium-checkout-btn mt-2 sticky-mobile-checkout" style={{ background: "linear-gradient(90deg, #B8860B 0%, #f6e27a 100%)", color: "#222", border: "none", letterSpacing: 1 }}>
                                    {`PROCEED TO CHECKOUT (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
                                </Link>
                                <div className="premium-trust-wrap mt-4">
                                    <div className="premium-trust-item">
                                        <span className="premium-trust-icon premium-trust-icon-secure" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation">
                                                <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M9.6 11.8l1.7 1.8 3.2-3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="small font-weight-bold">Secure Checkout</span>
                                    </div>
                                    <div className="premium-trust-item">
                                        <span className="premium-trust-icon premium-trust-icon-return" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation">
                                                <path d="M10 7L6 11l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M7 11h7a4 4 0 010 8h-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="small font-weight-bold">7-Day Easy Returns</span>
                                    </div>
                                    <div className="premium-trust-item">
                                        <span className="premium-trust-icon premium-trust-icon-ship" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" role="presentation">
                                                <path d="M3 7h11v8H3V7zm11 3h3l3 3v2h-6v-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx="8" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.6" />
                                                <circle cx="18" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.6" />
                                            </svg>
                                        </span>
                                        <span className="small font-weight-bold">Free Shipping</span>
                                    </div>
                                </div>
                                <div className="text-center mt-3">
                                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/AM_mc_vs_dc_ae.jpg" width="100%" style={{ opacity: 0.6, filter: "grayscale(1)" }} alt="payment-methods" />
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
            <style>{`.skeleton-box { background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 37%,#f3f4f6 63%); border-radius: 8px; animation: skeleton-shimmer 1.2s infinite linear; }
            @keyframes skeleton-shimmer { 0%{background-position:-200px 0} 100%{background-position:calc(200px + 100%) 0} }`}</style>
            <style dangerouslySetInnerHTML={{ __html: `
                                                /* Fast badge animation */
                                                .lux-cbadge {
                                                    animation: lux-bounce-in 0.3s cubic-bezier(.68,-0.55,.27,1.55);
                                                }
                                                @keyframes lux-bounce-in {
                                                    0% { transform: scale(0.7); opacity: 0; }
                                                    60% { transform: scale(1.15); opacity: 1; }
                                                    100% { transform: scale(1); opacity: 1; }
                                                }

                                                /* Make action buttons and qty+price appear in one row, spaced apart */
                                                .cart-action-row-fullwidth {
                                                    width: 100%;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: space-between;
                                                    gap: 12px;
                                                }
                                                @media (max-width: 767.98px) {
                                                    .cart-action-row-fullwidth {
                                                        flex-direction: column;
                                                        align-items: stretch;
                                                        gap: 8px;
                                                    }
                                                    .premium-qty-line {
                                                        justify-content: flex-start !important;
                                                    }
                                                }
                /* Checkbox scale fix */
                input[type="checkbox"] { width: 18px !important; height: 18px !important; }
                .cart-page-shell {
                    background:
                        radial-gradient(circle at 2% 2%, rgba(191, 219, 254, 0.2), transparent 30%),
                        radial-gradient(circle at 98% 4%, rgba(253, 230, 138, 0.22), transparent 30%),
                        linear-gradient(180deg, #f5f7fa 0%, #edf1f5 100%);
                }
                /* --- HERO SECTION --- */
                .cart-premium-hero {
                    position: relative;
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                    padding: clamp(60px, 8vw, 80px) 20px;
                    overflow: hidden;
                    border-bottom: 1px solid rgba(201,168,76,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 40px;
                }
                .cart-hero-bg-glow {
                    position: absolute;
                    top: -50%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 80vw;
                    height: 80vw;
                    background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 60%);
                    border-radius: 50%;
                    pointer-events: none;
                }
                .cart-eyebrow {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    color: #C9A84C;
                    font-size: clamp(10px, 2vw, 12px);
                    font-weight: 700;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                }
                .cart-eyebrow-line {
                    width: 30px;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #C9A84C, transparent);
                }
                .cart-title {
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(2.5rem, 6vw, 4rem);
                    color: #ffffff;
                    font-weight: 600;
                    line-height: 1.1;
                    margin-bottom: 16px;
                    letter-spacing: -0.01em;
                }
                .cart-title em {
                    font-style: italic;
                    background: linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    padding-right: 8px;
                }
                .cart-desc {
                    color: #a1a1aa;
                    font-size: clamp(14px, 2.5vw, 18px);
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                    font-weight: 300;
                    letter-spacing: 0.02em;
                }
                .cart-breadcrumb {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .cart-breadcrumb-link {
                    color: #C9A84C;
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                .cart-breadcrumb-link:hover {
                    color: #E8C97A;
                }
                .cart-breadcrumb-sep {
                    color: rgba(255,255,255,0.2);
                }
                .cart-breadcrumb-current {
                    color: #fff;
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
                                .cart-qtyprice-col {
                                    display: flex !important;
                                    flex-direction: row !important;
                                    align-items: center !important;
                                    justify-content: flex-end !important;
                                    gap: 12px;
                                    width: 100%;
                                    min-width: 140px;
                                    margin-right: 8px;
                                }
                .premium-wishlist-btn { border: 1px solid #b9963a; color: #7a5c1f; background: linear-gradient(90deg, #fff8e1, #fef3c7); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
                .premium-wishlist-btn:hover { background: #f9edc8; color: #5f4717; }
                .premium-save-btn { border: 1px solid #cbd5e1; color: #334155; background: #f8fafc; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
                .premium-save-btn:hover { background: #eef2f7; color: #0f172a; }
                .premium-id-pill { background: linear-gradient(120deg, #f3f4f6, #e9ecef); color: #556; border: 1px dashed #c8ced7; border-radius: 999px; font-weight: 700; font-size: 11px; }
                .premium-id-pill { max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
                .premium-trash-icon { color: #a8b0bb; transition: color 0.2s ease, transform 0.2s ease; }
                .premium-x-btn:hover .premium-trash-icon { color: #dc2626; transform: scale(1.05); }
                .premium-x-top { position: absolute; top: 12px; right: 12px; z-index: 5; }
                .premium-qty-wrap { background: linear-gradient(145deg, #ffffff, #f8fafc); border: 1px solid #e5eaf0; border-radius: 999px; padding: 4px 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9); }
                                .premium-qty-line {
                                    display: flex !important;
                                    flex-direction: row !important;
                                    align-items: center !important;
                                    gap: 12px;
                                }
                .premium-qty-count { text-align: center; color: #1f2937; }
                .premium-live-price { font-size: 1.2rem; line-height: 1; }
                .premium-total-price { font-weight: 800 !important; color: #10a4c5 !important; }
                .premium-total-head { color: #1f2937; letter-spacing: 0.4px; }
                .premium-item-delivery { color: #047857; font-weight: 600; }
                .premium-qty-btn { width: 30px; height: 30px; font-size: 19px; background: #ffffff; color: #333; }
                .premium-qty-btn:hover { background: #e2e6ea; }
                .premium-wishlist-btn:disabled, .premium-save-btn:disabled, .premium-qty-btn:disabled, .premium-x-btn:disabled, .premium-move-cart-btn:disabled, .premium-remove-saved-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                .premium-summary-card {
                    border-radius: 1.4rem !important;
                    border: 1px solid #e7ebf0 !important;
                    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08) !important;
                    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
                }
                .premium-summary-label { font-weight: 700; color: #475569 !important; }
                .premium-summary-amount { font-size: 1rem; font-weight: 800 !important; color: #111827; }
                .premium-grand-label, .premium-grand-amount { font-size: 1.2rem; font-weight: 800 !important; }
                .premium-delivery-box {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px;
                    background: #fbfdff;
                }
                .premium-delivery-title {
                    color: #334155;
                    font-weight: 700;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }
                .premium-delivery-row { gap: 8px; }
                .premium-delivery-input {
                    border: 1px solid #dbe3eb;
                    border-radius: 10px;
                    font-size: 0.92rem;
                }
                .premium-delivery-btn {
                    border: 1px solid #0ea5b7;
                    color: #0f172a;
                    background: #e6fbff;
                    border-radius: 10px;
                    font-weight: 700;
                    min-width: 86px;
                }
                .premium-delivery-btn:hover { background: #cff7ff; }
                .premium-delivery-result {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: 999px;
                    padding: 7px 12px;
                    border: 1px solid rgba(16, 185, 129, 0.32);
                    background: linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(184,134,11,0.12) 100%);
                    color: #047857;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.01em;
                }
                .premium-delivery-result::before {
                    content: '✓';
                    width: 18px;
                    height: 18px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    color: #fff;
                    background: #059669;
                    box-shadow: 0 3px 8px rgba(5,150,105,0.28);
                }
                .premium-trust-wrap {
                    border-top: 1px solid #edf2f7;
                    padding-top: 14px;
                    display: grid;
                    gap: 10px;
                }
                .premium-trust-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #1f2937;
                    border: 1px solid #e6ebf2;
                    border-radius: 12px;
                    padding: 8px 10px;
                    background: linear-gradient(120deg, #ffffff 0%, #f8fafc 100%);
                    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
                }
                .premium-trust-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #fff8e1 0%, #e6fbff 100%);
                    border: 1px solid #d7e2ef;
                    font-size: 15px;
                    color: #475569;
                }
                .premium-trust-icon svg {
                    width: 16px;
                    height: 16px;
                    display: block;
                }
                .premium-trust-icon-secure { color: #0f766e; }
                .premium-trust-icon-return { color: #b45309; }
                .premium-trust-icon-ship { color: #2563eb; }
                .premium-trust-item .small {
                    letter-spacing: 0.01em;
                }
                .saved-items-wrap {
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 14px;
                    background: #f8fafc;
                }
                .saved-items-title { color: #334155; font-weight: 800; }
                .saved-item-row {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    background: #ffffff;
                }
                .saved-item-thumb {
                    width: 56px;
                    height: 56px;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                    flex: 0 0 56px;
                }
                .saved-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .premium-move-cart-btn {
                    border: 1px solid #0ea5b7;
                    color: #0f172a;
                    background: #e6fbff;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                }
                .premium-move-cart-btn:hover { background: #ccf7ff; }
                .premium-remove-saved-btn {
                    border: 1px solid #d1d5db;
                    color: #475569;
                    background: #f8fafc;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                }
                .premium-remove-saved-btn:hover { color: #b91c1c; border-color: #fecaca; background: #fff1f2; }
                .premium-coupon-group input { border-radius: 50px 0 0 50px !important; }
                .premium-coupon-group .btn { border-radius: 0 50px 50px 0 !important; }
                .premium-coupon-chip {
                    border-radius: 999px;
                    border: 1px dashed #c7a74d;
                    background: #fff9e8;
                    color: #7a5c1f;
                    font-weight: 700;
                    font-size: 11px;
                    padding: 4px 10px;
                }
                .premium-coupon-chip:hover { background: #f9edc8; }
                .premium-checkout-btn { background: linear-gradient(90deg, #b19d5e 0%, #f6e27a 100%); color: #222; border: none; letter-spacing: 1px; }
                .premium-checkout-btn:hover { background: linear-gradient(90deg, #f6e27a 0%, #b19d5e 100%); color: #111; transform: translateY(-2px); }
                                @media (max-width: 767.98px) {
                                    .premium-cart-grid { align-items: flex-start; }
                                    .cart-details-col { width: calc(100% - 102px); min-width: 0; padding-right: 4px !important; }
                                    .cart-qtyprice-col {
                                        flex-direction: row !important;
                                        align-items: center !important;
                                        justify-content: flex-end !important;
                                        width: 100%;
                                        margin-left: 0 !important;
                                        margin-top: 0 !important;
                                    }
                                    .cart-premium-row { padding-right: 36px !important; }
                                    .premium-x-top { top: 8px; right: 8px; }
                                    .cart-action-row { flex-wrap: wrap; gap: 6px; }
                                    .premium-id-pill { max-width: 140px; }
                                    .premium-wishlist-btn { padding: 4px 10px; font-size: 11px; }
                                    .premium-save-btn { padding: 4px 10px; font-size: 11px; }
                                    .premium-qty-line {
                                        flex-direction: row !important;
                                        align-items: center !important;
                                        width: 100%;
                                        justify-content: flex-end !important;
                                    }
                                    .cart-premium-intro { padding: 12px; }
                                    .intro-title { font-size: 1rem; }
                                    .intro-value { font-size: 0.85rem; padding: 7px 12px; }
                                    .saved-item-row { flex-direction: column; align-items: flex-start !important; gap: 10px; }
                                    .saved-action-row { width: 100%; }
                                    .premium-delivery-row { flex-direction: column; }
                                    .premium-delivery-btn { width: 100%; }
                                }
            `}} />
        
            <AnimatePresence mode="wait">
                {cartLoading && !cart.length ? (
                    <motion.div
                        key="cart-skeleton"
                        initial={{ opacity: 0, scale: 0.98, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 40, transition: { duration: 0.35 } }}
                        transition={{ duration: 0.7, type: 'spring', stiffness: 70 }}
                    >
                        {/* Skeletons for cart and summary */}
                        <div className="container py-5">
                            <div className="row">
                                <div className="col-lg-8 col-12 mb-4 mb-lg-0">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="cart-premium-row bg-white p-3 mb-3 border-0 rounded-lg shadow-sm position-relative" style={{opacity:0.5}}>
                                            <div className="d-flex align-items-center premium-cart-grid">
                                                <div className="cart-img-col d-flex align-items-center justify-content-center" style={{ minWidth: 90, minHeight: 90 }}>
                                                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#f3f4f6' }} />
                                                </div>
                                                <div className="cart-details-col flex-grow-1 px-3">
                                                    <div className="skeleton-box mb-2" style={{height:18,width:'60%'}} />
                                                    <div className="skeleton-box mb-1" style={{height:12,width:'40%'}} />
                                                    <div className="skeleton-box mt-2" style={{height:14,width:'50%'}} />
                                                </div>
                                                <div className="cart-qtyprice-col d-flex flex-column align-items-center justify-content-center">
                                                    <div className="skeleton-box" style={{height:28,width:80}} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="col-lg-4 col-12 mt-0 mt-lg-0">
                                    <div className="card border-0 p-4 bg-white sticky-top premium-summary-card" style={{ top: "100px", border: "1px solid #eee", opacity:0.5 }}>
                                        <div className="skeleton-box mb-3" style={{height:28,width:'60%'}} />
                                        {[...Array(4)].map((_,i)=>(<div key={i} className="skeleton-box mb-2" style={{height:18,width:'80%'}} />))}
                                        <div className="skeleton-box mt-4" style={{height:38,width:'100%'}} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="cart-content"
                        initial={{ opacity: 0, y: 40, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.98, transition: { duration: 0.35 } }}
                        transition={{ duration: 0.7, type: 'spring', stiffness: 70 }}
                    >
                        {/* ...existing cart content... */}
                        {/** The rest of the cart page content is already here, just keep it as is **/}
                        {/* Custom Styling */}
                        <style>{`.skeleton-box { background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 37%,#f3f4f6 63%); border-radius: 8px; animation: skeleton-shimmer 1.2s infinite linear; }
                        @keyframes skeleton-shimmer { 0%{background-position:-200px 0} 100%{background-position:calc(200px + 100%) 0} }`}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}