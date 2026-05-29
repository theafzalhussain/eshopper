import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useToast } from './ToastNotification';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { queryClient } from '../queries/queryClient';
import { catalogQueryKeys } from '../queries/catalogQueries';
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators';
import { getSubcategory } from '../Store/ActionCreaters/SubcategoryActionCreators';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { BASE_URL } from '../constants';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';
import VirtualProductGrid, { renderProductCard } from './Performance/VirtualProductGrid';
import { useBrandsQuery, useMaincategoriesQuery, useProductsQuery, useSubcategoriesQuery } from '../queries/catalogQueries';
import { getSocketClient } from './socketClient';

const RECENT_KEY = 'mp_recent_viewed';

export default function Shop() {
    var { maincat } = useParams()
    var dispatch = useDispatch()
    var navigate = useNavigate()
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    const tagParam = params.get('tag');
    const brandParam = params.get('brand');

    // --- STATES ---
    var [mc, setmc] = useState(maincat)
    var [sc, setsc] = useState("All")
    var [br, setbr] = useState(brandParam || "All")
    var [size, setSize] = useState("All")
    var [min, setmin] = useState(0)
    var [max, setmax] = useState(500000)
    var [search, setSearch] = useState("")
    var [searchInput, setSearchInput] = useState("")
    var [tagFilter, setTagFilter] = useState(tagParam || "All")
    var [sortBy, setSortBy] = useState("newest")
    var [selectedSizes, setSelectedSizes] = useState({})
    var [cartNotifications, setCartNotifications] = useState({})
    const toast = useToast();
    const [reviewStats, setReviewStats] = useState({});
    var [sidebarOpen, setSidebarOpen] = useState(false)

    // ── New premium features state ──
    const [discountFilter, setDiscountFilter] = useState(0); // 0, 10, 20, 30, 40, 50
    const [ratingFilter, setRatingFilter] = useState(0);     // 0, 3, 4
    const [gridMode, setGridMode] = useState('cozy');         // 'cozy' | 'compact'
    const [quickView, setQuickView] = useState(null);         // product object
    const [quickViewImgIndex, setQuickViewImgIndex] = useState(0);

    useEffect(() => { setQuickViewImgIndex(0); }, [quickView]);
    const [hoverIndex, setHoverIndex] = useState({});         // {productId: imgIdx}
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [openSections, setOpenSections] = useState({
        highlights: true, category: true, subcategory: true, size: true, price: true,
        discount: true, rating: true, brand: true,
    });

    const { data: productQueryData = [], isLoading: productsLoading } = useProductsQuery();
    const { data: maincategoryQueryData = [] } = useMaincategoriesQuery();
    const { data: subcategoryQueryData = [] } = useSubcategoriesQuery();
    const { data: brandQueryData = [] } = useBrandsQuery();

    const product = Array.isArray(productQueryData) ? productQueryData : [];
    const maincategory = Array.isArray(maincategoryQueryData) ? maincategoryQueryData : [];
    const subcategory = Array.isArray(subcategoryQueryData) ? subcategoryQueryData : [];
    const brand = Array.isArray(brandQueryData) ? brandQueryData : [];
    const isLoading = productsLoading && product.length === 0;

    // ── Admin detection (reactive) ──
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const checkAdmin = () => {
            const isAdminLS = localStorage.getItem("isAdmin");
            const roleLS = localStorage.getItem("role");
            const adminEmails = ["admin@gmail.com", "theafzalhussain786@gmail.com", "theafzalhussain786@gmail.com"];
            const adminUserIds = [
                "1",
                "admin",
                "your-admin-id",
                "699af12865bfff087143211c"
            ];
            const userEmail = localStorage.getItem("email") || "";
            const userId = localStorage.getItem("userid") || "";
            setIsAdmin(
                isAdminLS === true ||
                isAdminLS === "true" ||
                isAdminLS === 1 ||
                isAdminLS === "1" ||
                roleLS === "admin" ||
                roleLS === true ||
                roleLS === 1 ||
                roleLS === "1" ||
                adminEmails.includes(userEmail) ||
                adminUserIds.includes(userId)
            );
        };
        checkAdmin();
        window.addEventListener('storage', checkAdmin);
        window.addEventListener('focus', checkAdmin);
        return () => {
            window.removeEventListener('storage', checkAdmin);
            window.removeEventListener('focus', checkAdmin);
        };
    }, [location]);

    useEffect(() => {
        if (tagParam) setTagFilter(tagParam);
    }, [tagParam]);

    useEffect(() => {
        if (brandParam) {
            setbr(brandParam);
        }
    }, [brandParam]);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Load recently viewed from localStorage
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            if (Array.isArray(stored)) setRecentlyViewed(stored);
        } catch (e) {}
    }, []);

    // Real-time wishlist listener (refresh wishlist when server notifies)
    useEffect(() => {
        try {
            const socket = getSocketClient();
            const handler = (payload) => {
                try {
                    const localUser = localStorage.getItem('userid');
                    if (!localUser) return;
                    if (String(payload.userId) === String(localUser)) {
                        dispatch(getWishlist());
                    }
                } catch (e) { console.warn('wishlist socket handler error', e); }
            };
            socket.on('wishlist:updated', handler);
            return () => socket.off('wishlist:updated', handler);
        } catch (e) { /* ignore */ }
    }, [dispatch]);

    const ALL_SIZES = ['XS','S','M','L','XL','2XL','28','30','32','34','36','38','40','42'];

    const normalizeCategory = (value) => String(value || '')
        .trim().toLowerCase().replace(/['"’‘]+/g, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

    const getSynonymRegex = (word) => {
        if (/^(woman|women|womens|lady|ladies|female)$/i.test(word)) return /\b(woman|women|womens|lady|ladies|female)\b/i;
        if (/^(man|men|mens|male|gents)$/i.test(word)) return /\b(man|men|mens|male|gents)\b/i;
        if (/^(kid|kids|child|children)$/i.test(word)) return /\b(kid|kids|child|children|boy|boys|girl|girls)\b/i;
        if (/^(boy|boys)$/i.test(word)) return /\b(boy|boys)\b/i;
        if (/^(girl|girls)$/i.test(word)) return /\b(girl|girls)\b/i;
        
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escapedWord, 'i');
    }

    const matchesCategory = (productCategory, selectedCategory) => {
        const normalizedItem = normalizeCategory(productCategory);
        const normalizedSelected = normalizeCategory(selectedCategory);
        
        if (!normalizedSelected || normalizedSelected === 'all') return true;
        if (normalizedItem === normalizedSelected) return true;

        const queryWords = normalizedSelected.split(/\s+/);
        return queryWords.every(word => {
            const regex = getSynonymRegex(word);
            return regex.test(normalizedItem);
        });
    }

    const matchesSearchQuery = (item, query) => {
        const normalizedQuery = normalizeCategory(query);
        if (!normalizedQuery) return true;

        const searchableText = [item.name, item.maincategory, item.subcategory, item.brand]
            .filter(Boolean).join(' ');

        const queryWords = normalizedQuery.split(/\s+/);
        
        return queryWords.every(word => {
            const regex = getSynonymRegex(word);
            return regex.test(searchableText);
        });
    }

    // Color list still used to silently send first color to backend (UI removed)
    function firstColorOf(value) {
        if (!value) return '';
        const list = String(value).split(/[,/|]/).map(c => c.trim()).filter(Boolean);
        return list[0] || '';
    }
    function hasColors(value) {
        return !!firstColorOf(value);
    }

    var cart = useSelector((state) => state.CartStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)

    useEffect(() => {
        if (localStorage.getItem('login') === 'true' && localStorage.getItem('userid')) {
            dispatch(getCart())
            dispatch(getWishlist())
        }
    }, [dispatch])

    // Realtime: when backend emits DB changes, refresh product list if products updated
    useEffect(() => {
        const handler = (e) => {
            try {
                const data = (e && e.detail) || {};
                const coll = (data.collection || '').toString().toLowerCase();
                if (!coll) return;
                if (coll === 'products' || coll === 'product') {
                    queryClient.invalidateQueries({ queryKey: catalogQueryKeys.products });
                }
            } catch (err) { console.warn('Realtime handler error', err && err.message); }
        };
        window.addEventListener('realtime:dbChange', handler);
        return () => window.removeEventListener('realtime:dbChange', handler);
    }, []);

    useEffect(() => {
        async function fetchReviewStats() {
          try {
            const response = await axios.get(`${BASE_URL}/api/reviews`);
            if (response.data.success) {
              const statsMap = {};
              response.data.reviews.forEach(review => {
                if (review.products && Array.isArray(review.products)) {
                  review.products.forEach(productId => {
                    if (!statsMap[productId]) {
                      statsMap[productId] = { totalRating: 0, count: 0 };
                    }
                    statsMap[productId].totalRating += Number(review.rating) || 0;
                    statsMap[productId].count += 1;
                  });
                }
              });

              const finalStats = {};
              for (const productId in statsMap) {
                finalStats[productId] = {
                  count: statsMap[productId].count,
                  average: parseFloat((statsMap[productId].totalRating / statsMap[productId].count).toFixed(1))
                };
              }
              setReviewStats(finalStats);
            }
          } catch (error) {}
        }
        fetchReviewStats();
    }, [product.length]);

    useEffect(() => { setmc(maincat) }, [maincat])

    function pushRecentlyViewed(p) {
        try {
            const id = p.id || p._id;
            if (!id) return;
            const minimal = {
                id, name: p.name, brand: p.brand,
                pic1: p.pic1, finalprice: p.finalprice, baseprice: p.baseprice,
            };
            const next = [minimal, ...recentlyViewed.filter(x => String(x.id) !== String(id))].slice(0, 8);
            setRecentlyViewed(next);
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch (e) {}
    }

    function addToCart(p, sizeFromParam = null) {
        if (!localStorage.getItem("login")) { navigate("/login"); return }
        const productId = p.id || p._id;
        const selectedSize = sizeFromParam || selectedSizes[productId]
        if (!productId) {
            toast.error('Product id missing. Please refresh and try again.');
            return;
        }
        if (!selectedSize) { toast.warning('Please select a size first'); return; }
        // Color UI removed: silently send first color to backend if product has any
        const selectedColor = hasColors(p.color) ? firstColorOf(p.color) : '';
        const cartItems = Array.isArray(cart) ? cart : (cart?.items || []);
        let existingItem = cartItems.find((item) =>
            String(item.productid || item.productId || item.product || item._id || item.id) === String(productId) && 
            (!item.userid || String(item.userid) === String(localStorage.getItem("userid"))) &&
            item.size === selectedSize && item.color === selectedColor
        )
        if (existingItem) {
            const currentCount = (cartNotifications[productId] || 0) + 1;
            setCartNotifications({...cartNotifications, [productId]: currentCount});
            toast.info(`Already in bag · ${currentCount}×`);
        } else {
            dispatch(addCart({
                userId: localStorage.getItem("userid"),
                productId,
                quantity: 1,
                size: selectedSize,
                color: selectedColor
            }))
            const currentCount = (cartNotifications[productId] || 0) + 1
            setCartNotifications({...cartNotifications, [productId]: currentCount})
            // Success toast moved to saga-confirmation via ToastEventBridge
        }
    }

    // optimistic wishlist map to toggle icon immediately
    const [optimisticWishlist, setOptimisticWishlist] = useState({});

    const isInWishlist = (productId) => {
        if (!productId) return false;
        if (Object.prototype.hasOwnProperty.call(optimisticWishlist, productId)) {
            return !!optimisticWishlist[productId];
        }
        return (wishlist || []).some((item) => String(item.productid?._id || item.productid || item.product?._id || item.product || item.productId) === String(productId))
    }

    function toggleWishlist(p) {
        if (!localStorage.getItem('login')) {
            navigate('/login');
            return;
        }
        const userId = localStorage.getItem('userid');
        const productId = p.id || p._id;
        const existing = (wishlist || []).find((item) => String(item.productid?._id || item.productid || item.product?._id || item.product || item.productId) === String(productId));

        let selectedSize = selectedSizes[p.id];
        if (!selectedSize) {
            const sizesArr = Array.isArray(p.size) ? p.size : [p.size];
            selectedSize = sizesArr && sizesArr.length > 0 ? sizesArr[0] : '';
        }
        if (!selectedSize) {
            toast.warning('Please select a size first');
            return;
        }

        // optimistic toggle: update UI immediately
        if (isInWishlist(productId)) {
            // show as removed optimistically
            setOptimisticWishlist(prev => ({ ...prev, [productId]: false }));
            dispatch(deleteWishlist({ id: existing?.id || existing?._id }));
        } else {
            // show as added optimistically
            setOptimisticWishlist(prev => ({ ...prev, [productId]: true }));
            dispatch(addWishlist({
                userid: userId,
                productid: productId,
                name: p.name,
                color: p.color,
                size: selectedSize,
                price: Number(p.finalprice || 0),
                pic: p.pic1
            }));
            // Success toast moved to saga-confirmation via ToastEventBridge
        }
    }

    // Sync optimistic map with Redux wishlist updates: clear keys when server state matches
    useEffect(() => {
        if (!wishlist) return;
        const next = { ...optimisticWishlist };
        let changed = false;
        Object.keys(optimisticWishlist).forEach(pid => {
            const real = (wishlist || []).some(it => String(it.productid?._id || it.productid || it.product?._id || it.product || it.productId) === String(pid));
            if (optimisticWishlist[pid] === !!real) {
                delete next[pid];
                changed = true;
            }
        });
        if (changed) setOptimisticWishlist(next);
    }, [wishlist]);

    const calcDiscount = (item) => {
        if (item.discount && Number(item.discount) > 0) return Number(item.discount);
        if (item.baseprice && item.finalprice && item.baseprice > item.finalprice) {
            return Math.round(((item.baseprice - item.finalprice) / item.baseprice) * 100);
        }
        return 0;
    };

    const filteredProducts = useMemo(() => {
        let temp = [...product];
        if (category) { temp = temp.filter((x) => matchesCategory(x.maincategory, category) || matchesCategory(x.subcategory, category)); }

        if (tagFilter === 'New Arrivals') temp = temp.filter(x => x.newArrival);
        else if (tagFilter === 'Sale') temp = temp.filter(x => x.isSale);
        else if (tagFilter === 'Bestsellers') {
            temp = temp.filter(x => {
                const s = reviewStats[x.id];
                return s && (s.count >= 5 || s.average >= 4.2);
            });
        }
        else if (tagFilter === 'Trending') {
            temp = temp.filter(x => calcDiscount(x) >= 20);
        }

        if (mc !== 'All') temp = temp.filter(x => matchesCategory(x.maincategory, mc));
        if (sc !== 'All') temp = temp.filter(x => matchesCategory(x.subcategory, sc));
        if (br !== 'All') temp = temp.filter(x => normalizeCategory(x.brand) === normalizeCategory(br));
        if (size !== 'All') {
            temp = temp.filter(x => {
                if (!x.size) return false;
                const sizes = Array.isArray(x.size) ? x.size.map(s => String(s).toUpperCase()) : String(x.size).split(',').map(s => s.trim().toUpperCase());
                if (size.toUpperCase() === '2XL' || size.toUpperCase() === 'XXL') {
                    return sizes.includes('2XL') || sizes.includes('XXL');
                }
                return sizes.includes(size.toUpperCase());
            });
        }
        temp = temp.filter(x => x.finalprice >= min && x.finalprice <= max);

        if (discountFilter > 0) temp = temp.filter(x => calcDiscount(x) >= discountFilter);
        if (ratingFilter > 0) {
            temp = temp.filter(x => {
                const s = reviewStats[x.id];
                const r = s ? s.average : (x.rating || 0);
                return r >= ratingFilter;
            });
        }

        if (search) { temp = temp.filter((x) => matchesSearchQuery(x, search)); }

        if (sortBy === "low") temp.sort((a, b) => a.finalprice - b.finalprice);
        else if (sortBy === "high") temp.sort((a, b) => b.finalprice - a.finalprice);
        else if (sortBy === "discount") temp.sort((a, b) => calcDiscount(b) - calcDiscount(a));
        else if (sortBy === "rating") {
            temp.sort((a, b) => {
                const ra = (reviewStats[a.id]?.average) || a.rating || 0;
                const rb = (reviewStats[b.id]?.average) || b.rating || 0;
                return rb - ra;
            });
        }
        else if (sortBy === "popular") {
            temp.sort((a, b) => {
                const ca = reviewStats[a.id]?.count || 0;
                const cb = reviewStats[b.id]?.count || 0;
                return cb - ca;
            });
        }
        else temp.reverse();
        return temp;
    }, [product, mc, sc, br, size, min, max, search, sortBy, category, tagFilter, discountFilter, ratingFilter, reviewStats]);

    const clearAllFilters = useCallback(() => {
        setmc('All'); setsc('All'); setbr('All'); setSize('All');
        setSearchInput(''); setSearch(''); setTagFilter('All');
        setmin(0); setmax(500000); setDiscountFilter(0); setRatingFilter(0);
    }, []);

    const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

    const activeFilterCount = (mc !== 'All' && mc ? 1 : 0) + (sc !== 'All' ? 1 : 0) + (br !== 'All' ? 1 : 0)
        + (size !== 'All' ? 1 : 0) + (tagFilter !== 'All' ? 1 : 0) + (search ? 1 : 0)
        + (discountFilter > 0 ? 1 : 0) + (ratingFilter > 0 ? 1 : 0)
        + (min > 0 ? 1 : 0) + (max < 500000 ? 1 : 0);

    return (
        <div className="mp-shop">

            {/* ══ HERO BANNER ══ */}
            <section className="mp-hero">
                <div className="mp-hero-bg" />
                <div className="mp-hero-noise" />
                <div className="mp-hero-inner">
                    <motion.span className="mp-hero-eyebrow"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="mp-eline" />THE COLLECTION<span className="mp-eline" />
                    </motion.span>
                    <motion.h1 className="mp-hero-title"
                        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >Shop Premium <em>Styles</em></motion.h1>
                    <motion.p className="mp-hero-sub"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >Hand-picked pieces from the brands you love</motion.p>
                    {isAdmin && (
                        <motion.div className="mp-hero-stats"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="mp-hstat"><span>{filteredProducts.length}</span><small>PRODUCTS</small></div>
                            <div className="mp-hdiv" />
                            <div className="mp-hstat"><span>{brand.length}</span><small>BRANDS</small></div>
                            <div className="mp-hdiv" />
                            <div className="mp-hstat"><span>{maincategory.length}</span><small>CATEGORIES</small></div>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* ══ TRUST STRIP ══ */}
            <div className="mp-trust">
                <div className="mp-trust-inner">
                    <div className="mp-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        <span><strong>Free Shipping</strong> · Above ₹499</span>
                    </div>
                    <div className="mp-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 12 11 12"/></svg>
                        <span><strong>7-Day Returns</strong> · Hassle-free</span>
                    </div>
                    <div className="mp-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                        <span><strong>100% Authentic</strong> · Verified</span>
                    </div>
                    <div className="mp-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                        <span><strong>Cash on Delivery</strong> · Available</span>
                    </div>
                    <div className="mp-trust-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span><strong>24/7 Support</strong> · Help center</span>
                    </div>
                </div>
            </div>

            {/* ══ MOBILE BAR ══ */}
            <div className="mp-mbar">
                <button className="mp-ftoggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
                    </svg>
                    FILTERS{activeFilterCount > 0 && <span className="mp-mbadge">{activeFilterCount}</span>}
                </button>
                <span className="mp-mcount">{filteredProducts.length} items</span>
                <select className="mp-msort" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                    <option value="newest">Recommended</option>
                    <option value="popular">Popularity</option>
                    <option value="rating">Customer Rating</option>
                    <option value="discount">Better Discount</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                </select>
            </div>

            <div className="mp-layout">
                {sidebarOpen && <div className="mp-backdrop" onClick={() => setSidebarOpen(false)} />}

                {/* ══ SIDEBAR ══ */}
                <aside className={`mp-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="mp-sb-inner">
                        <div className="mp-sb-head">
                            <div>
                                <p className="mp-sb-eyebrow">FILTERS{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</p>
                                <h2 className="mp-sb-title">Refine</h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {activeFilterCount > 0 && (
                                    <button className="mp-clearall" onClick={clearAllFilters}>CLEAR ALL</button>
                                )}
                                <button className="mp-sb-close" onClick={() => setSidebarOpen(false)} aria-label="Close filters">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="mp-fg">
                            <label className="mp-fl">SEARCH</label>
                            <div className="mp-sw">
                                <svg className="mp-si" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input className="mp-sinp" type="text" placeholder="Search for products, brands…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                                {searchInput && (
                                    <button className="mp-sclr" onClick={() => { setSearchInput(''); setSearch(''); }} aria-label="Clear">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Highlights */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('highlights')}>
                                HIGHLIGHTS
                                <svg className={`mp-chev ${openSections.highlights ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.highlights && (
                                <div className="mp-pgrid">
                                    {['All', 'New Arrivals', 'Sale', 'Bestsellers', 'Trending'].map((t, i) => (
                                        <button key={i} onClick={() => setTagFilter(t)} className={`mp-pchip ${tagFilter === t ? 'active' : ''}`}>{t}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Category */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('category')}>
                                CATEGORY
                                <svg className={`mp-chev ${openSections.category ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.category && (
                                <select className="mp-sel" value={mc} onChange={(e) => setmc(e.target.value)}>
                                    <option value="All">All Categories</option>
                                    {maincategory.map((item, i) => <option key={i} value={item.name}>{item.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Subcategory */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('subcategory')}>
                                SUBCATEGORY
                                <svg className={`mp-chev ${openSections.subcategory ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.subcategory && (
                                <select className="mp-sel" value={sc} onChange={(e) => setsc(e.target.value)}>
                                    <option value="All">All Subcategories</option>
                                    {Array.from(new Set(subcategory.map(item => item.name))).map((name, i) => <option key={i} value={name}>{name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Size */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('size')}>
                                SIZE
                                <svg className={`mp-chev ${openSections.size ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.size && (
                                <div className="mp-pgrid">
                                    {['All',...ALL_SIZES].map((s, i) => (
                                        <button key={i} onClick={() => setSize(s)} className={`mp-pchip ${size === s ? 'active' : ''}`}>{s}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Discount filter */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('discount')}>
                                DISCOUNT
                                <svg className={`mp-chev ${openSections.discount ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.discount && (
                                <div className="mp-radios">
                                    {[
                                        { v: 0, l: 'All' },
                                        { v: 10, l: '10% & above' },
                                        { v: 20, l: '20% & above' },
                                        { v: 30, l: '30% & above' },
                                        { v: 40, l: '40% & above' },
                                        { v: 50, l: '50% & above' },
                                    ].map(opt => (
                                        <label key={opt.v} className={`mp-radio ${discountFilter === opt.v ? 'active' : ''}`}>
                                            <input type="radio" name="discount" checked={discountFilter === opt.v} onChange={() => setDiscountFilter(opt.v)} />
                                            <span className="mp-radio-mark" />
                                            {opt.l}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Customer Rating */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('rating')}>
                                CUSTOMER RATING
                                <svg className={`mp-chev ${openSections.rating ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.rating && (
                                <div className="mp-radios">
                                    {[
                                        { v: 0, l: 'All ratings' },
                                        { v: 4, l: '4★ & above' },
                                        { v: 3, l: '3★ & above' },
                                    ].map(opt => (
                                        <label key={opt.v} className={`mp-radio ${ratingFilter === opt.v ? 'active' : ''}`}>
                                            <input type="radio" name="rating" checked={ratingFilter === opt.v} onChange={() => setRatingFilter(opt.v)} />
                                            <span className="mp-radio-mark" />
                                            {opt.l}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Brand */}
                        <div className="mp-fg">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('brand')}>
                                BRAND
                                <svg className={`mp-chev ${openSections.brand ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.brand && (
                                <select className="mp-sel" value={br} onChange={(e) => setbr(e.target.value)}>
                                    <option value="All">All Brands</option>
                                    {Array.from(new Set(brand.map(b => b.name))).map((name, i) => <option key={i} value={name}>{name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Price */}
                        <div className="mp-fg mp-fg-last">
                            <button className="mp-fl mp-fl-btn" onClick={() => toggleSection('price')}>
                                PRICE RANGE
                                <svg className={`mp-chev ${openSections.price ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openSections.price && (
                                <div className="mp-prow">
                                    <div className="mp-priceField">
                                        <span className="mp-pfx">₹</span>
                                    <input className="mp-pinp" type="number" placeholder="Min" value={min === 0 ? '' : min} onChange={(e) => setmin(e.target.value === '' ? 0 : Number(e.target.value))} />
                                    </div>
                                    <span className="mp-psep">to</span>
                                    <div className="mp-priceField">
                                        <span className="mp-pfx">₹</span>
                                    <input className="mp-pinp" type="number" placeholder="Max" value={max === 500000 ? '' : max} onChange={(e) => setmax(e.target.value === '' ? 500000 : Number(e.target.value))} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ══ MAIN ══ */}
                <main className="mp-main">
                    <motion.div className="mp-toolbar" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                        <div className="mp-tleft">
                            <span className="mp-tc"><strong>{filteredProducts.length}</strong> products found</span>
                            {activeFilterCount > 0 && (
                                <span className="mp-active-filters">
                                    {mc !== 'All' && mc && <span className="mp-chip">{mc}<button onClick={() => setmc('All')} aria-label="remove">×</button></span>}
                                    {sc !== 'All' && <span className="mp-chip">{sc}<button onClick={() => setsc('All')} aria-label="remove">×</button></span>}
                                    {br !== 'All' && <span className="mp-chip">{br}<button onClick={() => setbr('All')} aria-label="remove">×</button></span>}
                                    {size !== 'All' && <span className="mp-chip">Size: {size}<button onClick={() => setSize('All')} aria-label="remove">×</button></span>}
                                    {tagFilter !== 'All' && <span className="mp-chip">{tagFilter}<button onClick={() => setTagFilter('All')} aria-label="remove">×</button></span>}
                                    {discountFilter > 0 && <span className="mp-chip">{discountFilter}%+ off<button onClick={() => setDiscountFilter(0)} aria-label="remove">×</button></span>}
                                    {ratingFilter > 0 && <span className="mp-chip">{ratingFilter}★ &amp; above<button onClick={() => setRatingFilter(0)} aria-label="remove">×</button></span>}
                                    {min > 0 && <span className="mp-chip">Min: ₹{min}<button onClick={() => setmin(0)} aria-label="remove">×</button></span>}
                                    {max < 500000 && <span className="mp-chip">Max: ₹{max}<button onClick={() => setmax(500000)} aria-label="remove">×</button></span>}
                                    {search && <span className="mp-chip">"{search}"<button onClick={() => { setSearchInput(''); setSearch(''); }} aria-label="remove">×</button></span>}
                                    <button className="mp-clearlink" onClick={clearAllFilters}>Clear all</button>
                                </span>
                            )}
                        </div>
                        <div className="mp-tr">
                            <div className="mp-viewtoggle" role="group" aria-label="View mode">
                                <button className={gridMode === 'cozy' ? 'active' : ''} onClick={() => setGridMode('cozy')} aria-label="Cozy view" title="Cozy view">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
                                </button>
                                <button className={gridMode === 'compact' ? 'active' : ''} onClick={() => setGridMode('compact')} aria-label="Compact view" title="Compact view">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="9.25" y="3" width="5.5" height="5.5" rx="1"/><rect x="15.5" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="9.25" width="5.5" height="5.5" rx="1"/><rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1"/><rect x="15.5" y="9.25" width="5.5" height="5.5" rx="1"/><rect x="3" y="15.5" width="5.5" height="5.5" rx="1"/><rect x="9.25" y="15.5" width="5.5" height="5.5" rx="1"/><rect x="15.5" y="15.5" width="5.5" height="5.5" rx="1"/></svg>
                                </button>
                            </div>
                            <span className="mp-tl">SORT BY</span>
                            <select className="mp-dsort" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                                <option value="newest">Recommended</option>
                                <option value="popular">Popularity</option>
                                <option value="rating">Customer Rating</option>
                                <option value="discount">Better Discount</option>
                                <option value="low">Price: Low to High</option>
                                <option value="high">Price: High to Low</option>
                            </select>
                        </div>
                    </motion.div>

                    <VirtualProductGrid
                        className={`mp-grid ${gridMode === 'compact' ? 'compact' : ''}`}
                        itemMinWidth={gridMode === 'compact' ? 200 : 240}
                        rowHeight={gridMode === 'compact' ? 460 : 520}
                        items={isLoading ? Array.from({ length: 12 }, (_, idx) => ({ __skeleton: true, id: `skeleton-${idx}` })) : filteredProducts}
                        renderItem={(item, index) => renderProductCard({
                            item,
                            index,
                            stats: reviewStats[item.id] || reviewStats[item._id],
                            hoverIndex,
                            setHoverIndex,
                            calcDiscount,
                            isInWishlist,
                            toggleWishlist,
                            pushRecentlyViewed,
                            cartNotifications,
                            setQuickView,
                            selectedSizes,
                            setSelectedSizes,
                            addToCart
                        })}
                    />

                    {!isLoading && filteredProducts.length === 0 && (
                        <motion.div className="mp-empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="mp-eico">
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                </svg>
                            </div>
                            <h4>No products found</h4>
                            <p>Try changing your filters or search keywords</p>
                            <button className="mp-ebtn" onClick={clearAllFilters}>Clear All Filters</button>
                        </motion.div>
                    )}

                    {!isLoading && recentlyViewed.length > 0 && (
                        <section className="mp-recent">
                            <div className="mp-recent-head">
                                <div>
                                    <p className="mp-recent-eyebrow">RECENTLY VIEWED</p>
                                    <h3 className="mp-recent-title">Pick up where you left off</h3>
                                </div>
                                <button
                                    className="mp-recent-clear"
                                    onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentlyViewed([]); }}
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="mp-recent-row">
                                {recentlyViewed.map((r) => (
                                    <Link to={`/single-product/${r.id}`} key={r.id} className="mp-recent-card">
                                        <div className="mp-recent-img">
                                            <img src={optimizeCloudinaryUrlAdvanced(r.pic1, { maxWidth: 280, crop: 'fill' })} alt={r.name} loading="lazy" />
                                        </div>
                                        <div className="mp-recent-body">
                                            <p className="mp-recent-brand">{r.brand}</p>
                                            <p className="mp-recent-name">{r.name}</p>
                                            <p className="mp-recent-price">₹{r.finalprice} {r.baseprice > r.finalprice && <del>₹{r.baseprice}</del>}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                {quickView && (
                    <div className="mp-qv-backdrop" onClick={() => setQuickView(null)}>
                        <div className="mp-qv-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="mp-qv-close" onClick={() => setQuickView(null)} aria-label="Close quick view">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                            <div className="mp-qv-img">
                                <img src={optimizeCloudinaryUrlAdvanced([quickView.pic1, quickView.pic, quickView.pic2, quickView.pic3, quickView.pic4].find(Boolean) || '', { maxWidth: 1200, crop: 'fill' })} alt={quickView.name} loading="eager" />
                            </div>
                            <div className="mp-qv-body">
                                <p className="mp-qv-brand">{quickView.brand}</p>
                                <h3 className="mp-qv-name">{quickView.name}</h3>
                                <p className="mp-qv-cat">{quickView.maincategory} {quickView.subcategory ? `· ${quickView.subcategory}` : ''}</p>
                                <div className="mp-qv-price">
                                    <span className="mp-price">₹{quickView.finalprice}</span>
                                    {quickView.baseprice > quickView.finalprice && <span className="mp-orig"><del>₹{quickView.baseprice}</del></span>}
                                    <span className="mp-discount">{calcDiscount(quickView)}% off</span>
                                </div>

                                    <div className="mp-qv-section mp-qv-sizes">
                                        <p className="mp-qv-label">Sizes</p>
                                        <div className="mp-sbtns">
                                            {
                                                (() => {
                                                    const qid = quickView.id || quickView._id;
                                                    const sizesArr = Array.isArray(quickView.size) ? quickView.size : (quickView.size ? String(quickView.size).split(',') : []);
                                                    return sizesArr.map((s) => (
                                                        <button
                                                            key={s}
                                                            className={`mp-sbtn ${selectedSizes[qid] === s ? 'active' : ''}`}
                                                            onClick={() => setSelectedSizes((prev) => ({ ...prev, [qid]: s }))}
                                                        >{s}</button>
                                                    ));
                                                })()
                                            }
                                        </div>
                                    </div>

                                <div className="mp-qv-actions">
                                    <button className={`mp-addbtn mp-qv-add`} onClick={() => { const qid = quickView.id || quickView._id; addToCart(quickView, selectedSizes[qid]); setQuickView(null); }}>Add to bag</button>
                                    <button className={`mp-qv-wish ${isInWishlist(quickView.id || quickView._id) ? 'active' : ''}`} onClick={() => toggleWishlist(quickView)}>{isInWishlist(quickView.id || quickView._id) ? 'Wishlisted' : 'Add to wishlist'}</button>
                                </div>

                                <Link to={`/single-product/${quickView.id || quickView._id}`} className="mp-qv-viewfull" onClick={() => setQuickView(null)}>View full product page</Link>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* ══ SCOPED PREMIUM STYLES ══ */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap');

                .mp-shop {
                    --ink:        #282c3f;
                    --ink-mid:    #535766;
                    --ink-soft:   #696b79;
                    --ink-muted:  #94969f;
                    --line:       #eaeaec;
                    --line-d:     #d4d5d9;
                    --bg:         #f5f5f6;
                    --white:      #ffffff;
                    --pink:       #C9A84C;
                    --pink-dark:  #9A7A20;
                    --pink-soft:  rgba(201,168,76,0.12);
                    --green:      #03a685;
                    --green-soft: #dff7f0;
                    --orange:     #ff905a;
                    --gold:       #c9a96e;
                    --shadow:     0 1px 2px rgba(40,44,63,0.04), 0 1px 3px rgba(40,44,63,0.06);
                    --shadow-lg:  0 8px 28px rgba(40,44,63,0.12), 0 2px 6px rgba(40,44,63,0.06);
                    --r:          6px;
                    --r-lg:       10px;
                    --serif:      'Playfair Display', Georgia, serif;
                    --sans:       'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: var(--bg);
                    font-family: var(--sans);
                    color: var(--ink);
                    min-height: 100vh;
                    -webkit-font-smoothing: antialiased;
                }

                /* ── HERO ── */
                .mp-hero {
                    position: relative;
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                    min-height: 320px;
                    display: flex; align-items: center; justify-content: center;
                    text-align: center; overflow: hidden;
                    padding: 64px 24px;
                    border-bottom: 1px solid rgba(201,168,76,0.15);
                }
                .mp-hero-bg {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 800px 400px at 20% 20%, rgba(255,63,108,0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 700px 400px at 85% 80%, rgba(201,169,110,0.14) 0%, transparent 60%);
                    pointer-events: none;
                }
                .mp-hero-noise {
                    position: absolute; inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
                    pointer-events: none;
                }
                .mp-hero-inner {
                    position: relative; z-index: 2;
                    display: flex; flex-direction: column; align-items: center;
                    max-width: 720px; width: 100%;
                }
                .mp-hero-eyebrow {
                    display: flex; align-items: center; gap: 14px;
                    font-size: 11px; font-weight: 700;
                    letter-spacing: 4px; color: var(--gold); text-transform: uppercase;
                    margin-bottom: 18px;
                }
                .mp-eline { display: block; width: 36px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
                .mp-hero-title { font-family: var(--serif); font-size: clamp(2.4rem, 5.5vw, 4.4rem); font-weight: 600; color: #fff; line-height: 1.1; margin: 0 0 14px; letter-spacing: -0.01em; }
                .mp-hero-title em { font-style: italic; color: var(--gold); font-weight: 500; }
                .mp-hero-sub { font-size: 14px; color: rgba(255,255,255,0.72); max-width: 520px; margin: 0 auto; letter-spacing: 0.2px; }
                .mp-hero-stats { display: flex; align-items: center; gap: 0; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 26px; margin-top: 32px; width: 100%; max-width: 420px; }
                .mp-hstat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
                .mp-hstat span { font-family: var(--serif); font-size: 32px; font-weight: 600; color: #fff; line-height: 1; }
                .mp-hstat small { font-size: 9px; font-weight: 700; letter-spacing: 2.5px; color: rgba(255,255,255,0.5); }
                .mp-hdiv { width: 1px; height: 40px; background: rgba(255,255,255,0.14); flex-shrink: 0; }

                /* ── TRUST STRIP ── */
                .mp-trust {
                    background: var(--white);
                    border-bottom: 1px solid var(--line);
                }
                .mp-trust-inner {
                    max-width: 1600px; margin: 0 auto;
                    padding: 14px 24px;
                    display: flex; align-items: center; justify-content: space-around;
                    gap: 24px; flex-wrap: wrap;
                }
                .mp-trust-item {
                    display: inline-flex; align-items: center; gap: 10px;
                    font-size: 13px; color: var(--ink-soft);
                }
                .mp-trust-item svg { color: var(--ink); flex-shrink: 0; }
                .mp-trust-item strong { color: var(--ink); font-weight: 700; }

                /* ── MOBILE BAR ── */
                .mp-mbar {
                    display: none; align-items: center; gap: 10px;
                    padding: 12px 14px; background: var(--white);
                    border-bottom: 1px solid var(--line);
                    position: sticky; top: 0; z-index: 200;
                    box-shadow: var(--shadow);
                }
                .mp-ftoggle {
                    display: flex; align-items: center; gap: 7px;
                    background: var(--white); color: var(--ink);
                    border: 1px solid var(--line-d); border-radius: var(--r);
                    padding: 9px 14px; font-family: var(--sans);
                    font-size: 11px; font-weight: 700; letter-spacing: 1px;
                    cursor: pointer; white-space: nowrap;
                    transition: border-color 0.2s, background 0.2s;
                    position: relative;
                }
                .mp-ftoggle:hover { border-color: var(--ink); }
                .mp-mbadge {
                    display: inline-flex; align-items: center; justify-content: center;
                    background: var(--pink); color: #fff;
                    font-size: 10px; font-weight: 800;
                    min-width: 16px; height: 16px; padding: 0 4px;
                    border-radius: 999px; margin-left: 4px;
                }
                .mp-mcount { font-size: 12px; color: var(--ink-soft); flex: 1; text-align: center; font-weight: 500; }
                .mp-msort { background: var(--white); border: 1px solid var(--line-d); border-radius: var(--r); padding: 8px 10px; font-family: var(--sans); font-size: 12px; color: var(--ink); cursor: pointer; outline: none; font-weight: 600; }

                /* ── LAYOUT ── */
                .mp-layout {
                    display: flex; align-items: flex-start;
                    max-width: 1600px; margin: 0 auto;
                    padding: 24px 24px 60px; gap: 24px;
                    min-height: 100vh;
                }
                .mp-backdrop { display: none; position: fixed; inset: 0; background: rgba(40,44,63,0.5); z-index: 1040; backdrop-filter: blur(2px); }

                /* ── SIDEBAR ── */
                .mp-sidebar {
                    width: 268px; flex-shrink: 0;
                    position: sticky; top: 16px;
                    height: calc(100vh - 32px);
                    min-height: calc(100vh - 32px);
                    max-height: calc(100vh - 32px);
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: var(--line-d) transparent;
                }
                .mp-sidebar::-webkit-scrollbar { width: 4px; }
                .mp-sidebar::-webkit-scrollbar-thumb { background: var(--line-d); border-radius: 2px; }
                .mp-sb-inner { background: var(--white); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 22px 20px; box-shadow: var(--shadow); }
                .mp-sb-inner { min-height: 100%; display: flex; flex-direction: column; }
                .mp-sb-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid var(--line); gap: 8px; }
                .mp-sb-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-muted); text-transform: uppercase; margin: 0 0 4px; }
                .mp-sb-title { font-family: var(--serif); font-size: 24px; font-weight: 600; color: var(--ink); line-height: 1; margin: 0; }
                .mp-clearall {
                    background: transparent; border: none; padding: 0;
                    font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
                    color: var(--pink); cursor: pointer; text-transform: uppercase;
                    transition: color 0.18s;
                }
                .mp-clearall:hover { color: var(--pink-dark); }
                .mp-sb-close { display: none; background: transparent; border: 1px solid var(--line); border-radius: 50%; width: 32px; height: 32px; align-items: center; justify-content: center; color: var(--ink-mid); cursor: pointer; flex-shrink: 0; transition: background 0.18s, color 0.18s, border-color 0.18s; }
                .mp-sb-close:hover { background: var(--ink); color: var(--white); border-color: var(--ink); }

                .mp-fg { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
                .mp-fg-last { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                .mp-fl { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: var(--ink); margin-bottom: 12px; cursor: default; user-select: none; }
                .mp-fl-btn {
                    width: 100%; background: transparent; border: none;
                    padding: 0 0 4px; cursor: pointer; justify-content: space-between;
                }
                .mp-fl-btn:hover { color: var(--pink); }
                .mp-chev { transition: transform 0.22s ease; color: var(--ink-mid); }
                .mp-chev.open { transform: rotate(180deg); }

                .mp-fl-admin { color: #8b6914; }
                .mp-admin-fg { background: rgba(201,169,110,0.06); border-radius: var(--r); padding: 12px; margin-left: -12px; margin-right: -12px; padding-bottom: 14px; margin-bottom: 18px; border: 1px dashed rgba(201,169,110,0.3); }
                .mp-atag { background: rgba(139,105,20,0.12); border: 1px solid rgba(139,105,20,0.3); color: #8b6914; font-size: 8px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: 999px; margin-left: auto; }

                .mp-sw { position: relative; }
                .mp-si { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-muted); pointer-events: none; }
                .mp-sclr {
                    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                    background: rgba(40,44,63,0.08); color: var(--ink-mid);
                    border: none; width: 22px; height: 22px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; padding: 0; transition: background 0.18s;
                }
                .mp-sclr:hover { background: var(--ink); color: var(--white); }
                .mp-sinp { width: 100%; padding: 11px 36px 11px 36px; border: 1px solid var(--line-d); border-radius: var(--r); font-family: var(--sans); font-size: 13px; color: var(--ink); background: var(--white); outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
                .mp-sinp:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(40,44,63,0.06); }

                .mp-sel { width: 100%; padding: 11px 32px 11px 12px; border: 1px solid var(--line-d); border-radius: var(--r); font-family: var(--sans); font-size: 13px; color: var(--ink); background: var(--white); outline: none; cursor: pointer; font-weight: 500; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23535766' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 12px center; }
                .mp-sel:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(40,44,63,0.06); }

                .mp-pgrid { display: flex; flex-wrap: wrap; gap: 6px; }
                .mp-pchip { padding: 6px 13px; border: 1px solid var(--line-d); border-radius: 999px; font-family: var(--sans); font-size: 11px; font-weight: 600; color: var(--ink-mid); background: var(--white); cursor: pointer; transition: all 0.18s; letter-spacing: 0.3px; }
                .mp-pchip:hover { border-color: var(--ink); color: var(--ink); }
                .mp-pchip.active { background: var(--ink); color: var(--white); border-color: var(--ink); }

                .mp-radios { display: flex; flex-direction: column; gap: 4px; }
                .mp-radio {
                    display: flex; align-items: center; gap: 10px;
                    font-size: 13px; color: var(--ink-mid); font-weight: 500;
                    cursor: pointer; padding: 6px 0;
                    transition: color 0.18s;
                }
                .mp-radio input { display: none; }
                .mp-radio-mark {
                    width: 16px; height: 16px; border-radius: 50%;
                    border: 1.5px solid var(--line-d);
                    background: var(--white); flex-shrink: 0;
                    position: relative; transition: border-color 0.18s;
                }
                .mp-radio:hover { color: var(--ink); }
                .mp-radio:hover .mp-radio-mark { border-color: var(--ink); }
                .mp-radio.active { color: var(--ink); font-weight: 700; }
                .mp-radio.active .mp-radio-mark { border-color: var(--pink); border-width: 5px; }

                .mp-prow { display: flex; align-items: center; gap: 8px; }
                .mp-priceField { position: relative; flex: 1; min-width: 0; }
                .mp-pfx { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ink-muted); font-size: 12px; font-weight: 600; pointer-events: none; }
                .mp-pinp { width: 100%; padding: 10px 11px 10px 22px; border: 1px solid var(--line-d); border-radius: var(--r); font-family: var(--sans); font-size: 12px; color: var(--ink); background: var(--white); outline: none; min-width: 0; transition: border-color 0.2s; box-sizing: border-box; font-weight: 500; }
                .mp-pinp:focus { border-color: var(--ink); }
                .mp-psep { color: var(--ink-muted); font-size: 11px; flex-shrink: 0; font-weight: 600; }

                /* ── MAIN ── */
                .mp-main { flex: 1; min-width: 0; }
                .mp-toolbar { display: flex; align-items: center; justify-content: space-between; background: var(--white); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 12px 18px; margin-bottom: 18px; box-shadow: var(--shadow); gap: 16px; flex-wrap: wrap; }
                .mp-tleft { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex: 1; min-width: 0; }
                .mp-tc { font-size: 13px; color: var(--ink-soft); font-weight: 500; white-space: nowrap; }
                .mp-tc strong { color: var(--ink); font-weight: 700; }
                .mp-active-filters { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
                .mp-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(40,44,63,0.06); border: 1px solid var(--line); border-radius: 999px; padding: 4px 4px 4px 10px; font-size: 11px; font-weight: 600; color: var(--ink); }
                .mp-chip button { background: var(--ink); color: var(--white); border: none; width: 18px; height: 18px; border-radius: 50%; font-size: 12px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: background 0.18s; }
                .mp-chip button:hover { background: var(--pink); }
                .mp-clearlink {
                    background: transparent; border: none; padding: 4px 8px;
                    font-size: 11px; font-weight: 700; color: var(--pink);
                    cursor: pointer; letter-spacing: 0.3px;
                }
                .mp-clearlink:hover { color: var(--pink-dark); text-decoration: underline; }

                .mp-tr { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                .mp-viewtoggle {
                    display: inline-flex; border: 1px solid var(--line-d); border-radius: var(--r);
                    overflow: hidden; background: var(--white);
                }
                .mp-viewtoggle button {
                    background: var(--white); border: none; padding: 7px 9px;
                    color: var(--ink-muted); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.18s, color 0.18s;
                }
                .mp-viewtoggle button + button { border-left: 1px solid var(--line-d); }
                .mp-viewtoggle button:hover { color: var(--ink); }
                .mp-viewtoggle button.active { background: var(--ink); color: var(--white); }

                .mp-tl { font-size: 10px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: var(--ink-muted); }
                .mp-dsort { background: var(--white); border: 1px solid var(--line-d); border-radius: var(--r); padding: 8px 32px 8px 14px; font-family: var(--sans); font-size: 13px; color: var(--ink); cursor: pointer; outline: none; font-weight: 600; transition: border-color 0.2s; appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23282c3f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 10px center; }
                .mp-dsort:focus { border-color: var(--ink); }

                /* ── GRID ── */
                .mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
                .mp-grid.compact { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }

                /* ── PRODUCT CARD ── */
                .mp-card { background: linear-gradient(180deg, #ffffff 0%, #faf8f5 100%); border: 1px solid rgba(201,168,76,0.15); border-radius: var(--r-lg); overflow: hidden; position: relative; display: flex; flex-direction: column; transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s, border-color 0.4s; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
                .mp-card:hover { border-color: rgba(201,168,76,0.4); box-shadow: 0 20px 40px rgba(201,168,76,0.15); transform: translateY(-6px); z-index: 2; }

                .mp-wish { position: absolute; top: 10px; right: 10px; z-index: 12; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.96); box-shadow: 0 2px 8px rgba(40,44,63,0.18); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s, background 0.2s; padding: 0; backdrop-filter: blur(6px); }
                .mp-wish:hover { transform: scale(1.15); background: #fff; box-shadow: 0 6px 16px rgba(225,29,72,0.15); }
                .mp-wish:active { transform: scale(0.94); }
                .mp-wish.active { background: #fff4f4; border: 1px solid rgba(225,29,72,0.15); }

                .mp-qview {
                    position: absolute; top: 10px; right: 52px; z-index: 12;
                    width: 34px; height: 34px; border-radius: 50%;
                    border: none; background: rgba(255,255,255,0.96);
                    box-shadow: 0 2px 8px rgba(40,44,63,0.18);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; padding: 0; backdrop-filter: blur(6px);
                    color: var(--ink);
                    opacity: 0; transform: translateY(-4px);
                    transition: opacity 0.25s, transform 0.25s, background 0.2s;
                }
                .mp-card:hover .mp-qview { opacity: 1; transform: translateY(0); }
                .mp-qview:hover { background: var(--ink); color: var(--white); }

                .mp-img-wrap { display: block; overflow: hidden; position: relative; aspect-ratio: 3/4; background: linear-gradient(135deg, #f5f5f6 0%, #ececef 100%); cursor: pointer; text-decoration: none; }
                .mp-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease; will-change: transform, opacity; }
                .mp-card:hover .mp-img { transform: scale(1.06); }

                /* Discount corner ribbon */
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

                /* Image dot indicators */
                .mp-imgdots {
                    position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
                    display: flex; gap: 4px; z-index: 5;
                    opacity: 0; transition: opacity 0.25s ease;
                }
                .mp-card:hover .mp-imgdots { opacity: 1; }
                .mp-imgdots span {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: rgba(255,255,255,0.55);
                    transition: background 0.18s, transform 0.18s;
                }
                .mp-imgdots span.active { background: var(--white); transform: scale(1.3); }

                /* Badges */
                .mp-badges { position: absolute; bottom: 12px; left: 12px; display: flex; flex-direction: column; gap: 6px; z-index: 6; }
                .mp-badges { position: absolute; bottom: 12px; left: 12px; display: flex; flex-direction: column; gap: 6px; z-index: 6; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease; }
                .mp-card:hover .mp-badges { transform: translateY(-38px); }
                .mp-badge { padding: 5px 10px; border-radius: 4px; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: var(--sans); line-height: 1; display: inline-flex; align-items: center; gap: 4px; backdrop-filter: blur(4px); }
                .mp-badge::before { content: '✦'; font-size: 8px; margin-right: 2px; }
                .mp-badge-new { background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark, #9A7A20) 100%); color: #fff; border: 1px solid rgba(255,255,255,0.2); }
                .mp-badge-sale { background: linear-gradient(135deg, #111 0%, #2a2a2a 100%); color: var(--gold); border: 1px solid rgba(201,168,76,0.3); }
                .mp-badge-deal { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: #fecaca; border: 1px solid rgba(239,68,68,0.3); }
                .mp-badge-best { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #fff; border: 1px solid rgba(255,255,255,0.2); }

                .mp-hover-bar { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.97) 60%); padding: 30px 12px 12px; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(8px); transition: opacity 0.28s ease, transform 0.28s ease; pointer-events: none; z-index: 5; }
                .mp-card:hover .mp-hover-bar { opacity: 1; transform: translateY(0); }
                .mp-hover-text { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: var(--ink); text-transform: uppercase; }

                /* Card body */
                .mp-cbody { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
                .mp-cbrand { font-size: 14px; font-weight: 700; color: var(--ink); margin: 0; line-height: 1.2; letter-spacing: -0.1px; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .mp-cname { font-size: 13px; font-weight: 400; color: var(--ink-soft); margin: 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
                .mp-cnlink { color: inherit; text-decoration: none; }
                .mp-cnlink:hover { color: var(--ink); }
                .mp-ccat { font-size: 11px; color: var(--ink-muted); font-weight: 500; letter-spacing: 0.2px; margin: 0 0 4px; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                .mp-rating-row { display: flex; align-items: center; gap: 6px; margin: 2px 0 4px; }
                .mp-rpill { display: inline-flex; align-items: center; gap: 3px; background: var(--white); border: 1px solid var(--line); border-radius: 3px; padding: 2px 6px; font-size: 11px; font-weight: 700; color: var(--ink); box-shadow: 0 1px 3px rgba(40,44,63,0.06); }
                .mp-rpill svg { color: var(--green); }
                .mp-rpill-new { background: var(--pink-soft); color: var(--pink); border-color: rgba(255,63,108,0.2); letter-spacing: 0.5px; font-size: 9px; padding: 3px 7px; }
                .mp-rcount { font-size: 11px; color: var(--ink-muted); font-weight: 600; }

                .mp-price-row { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; margin-top: 4px; }
                .mp-price { font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1; }
                .mp-orig { font-size: 13px; color: var(--ink-muted); font-weight: 400; text-decoration: line-through; }
                .mp-discount { font-size: 12px; font-weight: 700; color: var(--orange); letter-spacing: 0.2px; }

                /* Perks */
                .mp-perks {
                    display: flex; flex-wrap: wrap; gap: 6px;
                    margin-top: 4px;
                }
                .mp-perk {
                    display: inline-flex; align-items: center; gap: 4px;
                    font-size: 10px; font-weight: 700; letter-spacing: 0.2px;
                    color: var(--green);
                    background: var(--green-soft);
                    border: 1px solid rgba(3,166,133,0.18);
                    padding: 3px 7px; border-radius: 3px;
                }
                .mp-perk-hot {
                    color: var(--pink);
                    background: var(--pink-soft);
                    border-color: rgba(255,63,108,0.2);
                }

                /* Hover actions */
                .mp-actions { display: flex; flex-direction: column; gap: 8px; overflow: hidden; max-height: 0; opacity: 0; pointer-events: none; transition: max-height 0.3s ease, opacity 0.25s ease, margin 0.3s ease; margin-top: 0; }
                .mp-card:hover .mp-actions, .mp-card:focus-within .mp-actions { max-height: 220px; opacity: 1; pointer-events: auto; margin-top: 10px; }

                .mp-size-strip { display: flex; flex-direction: column; gap: 6px; background: #fafafb; border: 1px solid var(--line); border-radius: var(--r); padding: 8px 10px; }
                .mp-size-label { font-size: 9px; font-weight: 800; letter-spacing: 1.5px; color: var(--ink-muted); text-transform: uppercase; }
                .mp-sbtns { display: flex; flex-wrap: wrap; gap: 4px; }
                .mp-sbtn { min-width: 28px; height: 26px; padding: 0 7px; border: 1px solid var(--line-d); border-radius: 4px; background: var(--white); font-family: var(--sans); font-size: 10px; font-weight: 700; color: var(--ink-mid); cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
                .mp-sbtn:hover { border-color: var(--gold); color: var(--gold-dark); background: rgba(201,168,76,0.05); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(201,168,76,0.1); }
                .mp-sbtn.active { background: linear-gradient(135deg, #111 0%, #222 100%); color: var(--gold); border-color: #111; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transform: translateY(-1px); }

                .mp-addbtn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 14px; background: linear-gradient(135deg, #111 0%, #222 100%); color: var(--gold); border: 1px solid #111; border-radius: var(--r); font-family: var(--sans); font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; cursor: pointer; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); box-sizing: border-box; box-shadow: 0 4px 15px rgba(0,0,0,0.15); position: relative; overflow: hidden; }
                .mp-addbtn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.2), transparent); transition: all 0.5s ease; }
                .mp-addbtn:hover { background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%); color: #111; border-color: var(--gold); box-shadow: 0 8px 25px rgba(201,168,76,0.3); transform: translateY(-2px); }
                .mp-addbtn:hover::before { left: 100%; }
                .mp-addbtn:active { transform: translateY(0); }
                .mp-addbtn.pending { background: var(--white); color: var(--ink); border-color: var(--line-d); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
                .mp-addbtn.pending:hover { background: linear-gradient(135deg, #111 0%, #222 100%); color: var(--gold); border-color: #111; box-shadow: 0 6px 18px rgba(0,0,0,0.15); }

                .mp-cbadge { display: inline-flex; align-items: center; justify-content: center; gap: 5px; background: var(--green-soft); border: 1px solid rgba(3,166,133,0.25); border-radius: var(--r); font-size: 11px; font-weight: 700; color: var(--green); text-align: center; padding: 6px 10px; letter-spacing: 0.3px; margin-top: 6px; }

                /* Load more */
                .mp-loadmore-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    padding: 36px 0 12px;
                }
                .mp-loadinfo { font-size: 12px; color: var(--ink-soft); margin: 0; }
                .mp-loadinfo strong { color: var(--ink); font-weight: 700; }
                .mp-loadmore {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #111 0%, #222 100%); color: var(--gold);
                    border: 1px solid #111; border-radius: var(--r);
                    padding: 14px 36px; font-family: var(--sans);
                    font-size: 12px; font-weight: 800; letter-spacing: 1.5px;
                    text-transform: uppercase; cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
                .mp-loadmore:hover { background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%); color: #111; border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 12px 28px rgba(201,168,76,0.3); }

                /* Recently viewed */
                .mp-recent {
                    margin-top: 50px; padding: 26px;
                    background: var(--white); border: 1px solid var(--line);
                    border-radius: var(--r-lg); box-shadow: var(--shadow);
                }
                .mp-recent-head {
                    display: flex; align-items: flex-end; justify-content: space-between;
                    gap: 12px; margin-bottom: 18px; padding-bottom: 14px;
                    border-bottom: 1px solid var(--line);
                }
                .mp-recent-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-muted); text-transform: uppercase; margin: 0 0 4px; }
                .mp-recent-title { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); margin: 0; line-height: 1.1; }
                .mp-recent-clear {
                    background: transparent; border: none; padding: 0;
                    font-size: 11px; font-weight: 700; color: var(--pink);
                    cursor: pointer; letter-spacing: 0.5px;
                }
                .mp-recent-clear:hover { color: var(--pink-dark); }
                .mp-recent-row {
                    display: flex; gap: 14px; overflow-x: auto;
                    scrollbar-width: thin; scrollbar-color: var(--line-d) transparent;
                    padding-bottom: 6px;
                }
                .mp-recent-row::-webkit-scrollbar { height: 5px; }
                .mp-recent-row::-webkit-scrollbar-thumb { background: var(--line-d); border-radius: 2px; }
                .mp-recent-card {
                    flex: 0 0 160px; text-decoration: none; color: inherit;
                    border: 1px solid var(--line); border-radius: var(--r);
                    background: var(--white); overflow: hidden;
                    transition: border-color 0.2s, transform 0.25s, box-shadow 0.25s;
                }
                .mp-recent-card:hover { border-color: var(--ink); transform: translateY(-3px); box-shadow: var(--shadow-lg); }
                .mp-recent-img { aspect-ratio: 1/1.1; background: #f5f5f6; overflow: hidden; }
                .mp-recent-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .mp-recent-body { padding: 8px 10px 10px; }
                .mp-recent-brand { font-size: 11px; font-weight: 700; color: var(--ink); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: capitalize; }
                .mp-recent-name { font-size: 11px; color: var(--ink-soft); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .mp-recent-price { font-size: 12px; font-weight: 700; color: var(--ink); margin: 0; }
                .mp-recent-price del { font-size: 10px; color: var(--ink-muted); font-weight: 400; margin-left: 4px; }

                /* Empty */
                .mp-empty { text-align: center; padding: 80px 20px; background: var(--white); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow); }
                .mp-eico { color: var(--line-d); margin: 0 auto 18px; display: flex; justify-content: center; }
                .mp-empty h4 { font-family: var(--serif); font-size: 24px; font-weight: 600; color: var(--ink); margin: 0 0 8px; }
                .mp-empty p { font-size: 13px; color: var(--ink-soft); margin: 0 0 24px; }
                .mp-ebtn { background: var(--ink); color: var(--white); border: 1px solid var(--ink); border-radius: var(--r); padding: 12px 30px; font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all 0.22s; }
                .mp-ebtn:hover { background: var(--pink); border-color: var(--pink); }

                /* ── QUICK VIEW MODAL ── */
                .mp-qv-backdrop {
                    position: fixed; inset: 0; z-index: 999;
                    background: rgba(20,22,30,0.65);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    padding: 24px; overflow-y: auto;
                }
                .mp-qv-modal {
                    position: relative;
                    background: var(--white); border-radius: var(--r-lg);
                    max-width: 880px; width: 100%; max-height: 92vh;
                    overflow: hidden;
                    display: grid; grid-template-columns: 1.05fr 1fr;
                    box-shadow: 0 30px 80px rgba(20,22,30,0.4);
                }
                .mp-qv-close {
                    position: absolute; top: 14px; right: 14px; z-index: 12;
                    width: 34px; height: 34px; border-radius: 50%;
                    border: none; background: var(--white);
                    color: var(--ink); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 2px 8px rgba(40,44,63,0.18);
                    transition: background 0.18s, color 0.18s, transform 0.18s;
                }
                .mp-qv-close:hover { background: var(--ink); color: var(--white); transform: scale(1.06); }
                .mp-qv-img {
                    position: relative; aspect-ratio: 4/5;
                    background: #f5f5f6; overflow: hidden;
                }
                .mp-qv-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .mp-qv-body {
                    padding: 30px 30px 26px;
                    overflow-y: auto;
                    display: flex; flex-direction: column; gap: 6px;
                }
                .mp-qv-brand { font-size: 11px; font-weight: 800; letter-spacing: 1.8px; color: var(--ink-muted); text-transform: uppercase; margin: 0; }
                .mp-qv-name { font-family: var(--serif); font-size: 26px; font-weight: 600; color: var(--ink); margin: 4px 0 4px; line-height: 1.2; }
                .mp-qv-cat { font-size: 12px; color: var(--ink-soft); margin: 0 0 10px; text-transform: capitalize; }
                .mp-qv-price { display: flex; align-items: baseline; gap: 9px; margin-top: 16px; flex-wrap: wrap; }
                .mp-qv-price .mp-price { font-size: 26px; }
                .mp-qv-price .mp-orig { font-size: 16px; }
                .mp-qv-price .mp-discount { font-size: 14px; }
                .mp-qv-tax { font-size: 11px; color: var(--ink-muted); margin: 4px 0 0; }
                .mp-qv-section { margin-top: 20px; }
                .mp-qv-label { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: var(--ink); text-transform: uppercase; margin: 0 0 10px; }
                .mp-qv-sizes .mp-sbtn { min-width: 38px; height: 38px; font-size: 12px; }
                .mp-qv-actions { display: flex; gap: 10px; margin-top: 20px; }
                .mp-qv-add { flex: 1.4; padding: 14px 18px; font-size: 12px; }
                .mp-qv-wish {
                    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 14px 18px; background: var(--white); color: var(--ink);
                    border: 1.5px solid var(--ink); border-radius: var(--r);
                    font-size: 11px; font-weight: 800; letter-spacing: 1.4px;
                    text-transform: uppercase; cursor: pointer;
                    transition: all 0.22s;
                }
                .mp-qv-wish:hover { background: var(--ink); color: var(--white); }
                .mp-qv-wish.active { color: #e11d48; border-color: #e11d48; background: #fff4f4; }
                .mp-qv-wish.active:hover { background: #e11d48; color: var(--white); }
                .mp-qv-viewfull {
                    margin-top: 14px; font-size: 12px; font-weight: 700;
                    color: var(--ink); text-decoration: underline;
                    text-decoration-color: var(--line-d); text-underline-offset: 4px;
                    transition: color 0.18s, text-decoration-color 0.18s;
                }
                .mp-qv-viewfull:hover { color: var(--pink); text-decoration-color: var(--pink); }
                .mp-qv-perks {
                    margin-top: 22px; padding-top: 18px;
                    border-top: 1px dashed var(--line);
                    display: flex; flex-direction: column; gap: 8px;
                }
                .mp-qv-perk {
                    display: inline-flex; align-items: center; gap: 10px;
                    font-size: 12px; color: var(--ink-soft);
                }
                .mp-qv-perk svg { color: var(--ink); flex-shrink: 0; }

                /* Skeleton */
                .mp-skel-card { border-color: var(--line); box-shadow: none; pointer-events: none; }
                .mp-skel-card .mp-img-wrap { background: #ececef; }
                .mp-skel-card .mp-cbody { gap: 10px; }
                .mp-skel-line { height: 11px; border-radius: 3px; background: #ececef; }
                .mp-shimmer { background: linear-gradient(90deg, #ececef 25%, #f5f5f6 50%, #ececef 75%); background-size: 200% 100%; animation: mpShimmer 1.4s infinite linear; }
                @keyframes mpShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .mp-skel-line { height: 11px; border-radius: 6px; background: #efefef; }
                .mp-shimmer { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: mpShimmer 1.5s infinite ease-in-out; }
                @keyframes mpShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .mp-skel-card { background: linear-gradient(135deg, #fff 0%, #f9f9f9 100%); border: 1px solid #eee; }

                @media (prefers-reduced-motion: reduce) {
                    .mp-card,.mp-img,.mp-hover-bar,.mp-addbtn,.mp-sbtn,.mp-sidebar,.mp-actions,.mp-qview { transition: none !important; animation: none !important; }
                }
                @media (hover: none) and (pointer: coarse) {
                    .mp-card:hover { transform: none; box-shadow: var(--shadow); border-color: var(--line); }
                    .mp-card:hover .mp-img { transform: none; }
                    .mp-hover-bar { display: none; }
                    .mp-actions { max-height: 220px; opacity: 1; pointer-events: auto; margin-top: 10px; }
                    .mp-qview { opacity: 1; transform: none; }
                    .mp-imgdots { display: none; }
                }

                /* RESPONSIVE */
                @media (max-width: 1280px) {
                    .mp-layout { padding: 22px 20px 50px; gap: 20px; }
                    .mp-sidebar { width: 240px; }
                    .mp-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
                    .mp-grid.compact { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
                }
                @media (max-width: 991px) {
                    .mp-hero { min-height: 280px; padding: 50px 22px; }
                    .mp-trust-inner { padding: 12px 16px; gap: 14px; justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; }
                    .mp-trust-item { font-size: 12px; white-space: nowrap; }
                    .mp-mbar { display: flex; }
                    .mp-layout { padding: 16px 14px 40px; gap: 0; }
                    .mp-toolbar { display: none; }
                    .mp-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
                    .mp-grid.compact { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
                    .mp-backdrop { display: block; }
                    .mp-sidebar { position: fixed; top: 0; left: 0; width: 320px; height: 100vh; max-height: none; z-index: 1050; border-radius: 0; transform: translateX(-110%); transition: transform 0.32s cubic-bezier(0.16,1,0.3,1); }
                    .mp-sidebar.open { transform: translateX(0); box-shadow: 0 0 60px rgba(40,44,63,0.25); }
                    .mp-sb-inner { border-radius: 0; min-height: 100vh; }
                    .mp-sb-close { display: flex; }
                    .mp-qv-modal { grid-template-columns: 1fr; max-width: 460px; max-height: 92vh; }
                    .mp-qv-img { aspect-ratio: 4/4.2; max-height: 50vh; }
                    .mp-qv-body { padding: 20px 22px 22px; }
                }
                @media (max-width: 900px) {
                    .mp-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
                    .mp-grid.compact { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                }
                @media (max-width: 640px) {
                    .mp-hero { min-height: 240px; padding: 44px 18px; }
                    .mp-hero-title { font-size: 2.2rem; }
                    .mp-hero-sub { font-size: 13px; }
                    .mp-hero-stats { max-width: 100%; }
                    .mp-layout { padding: 12px 10px 32px; }
                    .mp-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .mp-grid.compact { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .mp-cbody { padding: 10px 12px 12px; }
                    .mp-cbrand { font-size: 13px; }
                    .mp-cname { font-size: 12px; }
                    .mp-ccat { font-size: 10px; }
                    .mp-price { font-size: 15px; }
                    .mp-orig { font-size: 12px; }
                    .mp-discount { font-size: 11px; }
                    .mp-addbtn { font-size: 10px; padding: 9px 12px; letter-spacing: 1px; }
                    .mp-actions { max-height: 220px; opacity: 1; pointer-events: auto; margin-top: 8px; }
                    .mp-qview { display: none; }
                    .mp-qv-name { font-size: 22px; }
                    .mp-qv-actions { flex-direction: column; }
                    .mp-recent-card { flex: 0 0 140px; }
                }
                @media (max-width: 500px) {
                    .mp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
                    .mp-grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
                    .mp-cbody { padding: 8px 10px 10px; gap: 3px; }
                    .mp-cbrand { font-size: 12px; }
                    .mp-cname { font-size: 11px; }
                    .mp-ccat { font-size: 9px; }
                    .mp-price { font-size: 13px; }
                    .mp-orig { font-size: 11px; }
                    .mp-addbtn { font-size: 9px; padding: 7px 9px; }
                }
                @media (max-width: 420px) {
                    .mp-hero-title { font-size: 1.9rem; }
                    .mp-hstat span { font-size: 24px; }
                    .mp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
                    .mp-grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
                    .mp-cbody { padding: 7px 9px 9px; gap: 2px; }
                    .mp-cbrand { font-size: 11px; }
                    .mp-cname { font-size: 10px; }
                    .mp-price { font-size: 12px; }
                    .mp-addbtn { font-size: 8px; padding: 7px 9px; }
                    .mp-sbtn { min-width: 24px; height: 22px; font-size: 9px; }
                    .mp-ribbon { font-size: 9px; padding: 5px 14px 5px 8px; }
                }
            `}} />
        </div>
    )
}
