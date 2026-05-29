import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { useSelector, useDispatch } from 'react-redux';
import { getCart } from '../Store/ActionCreaters/CartActionCreators';
import { getWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { queryClient } from '../queries/queryClient';
import { catalogQueryKeys } from '../queries/catalogQueries';
import { GET_CART_RED } from '../Store/Constant';
import { useToast } from './ToastNotification';
import axios from 'axios';
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants';
import Spinner from './Spinner';
import io from 'socket.io-client';
axios.defaults.baseURL = BASE_URL;

const FREE_SHIP_THRESHOLD = 999;
const PREMIUM_GIFT_THRESHOLD = 2999;
const EXPRESS_DELIVERY_FEE = 49; // UI-only preview

// Debounce hook to prevent excessive API calls on rapid UI changes
const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    return (...args) => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    };
};

export default function Cart() {
    const dispatch = useDispatch();
    const socketRef = useRef(null);
    const cartState = useSelector(state => state.CartStateData);
    const productState = useSelector(state => state.ProductStateData) || [];
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
    const [cartNotifications, setCartNotifications] = useState({});
    const toast = useToast();
    const [summary, setSummary] = useState({
        subtotal: 0,
        shipping: 0,
        baseDiscount: 0,
        couponDiscount: 0,
        gst: 0,
        giftWrapCharge: 0,
        insuranceCharge: 0,
        expressDeliveryFee: 0,
        grandTotal: 0,
        totalSavings: 0,
    });
    const [coupon, setCoupon] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);
    const [appliedCouponCode, setAppliedCouponCode] = useState("");
    const [couponError, setCouponError] = useState("");
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartLoading, setCartLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [couponLoading, setCouponLoading] = useState(true);
    const [movingIds, setMovingIds] = useState([]);
    const [savingIds, setSavingIds] = useState([]);
    const [savedActionIds, setSavedActionIds] = useState([]);
    const userId = localStorage.getItem("userid");
    const [userMissing, setUserMissing] = useState(false);

    // ── Premium UI extras (UI-only state) ──
    const [showCouponPanel, setShowCouponPanel] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);              // bulk select
    const [deliverySpeed, setDeliverySpeed] = useState('standard');  // 'standard' | 'express'
    const [removeConfirmId, setRemoveConfirmId] = useState(null);    // itemId to confirm
    const [savedSort, setSavedSort] = useState('recent');            // 'recent' | 'price-low' | 'price-high'
    const [insuranceAdded, setInsuranceAdded] = useState(false); // Now connected to backend
    const [summaryExpanded, setSummaryExpanded] = useState(false);   // mobile bottom-sheet
    const [activeTab, setActiveTab] = useState('cart');              // 'cart' | 'saved' (mobile only)
    const [viewerCount] = useState(() => Math.floor(Math.random() * 38) + 12);
    const [recentOrders] = useState(() => Math.floor(Math.random() * 800) + 4200);

    const itemCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + Number(item.quantity ?? item.qty ?? 1), 0);
    }, [cart]);

    const { grandTotal, totalSavings, subtotal, shipping, gst } = summary;
    const freeShipRemaining = Math.max(0, FREE_SHIP_THRESHOLD - summary.subtotal);
    const freeShipProgress = Math.min(100, (summary.subtotal / FREE_SHIP_THRESHOLD) * 100);
    const giftRemaining = Math.max(0, PREMIUM_GIFT_THRESHOLD - summary.subtotal);
    const giftProgress = Math.min(100, (summary.subtotal / PREMIUM_GIFT_THRESHOLD) * 100);

    // Loyalty points earned (UI only)
    const rewardsEarned = useMemo(() => Math.floor(grandTotal * 0.02), [grandTotal]);

    // Saved items sorted (local UI-only sort)
    const sortedSavedItems = useMemo(() => {
        const items = [...savedItems];
        if (savedSort === 'price-low') {
            items.sort((a, b) =>
                Number(a.price ?? a.product?.finalprice ?? 0) -
                Number(b.price ?? b.product?.finalprice ?? 0));
        } else if (savedSort === 'price-high') {
            items.sort((a, b) =>
                Number(b.price ?? b.product?.finalprice ?? 0) -
                Number(a.price ?? a.product?.finalprice ?? 0));
        }
        return items;
    }, [savedItems, savedSort]);

    // Recommended (UI only — slice productState)
    const recommended = useMemo(() => {
        if (!Array.isArray(productState)) return [];
        const cartProdIds = new Set(cart.map(i => String(i.productid || i.product?._id || i._id)));
        return productState
            .filter(p => p && (p.pic1 || p.pic) && !cartProdIds.has(String(p._id || p.id)))
            .slice(0, 8);
    }, [productState, cart]);

    // Frequently bought together (UI only — different slice)
    const frequentlyBought = useMemo(() => {
        if (!Array.isArray(productState)) return [];
        return productState.filter(p => p && (p.pic1 || p.pic)).slice(8, 14);
    }, [productState]);

    // Derive giftWrapIds from cart state, making it reactive to backend updates
    const giftWrapIds = useMemo(() =>
        cart.filter(i => i.giftWrap).map(i => i._id || i.id),
        [cart]
    );

    // Parallel fetch for cart, summary, coupons
    async function fetchCartAndSummary() {
        if (!userId) {
            setUserMissing(true);
            setSummary({
                subtotal: 0, shipping: 0, baseDiscount: 0, couponDiscount: 0, gst: 0,
                giftWrapCharge: 0, insuranceCharge: 0, expressDeliveryFee: 0,
                grandTotal: 0, totalSavings: 0,
            });
            setLoading(false);
            return;
        }
        setUserMissing(false);
        setLoading(false);
        setCartLoading(true);
        setSummaryLoading(true);
        setCouponLoading(true);
        await dispatch(getCart());
        await Promise.all([
            (async () => {
                try {
                    const cartRes = await axios.get(`/api/cart?userId=${userId}`);
                    const cartData = cartRes.data.cart;
                    if (cartData) {
                        if (cartData.deliverySpeed) setDeliverySpeed(cartData.deliverySpeed);
                        if (cartData.insuranceAdded !== undefined) setInsuranceAdded(cartData.insuranceAdded);
                    }
                } catch {
                    // ignore
                }
                setCartLoading(false);
            })(),
            (async () => {
                try {
                    const summaryRes = await axios.get(`/api/cart/order-summary?userId=${userId}`);
                    const s = summaryRes.data.summary || {};
                    setSummary({
                        subtotal: s.subtotal || 0,
                        shipping: s.shipping || 0,
                        baseDiscount: s.baseDiscount || s.discount || 0,
                        couponDiscount: s.couponDiscount || 0,
                        gst: s.gst || 0,
                        giftWrapCharge: s.giftWrapCharge || 0,
                        insuranceCharge: s.insuranceCharge || 0,
                        expressDeliveryFee: s.expressDeliveryFee || 0,
                        grandTotal: s.grandTotal || 0,
                        totalSavings: s.totalSavings || 0,
                    });
                } catch {
                    // Reset summary on error
                    setSummary({ subtotal: 0, shipping: 0, baseDiscount: 0, couponDiscount: 0, gst: 0, giftWrapCharge: 0, insuranceCharge: 0, expressDeliveryFee: 0, grandTotal: 0, totalSavings: 0 });
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
            setSummary({
                subtotal: s.subtotal || 0,
                shipping: s.shipping || 0,
                baseDiscount: s.baseDiscount || s.discount || 0,
                couponDiscount: s.couponDiscount || 0,
                gst: s.gst || 0,
                giftWrapCharge: s.giftWrapCharge || 0,
                insuranceCharge: s.insuranceCharge || 0,
                expressDeliveryFee: s.expressDeliveryFee || 0,
                grandTotal: s.grandTotal || 0,
                totalSavings: s.totalSavings || 0,
            });
        } catch (e) { }
    }

    function syncCartFromResponse(responseData) {
        const cartData = responseData?.cart;
        if (!cartData) return;
        dispatch({ type: GET_CART_RED, data: cartData });
        if (cartData.deliverySpeed) setDeliverySpeed(cartData.deliverySpeed);
        if (cartData.insuranceAdded !== undefined) setInsuranceAdded(cartData.insuranceAdded);
    }

    // ── Backend-connected actions for new features ──

    async function handleToggleGiftWrap(itemId) {
        if (!userId) return;
        const item = cart.find(i => (i._id || i.id) === itemId);
        if (!item) return;

        const isCurrentlyWrapped = item.giftWrap || false;

        // Optimistic UI update for instant feedback
        dispatch({
            type: GET_CART_RED,
            data: {
                ...cartState,
                items: cart.map(i => i._id === itemId ? { ...i, giftWrap: !isCurrentlyWrapped } : i)
            }
        });

        try {
            const res = await axios.put(`/api/cart/item/${itemId}`, { giftWrap: !isCurrentlyWrapped, userId });
            syncCartFromResponse(res.data); // Sync with the real state from backend
            await refreshSummaryOnly(); // Get updated totals
            toast.success(!isCurrentlyWrapped ? 'Gift wrap added' : 'Gift wrap removed');
        } catch (e) {
            // Revert optimistic update on failure
            dispatch({ type: GET_CART_RED, data: cartState });
            toast.error('Could not update gift wrap.');
        }
    }

    const debouncedUpdateCartOptions = useDebounce(async (options) => {
        if (!userId) return;
        try {
            const res = await axios.post('/api/cart/options', { userId, ...options });
            syncCartFromResponse(res.data);
            await refreshSummaryOnly();
        } catch (e) {
            toast.error('Could not save cart options.');
        }
    }, 800);

    async function saveForLater(item) {
        const itemId = item._id || item.id;
        if (!userId) { toast.error('Please login first.'); return; }
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
        if (!userId) { toast.error('Please login first.'); return; }
        setSavedActionIds((prev) => [...prev, itemId]);
        try {
            const res = await axios.post(`/api/cart/move-saved-to-cart/${itemId}`, { userId, size: item.size, color: item.color });
            syncCartFromResponse(res.data);
            await refreshSummaryOnly();
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
        if (!userId) { toast.error('Please login first.'); return; }
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

    async function updateQty(item, op) {
        let currentQty = Number(item.quantity ?? item.qty ?? 1);
        if (op === "dec" && currentQty === 1) return;
        let newQty = (op === "dec") ? currentQty - 1 : currentQty + 1;
        try {
            await axios.put(`/api/cart/update-quantity/${item._id || item.id}`, { userId, quantity: newQty });
            await dispatch(getCart());
            await refreshSummaryOnly();
            toast.success('Quantity updated!');
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('cart:recalculate', { userId });
            }
        } catch (e) {
            if (e.response?.data?.message?.includes('Out of Stock')) {
                toast.error(e.response.data.message);
            } else {
                toast.error('Failed to update quantity.');
            }
        }
    }

    async function removeProduct(id, silent = false) {
        setRemovingIds((prev) => [...prev, id]);
        try {
            await axios.delete(`/api/cart/remove-item/${id}`, {
                params: { userId, userid: userId },
                data: { userId, userid: userId }
            });
            await dispatch(getCart());
            await refreshSummaryOnly();
            if (!silent) toast.info('Item removed from cart.');
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('cart:recalculate', { userId });
            }
        } catch (e) {
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
        const rawProduct = item.productid || item.product || itemId;
        const product = (rawProduct && (rawProduct._id || rawProduct.id)) ? (rawProduct._id || rawProduct.id) : rawProduct;
        if (!user) { toast.error('Please login first.'); return; }
        setMovingIds((prev) => [...prev, itemId]);
        try {
            let name = item.name || item.product?.name || '';
            let pic = item.pic || item.product?.pic1 || '';
            let price = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? 0);
            let size = item.size || item.product?.size || '';
            let color = item.color || item.product?.color || '';
            if (!name || !pic || !price) {
                try {
                    const res = await axios.get(`/product/${product}`);
                    const prod = res.data;
                    name = name || prod.name || 'Product';
                    pic = pic || prod.pic1 || '/assets/images/noimage.png';
                    price = price || prod.finalprice || prod.price || 0;
                } catch (err) {
                    name = name || 'Product';
                    pic = pic || '/assets/images/noimage.png';
                    price = price || 0;
                }
            }
            await axios.post('/wishlist', {
                userid: user,
                productid: product,
                size,
                color,
                price,
                pic,
                name,
                quantity: item.quantity || item.qty || 1
            });
            await removeProduct(itemId, true);
            await refreshSummaryOnly();
            dispatch(getWishlist());
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
        if (couponApplied && appliedCouponCode && normalizedCoupon === appliedCouponCode) {
            toast.info('This coupon is already applied.');
            setCouponError('This coupon is already applied.');
            return;
        }
        try {
            const res = await axios.post('/api/cart/apply-coupon', { userId, coupon: normalizedCoupon });
            if (res.data && res.data.success) {
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
                await refreshSummaryOnly(); // Refresh summary to include coupon discount
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
                socketRef.current.on('connected', () => { });
                socketRef.current.on('connect_error', () => { });
                socketRef.current.on('disconnect', () => { });
            } catch (e) {
                socketRef.current = null;
            }
        }

        fetchCartAndSummary();
        queryClient.invalidateQueries({ queryKey: catalogQueryKeys.products });

        return () => {
            if (socketRef.current) {
                try {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                } catch (e) { }
            }
        };
    }, [userId]);

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

    // Format expected delivery date (UI-only nicety)
    const expectedDelivery = useMemo(() => {
        const today = new Date();
        const days = deliverySpeed === 'express' ? 2 : 5;
        const eta = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
        const opts = { weekday: 'short', day: 'numeric', month: 'short' };
        return eta.toLocaleDateString('en-IN', opts);
    }, [deliverySpeed]);

    // ── UI-only helpers (no backend) ──
    const allItemIds = cart.map(i => i._id || i.id);
    const allSelected = selectedIds.length > 0 && selectedIds.length === allItemIds.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < allItemIds.length;

    function toggleSelect(id) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }
    function toggleSelectAll() {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(allItemIds);
    }
    async function bulkRemoveSelected() {
        if (!selectedIds.length) return;
        const ids = [...selectedIds];
        for (const id of ids) {
            // eslint-disable-next-line no-await-in-loop
            await removeProduct(id, true);
        }
        setSelectedIds([]);
        toast.info(`${ids.length} item${ids.length !== 1 ? 's' : ''} removed.`);
    }
    async function bulkMoveToWishlistSelected() {
        if (!selectedIds.length) return;
        const ids = [...selectedIds];
        for (const id of ids) {
            const item = cart.find(i => (i._id || i.id) === id);
            // eslint-disable-next-line no-await-in-loop
            if (item) await moveToWishlist(item);
        }
        setSelectedIds([]);
    }
    async function bulkSaveForLaterSelected() {
        if (!selectedIds.length) return;
        const ids = [...selectedIds];
        for (const id of ids) {
            const item = cart.find(i => (i._id || i.id) === id);
            // eslint-disable-next-line no-await-in-loop
            if (item) await saveForLater(item);
        }
        setSelectedIds([]);
    }

    return (
        <motion.div
            className="lx-cart"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: cartLoading && !cart.length ? 0 : 1, y: cartLoading && !cart.length ? 30 : 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* ══ HERO ══ */}
            <section className="lx-hero">
                <div className="lx-hero-bg" />
                <div className="lx-hero-noise" />
                <div className="lx-hero-glow lx-hero-glow-1" />
                <div className="lx-hero-glow lx-hero-glow-2" />
                <div className="lx-hero-inner">
                    <motion.span className="lx-hero-eyebrow"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                    >
                        <span className="lx-eline" />SECURE LUXURY CHECKOUT<span className="lx-eline" />
                    </motion.span>
                    <motion.h1 className="lx-hero-title"
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
                    >Your <em>Bag</em></motion.h1>
                    <motion.p className="lx-hero-sub"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.22 }}
                    >Curated picks · Premium offers · Concierge-grade checkout</motion.p>

                    {/* Step progress */}
                    <motion.div className="lx-steps"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
                    >
                        <div className="lx-step active">
                            <span className="lx-step-num">1</span>
                            <span className="lx-step-label">BAG</span>
                        </div>
                        <span className="lx-step-line" />
                        <div className="lx-step">
                            <span className="lx-step-num">2</span>
                            <span className="lx-step-label">ADDRESS</span>
                        </div>
                        <span className="lx-step-line" />
                        <div className="lx-step">
                            <span className="lx-step-num">3</span>
                            <span className="lx-step-label">PAYMENT</span>
                        </div>
                    </motion.div>

                    {/* Live social proof */}
                    {!cartLoading && cart.length > 0 && (
                        <motion.div className="lx-hero-live"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
                            <span className="lx-live-dot" />
                            <span><strong>{viewerCount}</strong> shoppers in your size right now · <strong>{recentOrders.toLocaleString('en-IN')}</strong> orders this month</span>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* ══ TRUST STRIP ══ */}
            <div className="lx-trust">
                <div className="lx-trust-inner">
                    <div className="lx-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /><path d="M9.6 11.8l1.7 1.8 3.2-3.3" strokeLinecap="round" /></svg>
                        <span><strong>100% Secure</strong> · 256-bit SSL</span>
                    </div>
                    <div className="lx-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 4 3 12 11 12" /></svg>
                        <span><strong>7-Day Returns</strong> · Easy exchange</span>
                    </div>
                    <div className="lx-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                        <span><strong>Free Shipping</strong> · Above ₹{FREE_SHIP_THRESHOLD}</span>
                    </div>
                    <div className="lx-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg>
                        <span><strong>COD Available</strong> · Pay later</span>
                    </div>
                    <div className="lx-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.5 12.5l2 2 3.5-4" /></svg>
                        <span><strong>100% Authentic</strong> · Brand verified</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN ══ */}
            <div className="lx-cart-wrap">

                {/* Loading skeleton */}
                {cartLoading && !cart.length && (
                    <div className="lx-cart-grid">
                        <div>
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="lx-item lx-skel">
                                    <div className="lx-shimmer lx-item-img" />
                                    <div style={{ flex: 1, padding: '4px 16px' }}>
                                        <div className="lx-shimmer lx-skel-line" style={{ width: '40%', height: 14 }} />
                                        <div className="lx-shimmer lx-skel-line" style={{ width: '70%', height: 16, marginTop: 8 }} />
                                        <div className="lx-shimmer lx-skel-line" style={{ width: '50%', height: 12, marginTop: 8 }} />
                                        <div className="lx-shimmer lx-skel-line" style={{ width: '60%', height: 16, marginTop: 14 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="lx-summary lx-skel">
                                <div className="lx-shimmer lx-skel-line" style={{ width: '50%', height: 18 }} />
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="lx-shimmer lx-skel-line" style={{ width: '90%', height: 12, marginTop: 12 }} />
                                ))}
                                <div className="lx-shimmer lx-skel-line" style={{ width: '100%', height: 44, marginTop: 18, borderRadius: 6 }} />
                            </div>
                        </div>
                    </div>
                )}

                {userMissing ? (
                    <div className="lx-empty">
                        <div className="lx-eico">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <h4>Please login to view your bag</h4>
                        <p>Sign in to see your saved items, apply coupons & checkout securely.</p>
                        <Link to="/login" className="lx-ebtn">LOGIN TO CONTINUE</Link>
                    </div>
                ) : !cartLoading && cart && cart.length > 0 ? (
                    <div className="lx-cart-grid">
                        {/* ── LEFT: ITEMS ── */}
                        <div className="lx-items-col">

                            {/* Intro card */}
                            <div className="lx-intro">
                                <div>
                                    <p className="lx-intro-eyebrow">YOUR BAG</p>
                                    <h3 className="lx-intro-title">{itemCount} item{itemCount !== 1 ? 's' : ''} ready for checkout</h3>
                                </div>
                                <div className="lx-intro-meta">
                                    <span className="lx-intro-eta">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                        Delivery by <strong>{expectedDelivery}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Free shipping + premium gift progress */}
                            {subtotal > 0 && (
                                <div className="lx-shipbar">
                                    {freeShipRemaining > 0 ? (
                                        <p className="lx-shipbar-text">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                                            Add <strong>₹{freeShipRemaining}</strong> more to unlock <strong>FREE Shipping</strong>
                                        </p>
                                    ) : giftRemaining > 0 ? (
                                        <p className="lx-shipbar-text lx-shipbar-success">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            Free shipping unlocked! Add <strong>₹{giftRemaining}</strong> more for a <strong>Premium Gift</strong>
                                        </p>
                                    ) : (
                                        <p className="lx-shipbar-text lx-shipbar-success">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            Hurray! You've unlocked <strong>FREE Shipping</strong> and a <strong>Premium Gift</strong>
                                        </p>
                                    )}
                                    <div className="lx-shipbar-track">
                                        <motion.div
                                            className={`lx-shipbar-fill ${freeShipRemaining === 0 ? 'done' : ''}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: freeShipRemaining > 0 ? `${freeShipProgress}%` : `${giftProgress}%` }}
                                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                        />
                                    </div>
                                    <div className="lx-shipbar-milestones">
                                        <span className={subtotal >= FREE_SHIP_THRESHOLD ? 'reached' : ''}>
                                            <span className="lx-mile-dot" /> Free Shipping ₹{FREE_SHIP_THRESHOLD}
                                        </span>
                                        <span className={subtotal >= PREMIUM_GIFT_THRESHOLD ? 'reached' : ''}>
                                            <span className="lx-mile-dot" /> Premium Gift ₹{PREMIUM_GIFT_THRESHOLD}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Bulk action toolbar */}
                            <div className="lx-bulk">
                                <label className="lx-bulk-check">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={el => { if (el) el.indeterminate = someSelected; }}
                                        onChange={toggleSelectAll}
                                    />
                                    <span className="lx-cbox" />
                                    <span className="lx-bulk-label">
                                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : `Select all (${cart.length})`}
                                    </span>
                                </label>
                                {selectedIds.length > 0 && (
                                    <div className="lx-bulk-actions">
                                        <button onClick={bulkMoveToWishlistSelected} className="lx-bulk-btn">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                            Wishlist
                                        </button>
                                        <button onClick={bulkSaveForLaterSelected} className="lx-bulk-btn">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                            Save
                                        </button>
                                        <button onClick={bulkRemoveSelected} className="lx-bulk-btn lx-bulk-danger">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Items list */}
                            <div className="lx-items">
                                <AnimatePresence>
                                    {cart.map((item) => {
                                        const itemId = item._id || item.id;
                                        const prodId = item.productid || item.product?._id || item.productId || itemId;
                                        const fullProduct = productState.find(p => String(p.id || p._id) === String(prodId)) || {};
                                        const itemName = item.name || item.product?.name || fullProduct.name || 'Product';
                                        const itemBrand = item.brand || item.product?.brand || fullProduct.brand || 'Brand';
                                        const itemColor = item.color || item.product?.color || fullProduct.color || '';
                                        let itemSize = item.size || item.product?.size || fullProduct.size || 'N/A';
                                        if (Array.isArray(itemSize)) itemSize = itemSize[0] || 'N/A';
                                        const itemPic = item.pic || item.product?.pic1 || fullProduct.pic1 || '/assets/images/noimage.png';
                                        const itemQty = Number(item.quantity ?? item.qty ?? 1);
                                        const itemPrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? fullProduct.finalprice ?? fullProduct.price ?? 0);
                                        const basePrice = Number(item.product?.baseprice ?? fullProduct.baseprice ?? 0);
                                        const itemTotal = itemPrice * itemQty;
                                        const isMoving = movingIds.includes(itemId);
                                        const isSaving = savingIds.includes(itemId);
                                        const isRemoving = removingIds.includes(itemId);
                                        const isSelected = selectedIds.includes(itemId);
                                        const isGiftWrap = item.giftWrap; // Use derived state from cart item
                                        const itemDiscount = basePrice > itemPrice ? Math.round(((basePrice - itemPrice) / basePrice) * 100) : 0;
                                        // Stock urgency hint (UI-only, deterministic-ish)
                                        const stockHint = (itemId.charCodeAt(0) % 7) + 2; // 2-8 left

                                        return (
                                            <motion.div
                                                key={itemId}
                                                layout
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: 60, scale: 0.96 }}
                                                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                                                className={`lx-item ${isRemoving ? 'removing' : ''} ${isSelected ? 'selected' : ''}`}
                                            >
                                                {/* Select checkbox */}
                                                <label className="lx-item-select" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(itemId)}
                                                    />
                                                    <span className="lx-cbox" />
                                                </label>

                                                {/* Image */}
                                                <Link to={`/single-product/${item.productid || item.product?._id || ''}`} className="lx-item-img-link">
                                                    <div className="lx-item-img">
                                                        <img
                                                            src={optimizeCloudinaryUrlAdvanced(itemPic, { maxWidth: 320, crop: 'fill' })}
                                                            loading="lazy" decoding="async" alt={itemName}
                                                        />
                                                        {itemDiscount > 0 && (
                                                            <div className="mp-ribbon">✦ {itemDiscount}% OFF</div>
                                                        )}
                                                        {isGiftWrap && (
                                                            <div className="lx-gift-badge" title="Gift wrap added">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>

                                                {/* Body */}
                                                <div className="lx-item-body">
                                                    <div className="lx-item-top">
                                                        <div className="lx-item-info">
                                                            <h4 className="lx-item-brand">{itemBrand}</h4>
                                                            <p className="lx-item-name">{itemName}</p>
                                                            <div className="lx-item-meta">
                                                                {itemColor && (
                                                                    <span className="lx-meta-chip">Color: <strong>{itemColor}</strong></span>
                                                                )}
                                                                <span className="lx-meta-chip">Size: <strong>{itemSize}</strong></span>
                                                            </div>
                                                            <div className="lx-item-signals">
                                                                <p className="lx-item-eta">
                                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
                                                                    Delivery by <strong>{expectedDelivery}</strong> · Free
                                                                </p>
                                                                {stockHint <= 5 && (
                                                                    <p className="lx-item-stock">
                                                                        <span className="lx-pulse-dot" />
                                                                        Hurry, only <strong>{stockHint} left</strong>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => setRemoveConfirmId(itemId)}
                                                            className="lx-item-x"
                                                            title="Remove from bag"
                                                            disabled={isMoving || isSaving || isRemoving}
                                                            aria-label="Remove"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* Bottom row: qty + price */}
                                                    <div className="lx-item-bottom">
                                                        <div className="lx-qty">
                                                            <button
                                                                onClick={() => updateQty(item, "dec")}
                                                                className="lx-qty-btn"
                                                                disabled={isMoving || itemQty === 1}
                                                                aria-label="Decrease"
                                                            >−</button>
                                                            <span className="lx-qty-num">{itemQty}</span>
                                                            <button
                                                                onClick={() => updateQty(item, "inc")}
                                                                className="lx-qty-btn"
                                                                disabled={isMoving}
                                                                aria-label="Increase"
                                                            >+</button>
                                                        </div>

                                                        <div className="lx-item-price">
                                                            <span className="lx-item-final">₹{itemTotal}</span>
                                                            {basePrice > itemPrice && (
                                                                <del className="lx-item-base">₹{basePrice * itemQty}</del>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action row */}
                                                    <div className="lx-item-actions">
                                                        <button
                                                            onClick={() => moveToWishlist(item)}
                                                            className="lx-act lx-act-wish"
                                                            disabled={isMoving || isSaving}
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                                            {isMoving ? 'Moving…' : 'Wishlist'}
                                                        </button>
                                                        <button
                                                            onClick={() => saveForLater(item)}
                                                            className="lx-act lx-act-save"
                                                            disabled={isMoving || isSaving}
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                                            {isSaving ? 'Saving…' : 'Save for Later'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleGiftWrap(itemId)}
                                                            className={`lx-act lx-act-gift ${isGiftWrap ? 'on' : ''}`}
                                                            title="Add gift wrap"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                                                            {isGiftWrap ? 'Gift Wrap ✓' : 'Gift Wrap'}
                                                        </button>

                                                        {cartNotifications[item.productid || item._id || item.id] && (
                                                            <motion.span
                                                                className="lx-cbadge"
                                                                initial={{ scale: 0.6, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.6, opacity: 0 }}
                                                                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                                                            >
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                Added
                                                            </motion.span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Saved for Later */}
                            {savedItems.length > 0 && (
                                <section className="lx-saved">
                                    <div className="lx-saved-head">
                                        <div>
                                            <p className="lx-saved-eyebrow">SAVED FOR LATER</p>
                                            <h3 className="lx-saved-title">Your wishlist of saved items <span>({savedItems.length})</span></h3>
                                        </div>
                                        <select
                                            className="lx-saved-sort"
                                            value={savedSort}
                                            onChange={e => setSavedSort(e.target.value)}
                                        >
                                            <option value="recent">Recently saved</option>
                                            <option value="price-low">Price: Low to High</option>
                                            <option value="price-high">Price: High to Low</option>
                                        </select>
                                    </div>
                                    <div className="lx-saved-grid">
                                        {sortedSavedItems.map((item) => {
                                            const itemId = item._id || item.id;
                                            const prodId = item.productid || item.product?._id || item.productId || itemId;
                                            const fullProduct = productState.find(p => String(p.id || p._id) === String(prodId)) || {};
                                            const itemName = item.name || item.product?.name || fullProduct.name || 'Product';
                                            const itemBrand = item.brand || item.product?.brand || fullProduct.brand || 'Brand';
                                            const itemColor = item.color || item.product?.color || fullProduct.color || '';
                                            let itemSize = item.size || item.product?.size || fullProduct.size || 'N/A';
                                            if (Array.isArray(itemSize)) itemSize = itemSize[0] || 'N/A';
                                            const itemPic = item.pic || item.product?.pic1 || fullProduct.pic1 || '/assets/images/noimage.png';
                                            const itemQty = Number(item.quantity ?? item.qty ?? 1);
                                            const itemPrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? fullProduct.finalprice ?? fullProduct.price ?? 0);
                                            const isSavedBusy = savedActionIds.includes(itemId);

                                            return (
                                                <div key={itemId} className="lx-saved-card">
                                                    <div className="lx-saved-thumb">
                                                        <img src={optimizeCloudinaryUrlAdvanced(itemPic, { maxWidth: 240, crop: 'fill' })} alt={itemName} loading="lazy" />
                                                    </div>
                                                    <div className="lx-saved-body">
                                                        <h4 className="lx-saved-brand">{itemBrand}</h4>
                                                        <p className="lx-saved-name">{itemName}</p>
                                                        <p className="lx-saved-meta">{itemColor && `${itemColor} · `}Size {itemSize} · Qty {itemQty}</p>
                                                        <p className="lx-saved-price">₹{itemPrice * itemQty}</p>
                                                        <div className="lx-saved-actions">
                                                            <button
                                                                onClick={() => moveSavedToCart(item)}
                                                                className="lx-act lx-act-primary"
                                                                disabled={isSavedBusy}
                                                            >
                                                                {isSavedBusy ? 'Moving…' : 'Move to Bag'}
                                                            </button>
                                                            <button
                                                                onClick={() => removeSavedItem(item)}
                                                                className="lx-act lx-act-ghost"
                                                                disabled={isSavedBusy}
                                                                aria-label="Remove"
                                                            >
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Recommended carousel */}
                            {recommended.length > 0 && (
                                <section className="lx-reco">
                                    <div className="lx-reco-head">
                                        <p className="lx-saved-eyebrow">YOU MAY ALSO LIKE</p>
                                        <h3 className="lx-saved-title">Hand-picked for you</h3>
                                    </div>
                                    <div className="lx-reco-scroll">
                                        {recommended.map((p) => {
                                            const pid = p._id || p.id;
                                            const ppic = p.pic1 || p.pic || '/assets/images/noimage.png';
                                            const pprice = Number(p.finalprice || p.price || 0);
                                            const pbase = Number(p.baseprice || 0);
                                            const pdisc = pbase > pprice ? Math.round(((pbase - pprice) / pbase) * 100) : 0;
                                            return (
                                                <Link key={pid} to={`/single-product/${pid}`} className="lx-reco-card">
                                                    <div className="lx-reco-thumb">
                                                        <img src={optimizeCloudinaryUrlAdvanced(ppic, { maxWidth: 320, crop: 'fill' })} alt={p.name || 'Product'} loading="lazy" />
                                                        {pdisc > 0 && <span className="mp-ribbon">✦ {pdisc}% OFF</span>}
                                                    </div>
                                                    <div className="lx-reco-body">
                                                        <span className="lx-saved-brand">{p.brand || 'Brand'}</span>
                                                        <span className="lx-saved-name">{p.name || 'Product'}</span>
                                                        <div className="lx-reco-price">
                                                            <strong>₹{pprice}</strong>
                                                            {pbase > pprice && <del>₹{pbase}</del>}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Frequently bought together */}
                            {frequentlyBought.length > 0 && (
                                <section className="lx-reco">
                                    <div className="lx-reco-head">
                                        <p className="lx-saved-eyebrow">FREQUENTLY BOUGHT TOGETHER</p>
                                        <h3 className="lx-saved-title">Complete the look</h3>
                                    </div>
                                    <div className="lx-reco-scroll">
                                        {frequentlyBought.map((p) => {
                                            const pid = p._id || p.id;
                                            const ppic = p.pic1 || p.pic || '/assets/images/noimage.png';
                                            const pprice = Number(p.finalprice || p.price || 0);
                                            const pbase = Number(p.baseprice || 0);
                                            const pdisc = pbase > pprice ? Math.round(((pbase - pprice) / pbase) * 100) : 0;
                                            return (
                                                <Link key={pid} to={`/single-product/${pid}`} className="lx-reco-card">
                                                    <div className="lx-reco-thumb">
                                                        <img src={optimizeCloudinaryUrlAdvanced(ppic, { maxWidth: 320, crop: 'fill' })} alt={p.name || 'Product'} loading="lazy" />
                                                        {pdisc > 0 && <span className="mp-ribbon">✦ {pdisc}% OFF</span>}
                                                    </div>
                                                    <div className="lx-reco-body">
                                                        <span className="lx-saved-brand">{p.brand || 'Brand'}</span>
                                                        <span className="lx-saved-name">{p.name || 'Product'}</span>
                                                        <div className="lx-reco-price">
                                                            <strong>₹{pprice}</strong>
                                                            {pbase > pprice && <del>₹{pbase}</del>}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            <div className="lx-back-row">
                                <Link to="/shop/All" className="lx-back-link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* ── RIGHT: SUMMARY ── */}
                        <aside className="lx-summary-col">
                            <div className="lx-summary">

                                {/* Delivery speed selector */}
                                <div className="lx-delivery-pick">
                                    <p className="lx-summary-title">CHOOSE DELIVERY</p>
                                    <div className="lx-delivery-row">
                                        <button
                                            className={`lx-delivery-opt ${deliverySpeed === 'standard' ? 'on' : ''}`}
                                            onClick={() => {
                                                setDeliverySpeed('standard');
                                                debouncedUpdateCartOptions({ deliverySpeed: 'standard', insuranceAdded });
                                            }}
                                        >
                                            <span className="lx-do-name">Standard</span>
                                            <span className="lx-do-eta">5–6 days</span>
                                            <span className="lx-do-fee">FREE</span>
                                        </button>
                                        <button
                                            className={`lx-delivery-opt ${deliverySpeed === 'express' ? 'on' : ''}`}
                                            onClick={() => {
                                                setDeliverySpeed('express');
                                                debouncedUpdateCartOptions({ deliverySpeed: 'express', insuranceAdded });
                                            }}
                                        >
                                            <span className="lux-express-badge"> <span className="lux-express-icon">⚡</span> EXPRESS</span>
                                            <span className="lx-do-name">Next Day</span>
                                            <span className="lx-do-eta">By {expectedDelivery}</span>
                                            <span className="lx-do-fee">+₹{EXPRESS_DELIVERY_FEE}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Coupon */}
                                <div className="lx-coupon">
                                    <div className="lx-coupon-head">
                                        <span className="lx-coupon-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 1 0 4v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a2 2 0 0 1 0-4z" /><line x1="13" y1="5" x2="13" y2="7" /><line x1="13" y1="11" x2="13" y2="13" /><line x1="13" y1="17" x2="13" y2="19" /></svg>
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <p className="lx-coupon-title">Apply Coupon</p>
                                            {couponApplied && appliedCouponCode ? (
                                                <p className="lx-coupon-applied">
                                                    <strong>{appliedCouponCode}</strong> applied · You saved ₹{summary.couponDiscount}
                                                </p>
                                            ) : (
                                                <p className="lx-coupon-sub">Save more with valid offers</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="lx-coupon-toggle"
                                            onClick={() => setShowCouponPanel(s => !s)}
                                        >
                                            {showCouponPanel ? 'Hide' : 'View'}
                                            <svg className={`lx-chev ${showCouponPanel ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9" /></svg>
                                        </button>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {showCouponPanel && (
                                            <motion.div
                                                className="lx-coupon-panel"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                            >
                                                <div className="lx-coupon-input-row">
                                                    <input
                                                        type="text"
                                                        className="lx-coupon-input"
                                                        placeholder="Enter coupon code"
                                                        value={coupon}
                                                        onChange={e => { setCoupon(e.target.value); setCouponError(''); }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="lx-coupon-apply"
                                                        onClick={handleApplyCoupon}
                                                        disabled={!coupon.trim()}
                                                    >APPLY</button>
                                                </div>
                                                {couponError && <p className="lx-coupon-err">{couponError}</p>}

                                                {couponLoading ? (
                                                    <div className="lx-shimmer lx-skel-line" style={{ width: '60%', height: 12, marginTop: 12 }} />
                                                ) : availableCoupons.length > 0 && (
                                                    <div className="lx-coupon-list">
                                                        <p className="lx-coupon-list-title">Available offers</p>
                                                        {availableCoupons.map((c) => (
                                                            <button
                                                                key={c.code}
                                                                type="button"
                                                                className={`lx-coupon-card ${appliedCouponCode === String(c.code).toUpperCase() ? 'applied' : ''}`}
                                                                onClick={() => setCoupon(c.code)}
                                                                title={c.description || c.title || c.code}
                                                            >
                                                                <span className="lx-coupon-tag">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.83 0l7-7a2 2 0 0 0-.01-2.84zM7 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" /></svg>
                                                                    {c.code}
                                                                </span>
                                                                <span className="lx-coupon-desc">
                                                                    {c.description || c.title || 'Tap to apply this coupon'}
                                                                </span>
                                                                {appliedCouponCode === String(c.code).toUpperCase() && (
                                                                    <span className="lx-coupon-tick">
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Insurance / Care+ add-on */}
                                <label className="lx-insurance">
                                    <input
                                        type="checkbox"
                                        checked={insuranceAdded}
                                        onChange={() => {
                                            const newVal = !insuranceAdded;
                                            setInsuranceAdded(newVal);
                                            debouncedUpdateCartOptions({ deliverySpeed, insuranceAdded: newVal });
                                        }}
                                    />
                                    <span className="lx-cbox" />
                                    <span className="lx-insurance-body">
                                        <span className="lx-insurance-title">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /></svg>
                                            Add Care+ Protection
                                        </span>
                                        <span className="lx-insurance-sub">2-year damage & defect cover · ₹49 only</span>
                                    </span>
                                </label>

                                {/* Price details */}
                                <div className="lx-price-card">
                                    <h3 className="lx-summary-title">PRICE DETAILS <span>({itemCount} item{itemCount !== 1 ? 's' : ''})</span></h3>

                                    <div className="lx-prow">
                                        <span>Total MRP</span>
                                        <span>₹{subtotal}</span>
                                    </div>
                                    {summary.baseDiscount > 0 && (
                                        <div className="lx-prow">
                                            <span>Discount on MRP</span>
                                            <span className="lx-savetxt">−₹{summary.baseDiscount}</span>
                                        </div>
                                    )}
                                    {couponApplied && summary.couponDiscount > 0 && (
                                        <div className="lx-prow">
                                            <span>Coupon Discount <em>({appliedCouponCode})</em></span>
                                            <span className="lx-savetxt">−₹{summary.couponDiscount}</span>
                                        </div>
                                    )}
                                    <div className="lx-prow">
                                        <span>Shipping Fee</span>
                                        <span className={shipping === 0 ? 'lx-free' : ''}>
                                            {shipping === 0 ? 'FREE' : `₹${shipping}`}
                                        </span>
                                    </div>
                                    {summary.expressDeliveryFee > 0 && (
                                        <div className="lx-prow">
                                            <span>Express Delivery</span>
                                            <span>₹{summary.expressDeliveryFee}</span>
                                        </div>
                                    )}
                                    {summary.giftWrapCharge > 0 && (
                                        <div className="lx-prow">
                                            <span>Gift Wrap</span>
                                            <span>₹{summary.giftWrapCharge}</span>
                                        </div>
                                    )}
                                    {summary.insuranceCharge > 0 && (
                                        <div className="lx-prow">
                                            <span>Care+ Protection</span>
                                            <span>₹{summary.insuranceCharge}</span>
                                        </div>
                                    )}
                                    <div className="lx-prow">
                                        <span>GST / Tax</span>
                                        <span>₹{gst}</span>
                                    </div>

                                    <div className="lx-total-row">
                                        <span>Total Amount</span>
                                        <span>₹{grandTotal}</span>
                                    </div>

                                    {summary.totalSavings > 0 && (
                                        <div className="lx-saved-banner">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            You will save <strong>₹{summary.totalSavings}</strong> on this order
                                        </div>
                                    )}

                                    {/* Loyalty rewards */}
                                    {rewardsEarned > 0 && (
                                        <div className="lx-rewards">
                                            <span className="lx-rewards-icon">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                            </span>
                                            <span>Earn <strong>{rewardsEarned} points</strong> · ₹{rewardsEarned} off next order</span>
                                        </div>
                                    )}
                                </div>

                                {/* Checkout CTA */}
                                <Link to="/checkout" className="lx-checkout">
                                    <span className="lx-checkout-shine" />
                                    <span className="lx-checkout-label">PLACE ORDER · ₹{grandTotal}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </Link>

                                {/* Trust mini-bar */}
                                <div className="lx-secure">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Safe and Secure Payments · Easy returns · 100% Authentic products
                                </div>

                                {/* Payment methods preview */}
                                <div className="lx-paymeths">
                                    <span className="lx-paymeth pm-visa" title="Visa"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#1a1f71">VISA</text></svg></span>
                                    <span className="lx-paymeth pm-mc" title="Mastercard"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><circle cx="16" cy="8" r="5" fill="#eb001b" /><circle cx="24" cy="8" r="5" fill="#f79e1b" /><text x="32" y="12" fontWeight="bold" fontSize="8" fill="#1a1f71">MC</text></svg></span>
                                    <span className="lx-paymeth pm-amex" title="American Express"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="9" fill="#2e77bb">AMEX</text></svg></span>
                                    <span className="lx-paymeth pm-upi" title="UPI"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#4caf50">UPI</text></svg></span>
                                    <span className="lx-paymeth pm-rupay" title="RuPay"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#005ba2">RUPAY</text></svg></span>
                                    <span className="lx-paymeth pm-cod" title="Cash on Delivery"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#222">COD</text></svg></span>
                                </div>
                            </div>
                        </aside>
                    </div>
                ) : !cartLoading && (
                    <motion.div
                        className="lx-empty-premium"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Trust Badges Section */}
                        <div className="lx-empty-trust-section">
                            <div className="lx-empty-trust-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span>100% Secure</span>
                            </div>
                            <div className="lx-empty-trust-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg>
                                <span>Easy Returns</span>
                            </div>
                            <div className="lx-empty-trust-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                                <span>Free Shipping</span>
                            </div>
                            <div className="lx-empty-trust-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26H22L17.55 12.52L20.64 18.78L12 13.61L3.36 18.78L6.45 12.52L2 8.26H8.91L12 2Z"/></svg>
                                <span>Authentic</span>
                            </div>
                        </div>

                        {/* Empty Bag Section */}
                        <div className="lx-empty">
                            <div className="lx-eico lx-eico-bag-premium">
                                <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                    <path d="M3 6h18" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            </div>
                            <h4 className="lx-empty-title">Your bag is empty</h4>
                            <p className="lx-empty-subtitle">Looks like you haven't added anything yet. Let's pick something special for you.</p>
                            
                            <div className="lx-empty-actions">
                                <Link to="/shop/All" className="lx-ebtn lx-ebtn-primary">
                                    <span>START SHOPPING</span>
                                </Link>
                            </div>

                            {savedItems.length > 0 && (
                                <p className="lx-empty-hint">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    You have <strong>{savedItems.length}</strong> item{savedItems.length !== 1 ? 's' : ''} saved for later.
                                </p>
                            )}

                            {/* Optional: Quick Links */}
                            <div className="lx-empty-quick-links">
                                <Link to="/shop/All" className="lx-quick-link">Shop New Arrivals</Link>
                                <Link to="/shop/All" className="lx-quick-link">View Bestsellers</Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ══ REMOVE CONFIRMATION MODAL ══ */}
            <AnimatePresence>
                {removeConfirmId && (
                    <motion.div
                        className="lx-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setRemoveConfirmId(null)}
                    >
                        <motion.div
                            className="lx-modal"
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.96 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="lx-modal-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </div>
                            <h4>Remove from bag?</h4>
                            <p>You can always move it to your wishlist instead — keep it for later.</p>
                            <div className="lx-modal-actions">
                                <button
                                    className="lx-modal-secondary"
                                    onClick={() => {
                                        const item = cart.find(i => (i._id || i.id) === removeConfirmId);
                                        if (item) moveToWishlist(item);
                                        setRemoveConfirmId(null);
                                    }}
                                >Move to Wishlist</button>
                                <button
                                    className="lx-modal-primary"
                                    onClick={() => {
                                        const id = removeConfirmId;
                                        setRemoveConfirmId(null);
                                        removeProduct(id);
                                    }}
                                >Remove</button>
                            </div>
                            <button className="lx-modal-x" onClick={() => setRemoveConfirmId(null)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ STICKY MOBILE CHECKOUT BAR (expandable) ══ */}
            {!cartLoading && cart && cart.length > 0 && (
                <>
                    <AnimatePresence>
                        {summaryExpanded && (
                            <motion.div
                                className="lx-sheet-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSummaryExpanded(false)}
                            />
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {summaryExpanded && (
                            <motion.div
                                className="lx-sheet"
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="lx-sheet-handle" onClick={() => setSummaryExpanded(false)} />
                                <h4 className="lx-sheet-title">Price Details</h4>
                                <div className="lx-prow"><span>Total MRP</span><span>₹{summary.subtotal}</span></div>
                                {summary.baseDiscount > 0 && (
                                    <div className="lx-prow"><span>Discount</span><span className="lx-savetxt">−₹{summary.baseDiscount}</span></div>
                                )}
                                {couponApplied && summary.couponDiscount > 0 && (
                                    <div className="lx-prow"><span>Coupon ({appliedCouponCode})</span><span className="lx-savetxt">−₹{summary.couponDiscount}</span></div>
                                )}
                                <div className="lx-prow"><span>Shipping</span><span className={summary.shipping === 0 ? 'lx-free' : ''}>{summary.shipping === 0 ? 'FREE' : `₹${summary.shipping}`}</span></div>
                                <div className="lx-prow"><span>GST</span><span>₹{summary.gst}</span></div>
                                <div className="lx-total-row"><span>Total</span><span>₹{grandTotal}</span></div>
                                {summary.totalSavings > 0 && (
                                    <div className="lx-saved-banner">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        You will save <strong>₹{summary.totalSavings}</strong>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="lx-sticky-mobile">
                        <button
                            type="button"
                            className="lx-sticky-info"
                            onClick={() => setSummaryExpanded(s => !s)}
                            aria-expanded={summaryExpanded}
                        >
                            <span className="lx-sticky-amount">₹{grandTotal}</span>
                            {summary.totalSavings > 0 ? (
                                <span className="lx-sticky-saved">You save ₹{summary.totalSavings}</span>
                            ) : (
                                <span className="lx-sticky-saved">View detail</span>
                            )}
                            <svg className={`lx-chev ${summaryExpanded ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <Link to="/checkout" className="lx-sticky-btn">
                            PLACE ORDER
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </Link>
                    </div>
                </>
            )}

            {/* ══ SCOPED PREMIUM STYLES ══ */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap');

                .lx-cart {
                    --ink:        #1a1d29;
                    --ink-mid:    #4a4f5e;
                    --ink-soft:   #696b79;
                    --ink-muted:  #94969f;
                    --line:       #ebebed;
                    --line-d:     #d4d5d9;
                    --bg:         #fafafa;
                    --white:      #ffffff;
                    --pink:       #ff3f6c;
                    --pink-dark:  #e8345d;
                    --pink-soft:  #ffe4ec;
                    --green:      #03a685;
                    --green-soft: #dff7f0;
                    --orange:     #ff905a;
                    --gold:       #c9a96e;
                    --gold-deep:  #a88a5a;
                    --shadow:     0 1px 2px rgba(26,29,41,0.04), 0 1px 3px rgba(26,29,41,0.06);
                    --shadow-lg:  0 8px 28px rgba(26,29,41,0.10), 0 2px 6px rgba(26,29,41,0.05);
                    --shadow-xl:  0 24px 48px -12px rgba(26,29,41,0.18);
                    --r:          8px;
                    --r-lg:       14px;
                    --serif:      'Playfair Display', Georgia, serif;
                    --sans:       'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: var(--bg);
                    font-family: var(--sans);
                    color: var(--ink);
                    min-height: 100vh;
                    -webkit-font-smoothing: antialiased;
                }

                /* ── HERO ── */
                .lx-hero {
                    position: relative;
                    background: linear-gradient(135deg, #0f1014 0%, #1a1c25 50%, #251b2a 100%);
                    min-height: 340px;
                    display: flex; align-items: center; justify-content: center;
                    text-align: center; overflow: hidden;
                    padding: 70px 24px;
                }
                .lx-hero-bg {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 800px 400px at 20% 20%, rgba(255,63,108,0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 700px 400px at 85% 80%, rgba(201,169,110,0.18) 0%, transparent 60%);
                    pointer-events: none;
                }
                .lx-hero-noise {
                    position: absolute; inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
                    pointer-events: none;
                }
                .lx-hero-glow {
                    position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5;
                    pointer-events: none;
                }
                .lx-hero-glow-1 { width: 320px; height: 320px; background: rgba(201,169,110,0.35); top: -80px; left: 10%; animation: floatA 9s ease-in-out infinite; }
                .lx-hero-glow-2 { width: 280px; height: 280px; background: rgba(255,63,108,0.28); bottom: -100px; right: 8%; animation: floatB 11s ease-in-out infinite; }
                @keyframes floatA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,40px); } }
                @keyframes floatB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-20px,-30px); } }

                .lx-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; max-width: 720px; width: 100%; }
                .lx-hero-eyebrow {
                    display: flex; align-items: center; gap: 14px;
                    font-size: 11px; font-weight: 700;
                    letter-spacing: 4px; color: var(--gold); text-transform: uppercase;
                    margin-bottom: 18px;
                }
                .lx-eline { display: block; width: 36px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
                .lx-hero-title { font-family: var(--serif); font-size: clamp(2.4rem, 5.4vw, 4.2rem); font-weight: 600; color: #fff; line-height: 1.05; margin: 0 0 14px; letter-spacing: -0.015em; }
                .lx-hero-title em { font-style: italic; color: var(--gold); font-weight: 500; }
                .lx-hero-sub { font-size: 14px; color: rgba(255,255,255,0.72); max-width: 520px; margin: 0 auto; letter-spacing: 0.3px; }

                /* Steps */
                .lx-steps {
                    margin-top: 32px;
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; max-width: 520px; width: 100%;
                }
                .lx-step {
                    display: flex; align-items: center; gap: 10px;
                    color: rgba(255,255,255,0.5);
                    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
                }
                .lx-step-num {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 50%;
                    border: 1.5px solid rgba(255,255,255,0.2);
                    font-size: 12px; font-weight: 800;
                    color: rgba(255,255,255,0.5);
                    background: rgba(255,255,255,0.04);
                }
                .lx-step.active { color: #fff; }
                .lx-step.active .lx-step-num {
                    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%);
                    border-color: var(--gold);
                    color: #14151a;
                    box-shadow: 0 0 0 4px rgba(201,169,110,0.2), 0 6px 16px rgba(201,169,110,0.35);
                }
                .lx-step-line { flex: 1; max-width: 50px; height: 1px; background: rgba(255,255,255,0.18); }

                .lx-hero-live {
                    margin-top: 22px;
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 7px 14px; border-radius: 999px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    backdrop-filter: blur(8px);
                    font-size: 11.5px; color: rgba(255,255,255,0.78); letter-spacing: 0.3px;
                }
                .lx-hero-live strong { color: #fff; font-weight: 800; }
                .lx-live-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #4ade80;
                    box-shadow: 0 0 0 0 rgba(74,222,128,0.7);
                    animation: livepulse 1.6s infinite;
                }
                @keyframes livepulse { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); } 70% { box-shadow: 0 0 0 8px rgba(74,222,128,0); } 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } }

                /* TRUST */
                .lx-trust { background: var(--white); border-bottom: 1px solid var(--line); }
                .lx-trust-inner {
                    max-width: 1320px; margin: 0 auto;
                    padding: 14px 24px;
                    display: flex; align-items: center; justify-content: space-around;
                    gap: 24px; flex-wrap: wrap;
                }
                .lx-trust-item {
                    display: inline-flex; align-items: center; gap: 10px;
                    font-size: 13px; color: var(--ink-soft);
                }
                .lx-trust-item svg { color: var(--ink); flex-shrink: 0; }
                .lx-trust-item strong { color: var(--ink); font-weight: 700; }

                /* MAIN */
                .lx-cart-wrap {
                    max-width: 1320px; margin: 0 auto;
                    padding: 26px 24px 80px;
                }
                .lx-cart-grid {
                    display: grid;
                    grid-template-columns: 1fr 400px;
                    gap: 24px;
                    align-items: start;
                }
                .lx-items-col { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
                .lx-summary-col { position: sticky; top: 16px; }

                /* Intro card */
                .lx-intro {
                    background: var(--white);
                    border: 1px solid var(--line);
                    border-radius: var(--r-lg);
                    padding: 16px 20px;
                    display: flex; align-items: center; justify-content: space-between;
                    box-shadow: var(--shadow);
                    flex-wrap: wrap; gap: 12px;
                }
                .lx-intro-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-muted); text-transform: uppercase; margin: 0 0 4px; }
                .lx-intro-title { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); margin: 0; line-height: 1.2; }
                .lx-intro-meta { display: flex; align-items: center; gap: 10px; }
                .lx-intro-eta {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: var(--green-soft); color: var(--green);
                    font-size: 12px; font-weight: 600;
                    padding: 6px 12px; border-radius: 999px;
                    border: 1px solid rgba(3,166,133,0.25);
                    display: inline-flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #fffdf8 0%, #ffffff 100%); 
    color: var(--gold);
                    font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;
                    padding: 8px 14px; border-radius: 999px;
                       border: 1px solid rgba(212, 175, 55, 0.5);
    background: linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0a0a0a 100%);
                    box-shadow: 0 4px 12px rgba(201,168,76,0.08);
                }
                .lx-intro-eta strong { font-weight: 800; }
                .lx-intro-eta svg { color: var(--gold-deep); }
                .lx-intro-eta strong { font-weight: 800; color: #f3f4f6; margin-left: 2px; }

                /* Free shipping bar */
                .lx-shipbar {
                    background: linear-gradient(135deg, #fff8f1 0%, #ffffff 100%);
                    border: 1px solid #ffe1cd;
                    border-radius: var(--r-lg);
                    padding: 14px 18px;
                }
                .lx-shipbar-text {
                    margin: 0 0 8px; font-size: 13px; color: var(--ink);
                    display: flex; align-items: center; gap: 8px;
                }
                .lx-shipbar-text svg { color: var(--orange); flex-shrink: 0; }
                .lx-shipbar-text strong { color: var(--orange); font-weight: 800; }
                .lx-shipbar-success { color: var(--green); }
                .lx-shipbar-success svg { color: var(--green); }
                .lx-shipbar-success strong { color: var(--green); }
                .lx-shipbar-track {
                    height: 6px; background: rgba(255,144,90,0.15);
                    border-radius: 999px; overflow: hidden;
                }
                .lx-shipbar-fill {
                    height: 100%; background: linear-gradient(90deg, var(--orange) 0%, #ff7a3d 100%);
                    border-radius: 999px;
                }
                .lx-shipbar-fill.done { background: linear-gradient(90deg, var(--green) 0%, var(--gold) 100%); }
                .lx-shipbar-milestones {
                    display: flex; justify-content: space-between; gap: 12px;
                    margin-top: 10px; font-size: 11px; color: var(--ink-muted); font-weight: 600;
                }
                .lx-shipbar-milestones span { display: inline-flex; align-items: center; gap: 5px; }
                .lx-shipbar-milestones .lx-mile-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: var(--line-d); border: 1.5px solid var(--white);
                    box-shadow: 0 0 0 1px var(--line-d);
                }
                .lx-shipbar-milestones .reached { color: var(--green); font-weight: 800; }
                .lx-shipbar-milestones .reached .lx-mile-dot {
                    background: var(--green);
                    box-shadow: 0 0 0 1px var(--green), 0 0 0 4px rgba(3,166,133,0.18);
                }

                /* Bulk select */
                .lx-bulk {
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); padding: 12px 16px;
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 12px; flex-wrap: wrap;
                    box-shadow: var(--shadow);
                }
                .lx-bulk-check { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
                .lx-bulk-check input { position: absolute; opacity: 0; pointer-events: none; }
                .lx-cbox {
                    display: inline-flex; width: 18px; height: 18px;
                    border: 1.5px solid var(--line-d); border-radius: 4px;
                    background: var(--white); position: relative;
                    transition: all 0.18s; flex-shrink: 0;
                }
                .lx-bulk-check input:checked + .lx-cbox,
                .lx-item-select input:checked + .lx-cbox,
                .lx-insurance input:checked + .lx-cbox {
                    background: var(--ink); border-color: var(--ink);
                }
                .lx-bulk-check input:checked + .lx-cbox::after,
                .lx-item-select input:checked + .lx-cbox::after,
                .lx-insurance input:checked + .lx-cbox::after {
                    content: ''; position: absolute; left: 5px; top: 1px;
                    width: 5px; height: 10px; border: solid #fff;
                    border-width: 0 2px 2px 0; transform: rotate(45deg);
                }
                .lx-bulk-check input:indeterminate + .lx-cbox {
                    background: var(--ink); border-color: var(--ink);
                }
                .lx-bulk-check input:indeterminate + .lx-cbox::after {
                    content: ''; position: absolute; left: 3px; top: 7px;
                    width: 10px; height: 2px; background: #fff;
                }
                .lx-bulk-label { font-size: 13px; font-weight: 700; color: var(--ink); }
                .lx-bulk-actions { display: flex; gap: 8px; flex-wrap: wrap; }
                .lx-bulk-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: var(--white); color: var(--ink);
                    border: 1px solid var(--line-d); border-radius: 6px;
                    padding: 7px 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.6px;
                    cursor: pointer; transition: all 0.2s;
                }
                .lx-bulk-btn:hover { border-color: var(--ink); }
                .lx-bulk-btn.lx-bulk-danger:hover { background: var(--pink); color: #fff; border-color: var(--pink); }
                .lx-bulk-btn.lx-bulk-danger:hover svg { color: #fff; }

                /* Items */
                .lx-items { display: flex; flex-direction: column; gap: 12px; }
                .lx-item {
                    background: var(--white);
                    border: 1px solid var(--line);
                    border-radius: var(--r-lg);
                    padding: 16px;
                    display: flex; gap: 14px;
                    box-shadow: var(--shadow);
                    transition: border-color 0.2s, box-shadow 0.25s, transform 0.25s;
                    position: relative;
                }
                .lx-item:hover { border-color: var(--line-d); box-shadow: var(--shadow-lg); }
                .lx-item.removing { opacity: 0.5; pointer-events: none; }
                .lx-item.selected { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink), var(--shadow-lg); }

                .lx-item-select {
                    display: inline-flex; align-self: flex-start;
                    cursor: pointer; padding-top: 6px;
                }
                .lx-item-select input { position: absolute; opacity: 0; pointer-events: none; }

                .lx-item-img-link { flex-shrink: 0; text-decoration: none; }
                .lx-item-img {
                    position: relative;
                    width: 140px; /* pehle 110px tha, ab bada kiya */
                    aspect-ratio: 3/4;
                    min-height: 186px; /* height ko bhi fix kiya for consistency */
                    border-radius: var(--r);
                    overflow: hidden; background: #f5f5f6;
                    border: 1px solid var(--line);
                }
                .lx-item-img img {
                    width: 100%; height: 100%; object-fit: cover; display: block;
                    transition: transform 0.5s ease;
                }
                .lx-item:hover .lx-item-img img { transform: scale(1.05); }
                .mp-ribbon {
                    position: absolute; top: 0; left: 0;
                    background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
                    color: var(--gold);
                    border-bottom: 1px solid rgba(201,168,76,0.4);
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 1px;
                    padding: 6px 14px 6px 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 5;
                    clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%);
                    padding-right: 18px;
                }
                .mp-ribbon-lg { font-size: 12px; padding: 10px 22px 10px 14px; }
                .lx-gift-badge {
                    position: absolute; bottom: 6px; right: 6px;
                    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%);
                    color: #fff; padding: 4px;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(168,138,90,0.5);
                    display: flex; align-items: center; justify-content: center;
                }

                .lx-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
                .lx-item-top { display: flex; align-items: flex-start; gap: 12px; }
                .lx-item-info { flex: 1; min-width: 0; }
                .lx-item-brand {
                    font-size: 14px; font-weight: 700; color: var(--ink);
                    margin: 0; line-height: 1.2; text-transform: capitalize;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .lx-item-name {
                    font-size: 13px; color: var(--ink-soft); margin: 2px 0 0;
                    line-height: 1.3;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .lx-item-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
                .lx-meta-chip {
                    background: #f5f5f6; border: 1px solid var(--line);
                    border-radius: 4px; padding: 3px 8px;
                    font-size: 11px; color: var(--ink-soft); font-weight: 500;
                    text-transform: capitalize;
                }
                .lx-meta-chip strong { color: var(--ink); font-weight: 700; }
                .lx-item-signals { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
                .lx-item-eta {
                    margin: 0; font-size: 11px; color: var(--green); font-weight: 600;
                    margin: 0; font-size: 11px; color: var(--ink-mid); font-weight: 600;
                    display: inline-flex; align-items: center; gap: 5px;
                    letter-spacing: 0.3px;
                }
                .lx-item-eta strong { font-weight: 800; }
                .lx-item-eta svg { color: var(--gold-deep); }
                .lx-item-eta strong { font-weight: 800; color: var(--ink); }
                .lx-item-stock {
                    margin: 0; font-size: 11px; color: var(--pink); font-weight: 700;
                    display: inline-flex; align-items: center; gap: 6px;
                }
                .lx-item-stock strong { font-weight: 800; }
                .lx-pulse-dot {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: var(--pink);
                    box-shadow: 0 0 0 0 rgba(255,63,108,0.7);
                    animation: livepulse 1.6s infinite;
                }

                .lx-item-x {
                    background: transparent; border: 1px solid var(--line);
                    border-radius: 50%; width: 28px; height: 28px;
                    display: flex; align-items: center; justify-content: center;
                    color: var(--ink-muted); cursor: pointer; flex-shrink: 0;
                    transition: all 0.18s; padding: 0;
                }
                .lx-item-x:hover:not(:disabled) {
                    background: var(--pink); color: #fff; border-color: var(--pink);
                    box-shadow: 0 4px 10px rgba(255,63,108,0.3);
                }
                .lx-item-x:disabled { opacity: 0.4; cursor: not-allowed; }

                .lx-item-bottom {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 12px; margin-top: 4px;
                }

                /* Quantity stepper */
                .lx-qty {
                    display: inline-flex; align-items: center;
                    border: 1px solid var(--line-d); border-radius: var(--r);
                    background: var(--white); overflow: hidden;
                }
                .lx-qty-btn {
                    width: 32px; height: 32px;
                    background: var(--white); color: var(--ink);
                    border: none; cursor: pointer;
                    font-size: 18px; font-weight: 600;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.18s;
                }
                .lx-qty-btn:hover:not(:disabled) { background: #f5f5f6; }
                .lx-qty-btn:disabled { color: var(--ink-muted); cursor: not-allowed; opacity: 0.5; }
                .lx-qty-num {
                    min-width: 34px; text-align: center;
                    font-size: 13px; font-weight: 700; color: var(--ink);
                    border-left: 1px solid var(--line); border-right: 1px solid var(--line);
                    padding: 0 4px; line-height: 32px;
                }

                .lx-item-price {
                    display: flex; align-items: baseline; gap: 8px;
                }
                .lx-item-final { font-size: 18px; font-weight: 800; color: var(--ink); }
                .lx-item-base { font-size: 12px; color: var(--ink-muted); text-decoration: line-through; }

                .lx-item-actions {
                    display: flex; flex-wrap: wrap; gap: 6px;
                    padding-top: 12px; border-top: 1px dashed var(--line);
                    margin-top: 4px;
                }
                .lx-act {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: var(--white); color: var(--ink);
                    border: 1px solid var(--line-d); border-radius: var(--r);
                    padding: 7px 12px; font-family: var(--sans);
                    font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
                    cursor: pointer; transition: all 0.2s;
                }
                .lx-act svg { color: var(--ink-mid); transition: color 0.18s; }
                .lx-act:hover:not(:disabled) { border-color: var(--ink); }
                .lx-act-wish:hover:not(:disabled) { color: var(--pink); border-color: var(--pink); }
                .lx-act-wish:hover:not(:disabled) svg { color: var(--pink); }
                .lx-act-save:hover:not(:disabled) { color: var(--green); border-color: var(--green); }
                .lx-act-save:hover:not(:disabled) svg { color: var(--green); }
                .lx-act-gift:hover:not(:disabled) { color: var(--gold-deep); border-color: var(--gold); }
                .lx-act-gift:hover:not(:disabled) svg { color: var(--gold-deep); }
                .lx-act-gift.on {
                    color: var(--gold-deep); border-color: var(--gold);
                    background: linear-gradient(135deg, #fff8ec 0%, #fff 100%);
                }
                .lx-act-gift.on svg { color: var(--gold-deep); }
                .lx-act:disabled { opacity: 0.55; cursor: not-allowed; }
                .lx-act-primary {
                    background: var(--ink); color: #fff; border-color: var(--ink);
                    flex: 1; justify-content: center;
                }
                .lx-act-primary:hover:not(:disabled) { background: var(--pink); border-color: var(--pink); color: #fff; }
                .lx-act-ghost {
                    width: 32px; padding: 7px; justify-content: center;
                    color: var(--ink-mid);
                }
                .lx-act-ghost:hover:not(:disabled) {
                    background: #fff5f7; color: var(--pink); border-color: var(--pink);
                }

                .lx-cbadge {
                    display: inline-flex; align-items: center; gap: 5px;
                    background: var(--green-soft); color: var(--green);
                    border: 1px solid rgba(3,166,133,0.25); border-radius: var(--r);
                    font-size: 11px; font-weight: 700; padding: 6px 10px; letter-spacing: 0.3px;
                    margin-left: auto;
                }

                /* Bank Offers */
                .lx-bank {
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); box-shadow: var(--shadow);
                    overflow: hidden;
                }
                .lx-bank-head {
                    padding: 14px 18px; display: flex; align-items: center; gap: 12px;
                    cursor: pointer;
                }
                .lx-bank-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 8px;
                    background: linear-gradient(135deg, #f0f4ff 0%, #e0e9ff 100%);
                    color: #3851a8; border: 1px solid rgba(56,81,168,0.16);
                    flex-shrink: 0;
                }
                .lx-bank-title { font-size: 13px; font-weight: 800; color: var(--ink); margin: 0; }
                .lx-bank-title strong { color: var(--green); font-weight: 800; }
                .lx-bank-sub { font-size: 11px; color: var(--ink-muted); margin: 1px 0 0; }
                .lx-bank-list {
                    border-top: 1px solid var(--line);
                    padding: 14px 18px;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .lx-bank-card {
                    display: flex; align-items: center; gap: 12px;
                    background: linear-gradient(135deg, #fafbff 0%, #ffffff 100%);
                    border: 1px solid var(--line); border-radius: 8px;
                    padding: 11px 14px;
                }
                .lx-bank-card-l { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
                .lx-bank-name { font-size: 12px; color: var(--ink-muted); font-weight: 700; letter-spacing: 0.3px; }
                .lx-bank-text { font-size: 12.5px; color: var(--ink); font-weight: 600; }
                .lx-bank-tag {
                    background: var(--ink); color: #fff;
                    font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
                    padding: 5px 10px; border-radius: 4px; flex-shrink: 0;
                    border: 1px dashed rgba(255,255,255,0.3);
                }

                /* Saved for later */
                .lx-saved {
                    background: var(--white);
                    border: 1px solid var(--line);
                    border-radius: var(--r-lg);
                    padding: 22px;
                    box-shadow: var(--shadow);
                    margin-top: 6px;
                }
                .lx-saved-head {
                    padding-bottom: 16px; border-bottom: 1px solid var(--line); margin-bottom: 16px;
                    display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap;
                }
                .lx-saved-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-muted); text-transform: uppercase; margin: 0 0 4px; }
                .lx-saved-title { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); margin: 0; line-height: 1.2; }
                .lx-saved-title span { color: var(--ink-muted); font-weight: 500; font-size: 16px; font-family: var(--sans); }
                .lx-saved-sort {
                    appearance: none; -webkit-appearance: none;
                    background: var(--white) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231a1d29' stroke-width='2.4'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
                    border: 1px solid var(--line-d); border-radius: 6px;
                    padding: 8px 30px 8px 12px; font-size: 12px; font-weight: 600;
                    color: var(--ink); cursor: pointer; font-family: var(--sans);
                }
                .lx-saved-sort:focus { outline: none; border-color: var(--ink); }

                .lx-saved-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 14px;
                }
                .lx-saved-card {
                    background: var(--white);
                    border: 1px solid var(--line);
                    border-radius: var(--r);
                    overflow: hidden;
                    display: flex; flex-direction: column;
                    transition: border-color 0.2s, box-shadow 0.25s, transform 0.25s;
                }
                .lx-saved-card:hover { border-color: var(--ink); box-shadow: var(--shadow-lg); transform: translateY(-2px); }
                .lx-saved-thumb { aspect-ratio: 3/4; background: #f5f5f6; overflow: hidden; }
                .lx-saved-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .lx-saved-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
                .lx-saved-brand { font-size: 13px; font-weight: 700; color: var(--ink); margin: 0; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .lx-saved-name { font-size: 12px; color: var(--ink-soft); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .lx-saved-meta { font-size: 10px; color: var(--ink-muted); margin: 2px 0 0; text-transform: capitalize; }
                .lx-saved-price { font-size: 14px; font-weight: 800; color: var(--ink); margin: 4px 0 0; }
                .lx-saved-actions { display: flex; gap: 6px; margin-top: 10px; }

                /* Recommended carousel */
                .lx-reco {
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); padding: 20px; box-shadow: var(--shadow);
                }
                .lx-reco-head { margin-bottom: 14px; }
                .lx-reco-scroll {
                    display: flex; gap: 14px; overflow-x: auto;
                    padding-bottom: 8px; margin: 0 -4px;
                    scroll-snap-type: x mandatory;
                    scrollbar-width: thin;
                }
                .lx-reco-scroll::-webkit-scrollbar { height: 6px; }
                .lx-reco-scroll::-webkit-scrollbar-thumb { background: var(--line-d); border-radius: 3px; }
                .lx-reco-card {
                    flex: 0 0 180px; scroll-snap-align: start;
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r); overflow: hidden;
                    text-decoration: none; color: inherit;
                    display: flex; flex-direction: column;
                    transition: all 0.25s;
                }
                .lx-reco-card:hover { border-color: var(--ink); transform: translateY(-2px); box-shadow: var(--shadow-lg); }
                .lx-reco-thumb {
                    aspect-ratio: 3/4; background: #f5f5f6; overflow: hidden; position: relative;
                }
                .lx-reco-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s; }
                .lx-reco-card:hover .lx-reco-thumb img { transform: scale(1.06); }
                .lx-reco-body { padding: 10px; display: flex; flex-direction: column; gap: 2px; }
                .lx-reco-price { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
                .lx-reco-price strong { font-size: 14px; font-weight: 800; color: var(--ink); }
                .lx-reco-price del { font-size: 11px; color: var(--ink-muted); }

                .lx-back-row { padding: 8px 0; }
                .lx-back-link {
                    display: inline-flex; align-items: center; gap: 8px;
                    font-size: 12px; font-weight: 700; letter-spacing: 1px;
                    text-transform: uppercase; color: var(--ink);
                    text-decoration: none;
                    padding: 11px 20px; border: 1.5px solid var(--ink);
                    border-radius: var(--r); background: var(--white);
                    transition: all 0.22s;
                }
                .lx-back-link:hover { background: var(--ink); color: var(--white); }

                /* ── SUMMARY ── */
                .lx-summary {
                    background: var(--white);
                    border: 1px solid var(--line);
                    border-radius: var(--r-lg);
                    box-shadow: var(--shadow);
                    overflow: hidden;
                }

                /* Delivery picker */
                .lx-delivery-pick { padding: 20px 20px 16px; border-bottom: 1px solid var(--line); }
                .lx-delivery-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
                .lx-delivery-opt {
                    background: linear-gradient(135deg, #fdfcfb 0%, #f5f5f6 100%);
                    border: 1px solid var(--line-d);
                    border-radius: var(--r-lg); padding: 16px; cursor: pointer;
                    display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
                    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    position: relative; text-align: left;
                    font-family: var(--sans);
                }
                .lx-delivery-opt:hover { border-color: var(--gold-deep); box-shadow: 0 4px 14px rgba(201,168,76,0.12); transform: translateY(-2px); }
                .lx-delivery-opt.on {
                    border: 1.5px solid var(--gold) !important;
                    background: linear-gradient(135deg, #fffdf5 0%, #ffffff 100%);
                    box-shadow: 0 8px 24px rgba(201,168,76,0.15);
                }
                .lx-delivery-opt.on::after {
                    content: ''; position: absolute; top: 14px; right: 14px;
                    width: 18px; height: 18px; border-radius: 50%;
                    background: var(--gold) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") no-repeat center;
                    box-shadow: 0 2px 8px rgba(201,168,76,0.4);
                }
                .lx-do-badge {
                    background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
                    color: var(--gold);
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-weight: 800;
                    font-size: 9px;
                    letter-spacing: 1.5px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                    text-transform: uppercase;
                    border: 1px solid rgba(201,168,76,0.3);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    margin-bottom: 4px;
                }
                .lx-do-name { font-size: 14px; font-weight: 800; color: var(--ink); margin-top: 2px; letter-spacing: 0.3px; }
                .lx-do-eta { font-size: 12px; color: var(--ink-muted); font-weight: 600; }
                .lx-do-fee { font-size: 12px; font-weight: 800; color: var(--gold-deep); margin-top: 4px; letter-spacing: 0.5px; }

                /* Coupon block */
                .lx-coupon { padding: 16px 20px; border-bottom: 1px solid var(--line); }
                .lx-coupon-head { display: flex; align-items: center; gap: 12px; }
                .lx-coupon-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 8px;
                    background: linear-gradient(135deg, #fff5f7 0%, #ffe4ec 100%);
                    color: var(--pink); border: 1px solid rgba(255,63,108,0.18);
                    background: linear-gradient(135deg, #fffcf5 0%, #fff6e0 100%);
                    color: var(--gold-deep); border: 1px solid rgba(201,168,76,0.25);
                    flex-shrink: 0;
                }
                .lx-coupon-title { font-size: 13px; font-weight: 800; color: var(--ink); margin: 0; letter-spacing: 0.2px; }
                .lx-coupon-sub { font-size: 11px; color: var(--ink-muted); margin: 1px 0 0; }
                .lx-coupon-applied { font-size: 11px; color: var(--green); margin: 1px 0 0; font-weight: 600; }
                .lx-coupon-applied strong { font-weight: 800; }
                .lx-coupon-toggle {
                    background: transparent; border: none; padding: 4px 8px;
                    color: var(--pink); font-size: 11px; font-weight: 800; letter-spacing: 1.3px;
                    color: var(--gold-deep); font-size: 11px; font-weight: 800; letter-spacing: 1.3px;
                    cursor: pointer; text-transform: uppercase;
                    display: inline-flex; align-items: center; gap: 4px;
                    font-family: var(--sans);
                }
                .lx-coupon-toggle:hover { color: var(--pink-dark); }
                .lx-coupon-toggle:hover { color: var(--gold); }
                .lx-chev { transition: transform 0.22s ease; }
                .lx-chev.open { transform: rotate(180deg); }

                .lx-coupon-panel { overflow: hidden; }
                .lx-coupon-input-row { display: flex; gap: 8px; margin-top: 14px; }
                .lx-coupon-input {
                    flex: 1; min-width: 0;
                    padding: 11px 14px;
                    border: 1.5px dashed var(--line-d);
                    border-radius: var(--r);
                    font-family: var(--sans); font-size: 13px; color: var(--ink);
                    background: var(--white); outline: none;
                    text-transform: uppercase; letter-spacing: 1px;
                    transition: border-color 0.2s;
                }
                .lx-coupon-input::placeholder { text-transform: none; letter-spacing: 0; }
                .lx-coupon-input:focus { border-color: var(--pink); border-style: solid; }
                .lx-coupon-input:focus { border-color: var(--gold); border-style: solid; box-shadow: 0 0 0 3px rgba(201,168,76,0.1); }
                .lx-coupon-apply {
                    padding: 11px 18px;
                    background: var(--pink); color: #fff;
                    border: 1px solid var(--pink); border-radius: var(--r);
                    padding: 11px 20px;
                    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%);
                    color: #fff;
                    border: none; border-radius: var(--r);
                    font-family: var(--sans); font-size: 11px; font-weight: 800; letter-spacing: 1.4px;
                    cursor: pointer; transition: all 0.22s;
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(201,168,76,0.2);
                }
                .lx-coupon-apply:hover:not(:disabled) {
                    background: var(--pink-dark); border-color: var(--pink-dark);
                    box-shadow: 0 6px 14px rgba(255,63,108,0.3);
                    background: linear-gradient(135deg, var(--gold-deep) 0%, var(--gold) 100%);
                    box-shadow: 0 8px 20px rgba(201,168,76,0.35);
                    transform: translateY(-2px);
                }
                .lx-coupon-apply:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(201,168,76,0.2);
                }
                .lx-coupon-apply:disabled { background: var(--ink-muted); border-color: var(--ink-muted); cursor: not-allowed; opacity: 0.6; }
                .lx-coupon-err { font-size: 11px; color: var(--pink); margin: 6px 0 0; font-weight: 600; }
                .lx-coupon-err { font-size: 11px; color: #dc2626; margin: 6px 0 0; font-weight: 600; }

                .lx-coupon-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
                .lx-coupon-list-title { font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: var(--ink-muted); text-transform: uppercase; margin: 0 0 4px; }
                .lx-coupon-card {
                    display: flex; align-items: center; gap: 10px;
                    background: linear-gradient(135deg, #fffaf3 0%, #ffffff 100%);
                    border: 1px dashed #f0c898;
                    border-radius: var(--r); padding: 10px 12px;
                    cursor: pointer; text-align: left;
                    transition: all 0.2s; font-family: var(--sans);
                    width: 100%;
                }
                .lx-coupon-card:hover { border-color: var(--orange); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,144,90,0.18); }
                .lx-coupon-card.applied { border-color: var(--green); border-style: solid; background: linear-gradient(135deg, #f0fcf7 0%, #ffffff 100%); }
                .lx-coupon-tag {
                    display: inline-flex; align-items: center; gap: 5px;
                    background: linear-gradient(135deg, var(--orange) 0%, #ff7a3d 100%);
                    color: #fff; font-size: 11px; font-weight: 800;
                    padding: 4px 9px; border-radius: 3px;
                    letter-spacing: 0.5px;
                    flex-shrink: 0;
                }
                .lx-coupon-card.applied .lx-coupon-tag { background: linear-gradient(135deg, var(--green) 0%, #02c197 100%); }
                .lx-coupon-desc { font-size: 11px; color: var(--ink-mid); flex: 1; line-height: 1.4; }
                .lx-coupon-tick {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 20px; height: 20px; border-radius: 50%;
                    background: var(--green); color: #fff;
                    flex-shrink: 0;
                }

                /* Insurance */
                .lx-insurance {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--line);
                    cursor: pointer; user-select: none;
                    background: linear-gradient(135deg, #f7fbff 0%, #ffffff 100%);
                }
                .lx-insurance input { position: absolute; opacity: 0; pointer-events: none; }
                .lx-insurance-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
                .lx-insurance-title {
                    font-size: 13px; font-weight: 800; color: var(--ink);
                    display: inline-flex; align-items: center; gap: 6px;
                }
                .lx-insurance-title svg { color: var(--green); }
                .lx-insurance-sub { font-size: 11px; color: var(--ink-muted); }

                /* Price details */
                .lx-price-card { padding: 18px 20px; }
                .lx-summary-title {
                    font-size: 11px; font-weight: 800; letter-spacing: 1.6px;
                    color: var(--ink); text-transform: uppercase;
                    margin: 0 0 14px; padding-bottom: 12px;
                    border-bottom: 1px solid var(--line);
                }
                .lx-summary-title span { color: var(--ink-muted); font-weight: 600; letter-spacing: 0.5px; text-transform: none; font-size: 12px; margin-left: 4px; }
                .lx-prow {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 10px; font-size: 13px; color: var(--ink-soft);
                }
                .lx-prow > span:first-child { font-weight: 600; color: var(--ink-mid); letter-spacing: 0.3px; }
                .lx-prow > span:last-child { font-weight: 700; color: var(--ink); }
                .lx-prow em { font-style: normal; color: var(--ink-muted); font-size: 11px; }
                .lx-savetxt { color: var(--green) !important; font-weight: 800 !important; }
                .lx-free { color: var(--green) !important; font-weight: 800 !important; letter-spacing: 1px; font-size: 11px; }
                .lx-total-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 0 10px; margin-top: 8px;
                    border-top: 1px dashed var(--line);
                    font-size: 17px; font-weight: 800; color: var(--ink);
                    letter-spacing: 0.2px;
                }
                .lx-total-row > span:first-child {
                    text-transform: uppercase;
                    font-size: 14px;
                    letter-spacing: 1.2px;
                }
                .lx-saved-banner {
                    display: flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    color: #166534;
                    border: 1px dashed rgba(22, 163, 74, 0.4);
                    border-radius: var(--r);
                    padding: 10px 14px; font-size: 12px; font-weight: 600;
                    margin-top: 12px;
                    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.08);
                    letter-spacing: 0.2px;
                }
                .lx-saved-banner svg { color: #16a34a; }
                .lx-saved-banner strong { font-weight: 800; color: #14532d; font-size: 13px; }

                .lx-rewards {
                    margin-top: 10px;
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 14px; border-radius: var(--r);
                    background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
                    border: 1px solid rgba(201, 168, 76, 0.3);
                    font-size: 12px; color: #f3f4f6; font-weight: 500;
                    box-shadow: 0 6px 16px rgba(17, 24, 39, 0.15);
                    letter-spacing: 0.3px;
                }
                .lx-rewards strong { color: var(--gold); font-weight: 800; font-size: 13px; }
                .lx-rewards-icon { 
                    color: var(--gold); display: inline-flex; 
                    background: rgba(201, 168, 76, 0.15);
                    padding: 6px; border-radius: 50%;
                }

                /* Checkout CTA */
                .lx-checkout {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    margin: 18px 20px 14px;
                    padding: 15px 16px;
                    background: linear-gradient(135deg, var(--pink) 0%, #ff5478 100%);
                    color: #fff;
                    border: 1px solid var(--pink); border-radius: var(--r);
                    font-family: var(--sans); font-size: 12.5px; font-weight: 800;
                    letter-spacing: 1.5px; text-transform: uppercase;
                    text-decoration: none;
                    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
                    box-shadow: 0 8px 22px rgba(255,63,108,0.36);
                    position: relative; overflow: hidden;
                }
                .lx-checkout-shine {
                    position: absolute; top: 0; left: -100%;
                    width: 60%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                    transform: skewX(-20deg);
                    transition: left 0.6s;
                }
                .lx-checkout-label { position: relative; z-index: 1; }
                .lx-checkout svg { position: relative; z-index: 1; }
                .lx-checkout:hover {
                    background: linear-gradient(135deg, var(--pink-dark) 0%, #ed3e64 100%);
                    border-color: var(--pink-dark);
                    color: #fff;
                    box-shadow: 0 12px 32px rgba(255,63,108,0.5);
                    transform: translateY(-1px);
                }
                .lx-checkout:hover .lx-checkout-shine { left: 120%; }

                .lx-secure {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 8px 16px;
                    font-size: 11px; color: var(--ink-muted);
                    text-align: center;
                }
                .lx-secure svg { color: var(--green); flex-shrink: 0; }

                .lx-paymeths {
                    display: flex; gap: 10px; align-items: center; margin-top: 12px; flex-wrap: wrap; justify-content: center; padding: 0 16px 16px;
                }
                .lx-paymeth {
                    background: #fff; border-radius: 6px; padding: 2px 6px; font-size: 11px; font-weight: 700; color: var(--ink); border: 1.5px solid var(--gold); letter-spacing: 1.2px; box-shadow: 0 2px 8px rgba(201,168,76,0.08); display: flex; align-items: center; gap: 4px; min-width: 38px; min-height: 18px; transition: box-shadow 0.2s, border-color 0.2s;
                }
                .lx-paymeth svg { display: block; }
                .pm-visa { border-color: #1a1f71 !important; }
                .pm-mc { border-color: #eb001b !important; }
                .pm-amex { border-color: #2e77bb !important; }
                .pm-upi { border-color: #4caf50 !important; }
                .pm-rupay { border-color: #005ba2 !important; }
                .pm-cod { border-color: #222 !important; }
                }

                /* Empty state */
                .lx-empty {
                    text-align: center; padding: 80px 24px;
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); box-shadow: var(--shadow);
                }
                .lx-eico { color: var(--line-d); margin: 0 auto 18px; display: flex; justify-content: center; }
                .lx-eico-bag {
                    color: var(--pink);
                    background: var(--pink-soft);
                    width: 110px; height: 110px;
                    border-radius: 50%;
                    align-items: center; justify-content: center;
                    margin-bottom: 22px;
                }
                .lx-empty h4 { font-family: var(--serif); font-size: 28px; font-weight: 600; color: var(--ink); margin: 0 0 8px; }
                .lx-empty p { font-size: 13px; color: var(--ink-soft); margin: 0 auto 24px; max-width: 380px; line-height: 1.5; }
                .lx-empty-hint { font-size: 12px; color: var(--ink-muted); margin-top: 18px; }
                .lx-empty-hint strong { color: var(--ink); font-weight: 700; }
                .lx-ebtn {
                    display: inline-block;
                    background: var(--pink); color: var(--white); border: 1px solid var(--pink);
                    border-radius: var(--r); padding: 13px 32px;
                    font-family: var(--sans); font-size: 12px; font-weight: 800;
                    letter-spacing: 1.5px; text-transform: uppercase;
                    cursor: pointer; transition: all 0.22s;
                    text-decoration: none;
                    box-shadow: 0 4px 14px rgba(255,63,108,0.28);
                }
                .lx-ebtn:hover { background: var(--pink-dark); border-color: var(--pink-dark); color: #fff; transform: translateY(-2px); box-shadow: 0 8px 22px rgba(255,63,108,0.4); }

                /* Premium Empty State */
                .lx-empty-premium {
                    padding: 40px 24px;
                }
                .lx-empty-trust-section {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px;
                    margin-bottom: 48px; padding: 0;
                    max-width: 800px; margin-left: auto; margin-right: auto;
                }
                .lx-empty-trust-item {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    padding: 14px 12px;
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); text-align: center;
                    box-shadow: var(--shadow);
                    transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
                    font-size: 12px; font-weight: 600; color: var(--ink);
                }
                .lx-empty-trust-item:hover {
                    border-color: var(--gold); box-shadow: 0 4px 16px rgba(201,169,110,0.15);
                    transform: translateY(-2px);
                }
                .lx-empty-trust-item svg { color: var(--gold); flex-shrink: 0; }
                
                .lx-empty {
                    text-align: center; padding: 80px 24px;
                    background: linear-gradient(135deg, var(--white) 0%, #fafbfc 100%);
                    border: 1px solid var(--line);
                    border-radius: var(--r-lg); box-shadow: var(--shadow-lg);
                    position: relative; overflow: hidden;
                }
                .lx-empty::before {
                    content: ''; position: absolute; inset: 0;
                    background: radial-gradient(ellipse at 50% 50%, rgba(201,169,110,0.04) 0%, transparent 70%);
                    pointer-events: none;
                }
                .lx-empty > * { position: relative; z-index: 1; }
                
                .lx-eico-bag-premium {
                    color: var(--pink);
                    background: linear-gradient(135deg, var(--pink-soft) 0%, #ffe4ec 100%);
                    width: 140px; height: 140px;
                    border-radius: 50%; display: flex;
                    align-items: center; justify-content: center;
                    margin: 0 auto 32px;
                    box-shadow: 0 8px 28px rgba(255,63,108,0.25);
                    animation: float-bag 3s ease-in-out infinite;
                }
                @keyframes float-bag { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

                .lx-empty-title {
                    font-family: var(--serif); font-size: 36px; font-weight: 700;
                    color: var(--ink); margin: 0 0 12px;
                    letter-spacing: -0.3px;
                }
                .lx-empty-subtitle {
                    font-size: 15px; color: var(--ink-soft);
                    margin: 0 auto 32px; max-width: 480px;
                    line-height: 1.6; letter-spacing: 0.2px;
                }
                
                .lx-empty-actions {
                    display: flex; gap: 12px; justify-content: center;
                    flex-wrap: wrap; margin-bottom: 24px;
                }
                .lx-ebtn-primary {
                    background: linear-gradient(135deg, var(--pink) 0%, var(--pink-dark) 100%);
                    border: 1px solid var(--pink-dark);
                    padding: 16px 40px;
                    font-size: 13px; font-weight: 800; letter-spacing: 1.8px;
                    border-radius: 8px; box-shadow: 0 6px 20px rgba(255,63,108,0.35);
                    transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
                    position: relative;
                }
                .lx-ebtn-primary::before {
                    content: ''; position: absolute; inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    border-radius: 8px;
                    opacity: 0; transition: opacity 0.3s;
                }
                .lx-ebtn-primary:hover {
                    background: linear-gradient(135deg, var(--pink-dark) 0%, #e63853 100%);
                    transform: translateY(-3px);
                    box-shadow: 0 10px 28px rgba(255,63,108,0.45);
                }
                .lx-ebtn-primary:hover::before { opacity: 1; }

                .lx-empty-quick-links {
                    display: flex; gap: 12px; justify-content: center;
                    flex-wrap: wrap; margin-top: 28px; padding-top: 24px;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }
                .lx-quick-link {
                    padding: 10px 18px; border-radius: 6px;
                    font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
                    color: var(--pink); background: var(--pink-soft);
                    border: 1px solid rgba(255,63,108,0.3);
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .lx-quick-link:hover {
                    background: var(--pink); color: #fff;
                    border-color: var(--pink);
                    box-shadow: 0 4px 12px rgba(255,63,108,0.25);
                }

                .lx-empty-hint {
                    font-size: 13px; color: var(--ink-soft);
                    margin: 18px auto 0; display: flex; align-items: center;
                    justify-content: center; gap: 8px; max-width: 420px;
                }
                .lx-empty-hint svg { flex-shrink: 0; }
                .lx-empty-hint strong { color: var(--gold); font-weight: 700; }

                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .lx-empty-trust-section {
                        grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px;
                    }
                    .lx-empty-trust-item { padding: 12px 8px; font-size: 11px; }
                    .lx-empty { padding: 60px 16px; }
                    .lx-eico-bag-premium { width: 110px; height: 110px; margin-bottom: 24px; }
                    .lx-empty-title { font-size: 28px; }
                    .lx-empty-subtitle { font-size: 14px; margin-bottom: 24px; }
                    .lx-ebtn-primary { padding: 14px 32px; font-size: 12px; }
                    .lx-empty-actions { margin-bottom: 20px; }
                }
                @media (max-width: 480px) {
                    .lx-empty-trust-section { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 24px; }
                    .lx-empty-trust-item { padding: 10px 6px; font-size: 10px; }
                    .lx-empty { padding: 40px 12px; }
                    .lx-eico-bag-premium { width: 90px; height: 90px; margin-bottom: 20px; }
                    .lx-empty-title { font-size: 24px; }
                    .lx-empty-subtitle { font-size: 13px; margin-bottom: 20px; }
                    .lx-ebtn-primary { padding: 12px 24px; font-size: 11px; letter-spacing: 1.2px; }
                    .lx-quick-link { padding: 8px 14px; font-size: 11px; }
                }

                /* Skeletons */
                .lx-skel { pointer-events: none; }
                .lx-skel-line { background: #ececef; border-radius: 3px; }
                .lx-shimmer { background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%); background-size: 200% 100%; animation: lxShimmer 1.4s infinite linear; }
                @keyframes lxShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

                /* Modal */
                .lx-modal-overlay {
                    position: fixed; inset: 0; z-index: 1000;
                    background: rgba(15,16,20,0.55);
                    backdrop-filter: blur(6px);
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px;
                }
                .lx-modal {
                    background: var(--white); border-radius: var(--r-lg);
                    box-shadow: var(--shadow-xl);
                    padding: 32px 28px 24px; max-width: 420px; width: 100%;
                    text-align: center; position: relative;
                }
                .lx-modal-icon {
                    width: 56px; height: 56px; border-radius: 50%;
                    background: linear-gradient(135deg, #fff5f7 0%, #ffe4ec 100%);
                    color: var(--pink);
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 16px;
                }
                .lx-modal h4 { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); margin: 0 0 6px; }
                .lx-modal p { font-size: 13px; color: var(--ink-soft); margin: 0 0 22px; line-height: 1.5; }
                .lx-modal-actions { display: flex; gap: 8px; }
                .lx-modal-secondary, .lx-modal-primary {
                    flex: 1; padding: 12px 14px;
                    border-radius: var(--r); cursor: pointer;
                    font-family: var(--sans); font-size: 11.5px; font-weight: 800;
                    letter-spacing: 1.2px; text-transform: uppercase;
                    transition: all 0.2s;
                }
                .lx-modal-secondary {
                    background: var(--white); color: var(--ink);
                    border: 1.5px solid var(--ink);
                }
                .lx-modal-secondary:hover { background: var(--ink); color: #fff; }
                .lx-modal-primary {
                    background: var(--pink); color: #fff;
                    border: 1px solid var(--pink);
                    box-shadow: 0 4px 14px rgba(255,63,108,0.32);
                }
                .lx-modal-primary:hover { background: var(--pink-dark); border-color: var(--pink-dark); }
                .lx-modal-x {
                    position: absolute; top: 12px; right: 12px;
                    background: transparent; border: none; cursor: pointer;
                    padding: 8px; color: var(--ink-muted); border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.18s;
                }
                .lx-modal-x:hover { background: var(--bg); color: var(--ink); }

                /* ── STICKY MOBILE CHECKOUT BAR ── */
                .lx-sticky-mobile {
                    display: none;
                    position: fixed; left: 0; right: 0; bottom: 0;
                    background: var(--white);
                    border-top: 1px solid var(--line);
                    padding: 10px 14px;
                    z-index: 500;
                    box-shadow: 0 -4px 20px rgba(40,44,63,0.14);
                    align-items: center; justify-content: space-between; gap: 12px;
                }
                .lx-sticky-info {
                    display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
                    background: transparent; border: none; padding: 4px 8px; cursor: pointer;
                    font-family: var(--sans); position: relative;
                }
                .lx-sticky-info .lx-chev { position: absolute; right: -8px; top: 50%; transform: translateY(-50%); }
                .lx-sticky-info .lx-chev.open { transform: translateY(-50%) rotate(180deg); }
                .lx-sticky-amount { font-size: 18px; font-weight: 800; color: var(--ink); line-height: 1; }
                .lx-sticky-saved { font-size: 11px; color: var(--green); font-weight: 700; }
                .lx-sticky-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: linear-gradient(135deg, var(--pink) 0%, #ff5478 100%); color: #fff;
                    border-radius: var(--r); padding: 13px 24px;
                    font-size: 12px; font-weight: 800; letter-spacing: 1.4px;
                    text-decoration: none; text-transform: uppercase;
                    box-shadow: 0 6px 18px rgba(255,63,108,0.36);
                }
                .lx-sticky-btn:hover { background: var(--pink-dark); color: #fff; }

                .lx-sheet-backdrop {
                    display: none;
                    position: fixed; inset: 0; z-index: 600;
                    background: rgba(15,16,20,0.5); backdrop-filter: blur(4px);
                }
                .lx-sheet {
                    display: none;
                    position: fixed; left: 0; right: 0; bottom: 60px;
                    background: var(--white);
                    border-top-left-radius: 18px; border-top-right-radius: 18px;
                    padding: 18px 18px 24px;
                    z-index: 700;
                    box-shadow: 0 -10px 40px rgba(15,16,20,0.18);
                    max-height: 70vh; overflow-y: auto;
                }
                .lx-sheet-handle {
                    width: 44px; height: 4px; border-radius: 2px;
                    background: var(--line-d); margin: 0 auto 16px; cursor: pointer;
                }
                .lx-sheet-title {
                    font-family: var(--serif); font-size: 18px; font-weight: 600; color: var(--ink);
                    margin: 0 0 14px;
                }

                @media (prefers-reduced-motion: reduce) {
                    .lx-item, .lx-saved-card, .lx-shipbar-fill, .lx-checkout, .lx-act, .lx-hero-glow
                    { transition: none !important; animation: none !important; }
                }

                /* ── RESPONSIVE ── */
                @media (max-width: 1100px) {
                    .lx-cart-grid { grid-template-columns: 1fr 360px; }
                }
                @media (max-width: 991px) {
                    .lx-cart-grid { grid-template-columns: 1fr; }
                    .lx-summary-col { position: static; }
                    .lx-trust-inner { padding: 12px 16px; gap: 14px; justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; }
                    .lx-trust-item { font-size: 12px; white-space: nowrap; }
                }
                @media (max-width: 767px) {
                    .lx-hero { min-height: 280px; padding: 50px 20px; }
                    .lx-cart-wrap { padding: 18px 14px 100px; }
                    .lx-steps { flex-wrap: wrap; gap: 6px; }
                    .lx-step-line { max-width: 24px; }
                    .lx-step-label { font-size: 10px; letter-spacing: 1px; }
                    .lx-intro-title, .lx-saved-title { font-size: 18px; }
                    .lx-item { padding: 12px; gap: 10px; }
                    .lx-item-img { width: 88px; }
                    .lx-item-brand { font-size: 13px; }
                    .lx-item-name { font-size: 12px; }
                    .lx-item-final { font-size: 16px; }
                    .lx-item-actions { gap: 5px; }
                    .lx-act { padding: 6px 9px; font-size: 10px; }
                    .lx-saved-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .lx-saved { padding: 16px; }
                    .lx-coupon, .lx-price-card, .lx-delivery-pick, .lx-insurance { padding-left: 16px; padding-right: 16px; }
                    .lx-checkout { display: none; }
                    .lx-sticky-mobile { display: flex; }
                    .lx-sheet { display: block; bottom: 64px; }
                    .lx-sheet-backdrop { display: block; }
                    .lx-reco-card { flex: 0 0 150px; }
                }
                @media (max-width: 420px) {
                    .lx-item { flex-direction: row; }
                    .lx-item-img { width: 100px; }
                    .lx-item-x { width: 26px; height: 26px; }
                    .lx-item-meta { gap: 4px; }
                    .lx-meta-chip { font-size: 10px; padding: 2px 6px; }
                    .lx-saved-grid { grid-template-columns: 1fr; }
                    .lx-pin-row { flex-direction: column; }
                    .lx-pin-btn { width: 100%; }
                    .lx-coupon-input-row { flex-direction: column; }
                    .lx-coupon-apply { width: 100%; }
                    .lx-empty h4 { font-size: 22px; }
                    .lx-delivery-row { grid-template-columns: 1fr; }
                    .lx-bulk-actions { width: 100%; justify-content: stretch; }
                    .lx-bulk-btn { flex: 1; justify-content: center; }
                    .lx-modal { padding: 26px 20px 20px; }
                    .lx-modal-actions { flex-direction: column; }
                }
            `}} />
        </motion.div>
    );
}
