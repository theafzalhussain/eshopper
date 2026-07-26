import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import { useSelector, useDispatch } from 'react-redux';
import './Cart.css';
import CartItemCard from './CartItemCard';
import CartOrderSummary from './CartOrderSummary';
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
        if (cartData) {
            dispatch({ type: GET_CART_RED, data: cartData });
            if (cartData.deliverySpeed) setDeliverySpeed(cartData.deliverySpeed);
            if (cartData.insuranceAdded !== undefined) setInsuranceAdded(cartData.insuranceAdded);
        } else {
            // If backend didn't return cart data, re-fetch to stay in sync
            dispatch(getCart());
        }
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

        // Optimistic UI update - instant feedback
        const updatedItems = cart.map(i => (i._id || i.id) === (item._id || item.id)
            ? { ...i, quantity: newQty, qty: newQty }
            : i);
        dispatch({
            type: GET_CART_RED,
            data: { ...cartState, items: updatedItems }
        });

        // Optimistic summary update (instant total recalculation)
        const priceDiff = Number(item.price || item.finalprice || 0) * (op === 'dec' ? -1 : 1);
        setSummary(prev => ({
            ...prev,
            subtotal: Math.max(0, prev.subtotal + priceDiff),
            grandTotal: Math.max(0, prev.grandTotal + priceDiff)
        }));

        try {
            await axios.put(`/api/cart/update-quantity/${item._id || item.id}`, { userId, quantity: newQty });
            dispatch(getCart());
            refreshSummaryOnly(); // fire and forget — don't await
        } catch (e) {
            dispatch(getCart());
            refreshSummaryOnly();
            if (e.response?.data?.message?.includes('Out of Stock')) {
                toast.error(e.response.data.message);
            } else {
                toast.error('Failed to update quantity.');
            }
        }
    }

    async function removeProduct(id, silent = false) {
        setRemovingIds((prev) => [...prev, id]);

        // Get item price for optimistic summary update
        const removedItem = cart.find(i => (i._id || i.id) === id);
        const itemTotal = removedItem ? Number(removedItem.price || removedItem.finalprice || 0) * Number(removedItem.quantity || removedItem.qty || 1) : 0;

        // Optimistic UI update - remove instantly from view
        dispatch({
            type: GET_CART_RED,
            data: { ...cartState, items: cart.filter(i => (i._id || i.id) !== id) }
        });

        // Optimistic summary update
        setSummary(prev => ({
            ...prev,
            subtotal: Math.max(0, prev.subtotal - itemTotal),
            grandTotal: Math.max(0, prev.grandTotal - itemTotal)
        }));

        try {
            await axios.delete(`/api/cart/remove-item/${id}`, {
                params: { userId, userid: userId },
                data: { userId, userid: userId }
            });
            dispatch(getCart());
            refreshSummaryOnly(); // fire and forget
            if (!silent) toast.info('Item removed from cart.');
        } catch (e) {
            dispatch(getCart());
            refreshSummaryOnly();
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
                                        return (
                                            <CartItemCard
                                                key={itemId}
                                                item={item}
                                                productState={productState}
                                                isSelected={selectedIds.includes(itemId)}
                                                isMoving={movingIds.includes(itemId)}
                                                isSaving={savingIds.includes(itemId)}
                                                isRemoving={removingIds.includes(itemId)}
                                                expectedDelivery={expectedDelivery}
                                                cartNotification={cartNotifications[item.productid || item._id || item.id]}
                                                onToggleSelect={toggleSelect}
                                                onRemoveConfirm={setRemoveConfirmId}
                                                onUpdateQty={updateQty}
                                                onMoveToWishlist={moveToWishlist}
                                                onSaveForLater={saveForLater}
                                                onToggleGiftWrap={handleToggleGiftWrap}
                                            />
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
                        <CartOrderSummary
                            summary={summary}
                            itemCount={itemCount}
                            deliverySpeed={deliverySpeed}
                            setDeliverySpeed={setDeliverySpeed}
                            expectedDelivery={expectedDelivery}
                            insuranceAdded={insuranceAdded}
                            setInsuranceAdded={setInsuranceAdded}
                            coupon={coupon}
                            setCoupon={setCoupon}
                            couponApplied={couponApplied}
                            appliedCouponCode={appliedCouponCode}
                            couponError={couponError}
                            setCouponError={setCouponError}
                            availableCoupons={availableCoupons}
                            couponLoading={couponLoading}
                            showCouponPanel={showCouponPanel}
                            setShowCouponPanel={setShowCouponPanel}
                            handleApplyCoupon={handleApplyCoupon}
                            debouncedUpdateCartOptions={debouncedUpdateCartOptions}
                            rewardsEarned={rewardsEarned}
                            grandTotal={grandTotal}
                        />
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


        </motion.div>
    );
}
