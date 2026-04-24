import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from './ToastNotification';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators';
import { getSubcategory } from '../Store/ActionCreaters/SubcategoryActionCreators';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { BASE_URL } from '../constants';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

export default function Shop() {
    var { maincat } = useParams()
    var dispatch = useDispatch()
    var navigate = useNavigate()
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    const tagParam = params.get('tag');

    // --- STATES ---
    var [mc, setmc] = useState(maincat)
    var [sc, setsc] = useState("All")
    var [br, setbr] = useState("All")
    var [size, setSize] = useState("All")
    var [min, setmin] = useState(1)
    var [max, setmax] = useState(10000)
    var [search, setSearch] = useState("")
    var [searchInput, setSearchInput] = useState("")
    var [tagFilter, setTagFilter] = useState(tagParam || "All")
    var [sortBy, setSortBy] = useState("newest")
    var [selectedSizes, setSelectedSizes] = useState({})
    var [cartNotifications, setCartNotifications] = useState({})
    const toast = useToast();
    const [reviewStats, setReviewStats] = useState({});
    var [selectedColors, setSelectedColors] = useState({})
    var [sidebarOpen, setSidebarOpen] = useState(false)
    var [isLoading, setIsLoading] = useState(true)

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

    // Sync Tag filter with URL params
    useEffect(() => {
        if (tagParam) {
            setTagFilter(tagParam);
        }
    }, [tagParam]);

    // Debounce Search Input to prevent laggy re-renders on every keystroke
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setSearch(searchInput)
        }, 300)
        return () => clearTimeout(delayDebounceFn)
    }, [searchInput])

    // Dynamically compute all unique sizes from all products
    // Preserve admin's order for sizes (no sorting) for product cards
    const AVAILABLE_SIZES = useMemo(() => {
        const allSizes = (product || []).flatMap(p => Array.isArray(p.size) ? p.size : [p.size]);
        const seen = new Set();
        return allSizes.filter(s => {
            if (!s || seen.has(s)) return false;
            seen.add(s);
            return true;
        });
    }, [product]);
    // For sidebar filter: show all possible sizes
    const ALL_SIZES = ['XS','S','M','L','XL','2XL','28','30','32','34','36','38','40','42'];

    const normalizeCategory = (value) => String(value || '')
        .trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

    const CATEGORY_GROUPS = [
        { key: 'kids', aliases: ['kid', 'kids', 'boy', 'boys', 'girl', 'girls', 'child', 'children'] },
        { key: 'women', aliases: ['woman', 'women', 'womens', 'lady', 'ladies', 'female'] },
        { key: 'mens', aliases: ['man', 'men', 'mens', 'male'] }
    ]

    const resolveCategoryGroup = (value) => {
        const normalized = normalizeCategory(value)
        if (!normalized || normalized === 'all') return normalized
        const matchedGroup = CATEGORY_GROUPS.find((group) =>
            group.aliases.some((alias) => normalized === alias || normalized.includes(alias))
        )
        return matchedGroup ? matchedGroup.key : normalized
    }

    const matchesCategory = (productCategory, selectedCategory) => {
        const normalizedSelected = resolveCategoryGroup(selectedCategory)
        if (!normalizedSelected || normalizedSelected === 'all') return true
        return resolveCategoryGroup(productCategory) === normalizedSelected
    }

    const matchesSearchQuery = (item, query) => {
        const normalizedQuery = normalizeCategory(query)
        if (!normalizedQuery) return true
        const searchableText = [item.name, item.maincategory, item.subcategory, item.brand]
            .filter(Boolean).join(' ').toLowerCase()
        if (searchableText.includes(normalizedQuery)) return true
        const resolvedGroup = resolveCategoryGroup(normalizedQuery)
        if (resolvedGroup === 'all' || resolvedGroup === normalizedQuery) return false
        return matchesCategory(item.maincategory, resolvedGroup) || matchesCategory(item.subcategory, resolvedGroup)
    }

    const colorMap = {
        black: '#111111', white: '#ffffff', red: '#e74c3c', blue: '#3498db',
        green: '#27ae60', yellow: '#f1c40f', orange: '#f39c12', purple: '#9b59b6',
        pink: '#e84393', gray: '#95a5a6', grey: '#95a5a6', brown: '#8e6e53',
        beige: '#f5f5dc', navy: '#1b2a4e', maroon: '#7b1e1e'
    }
    const DEFAULT_COLORS = ['black', 'white', 'red', 'blue', 'green']

    function normalizeColors(value) {
        const list = value
            ? value.split(/[,/|]/).map((c) => c.trim()).filter((c) => c.length > 0).slice(0, 6)
            : []
        if (list.length === 0) return DEFAULT_COLORS
        const merged = [...list]
        for (const c of DEFAULT_COLORS) {
            if (merged.length >= 6) break
            if (!merged.some((m) => m.toLowerCase() === c)) merged.push(c)
        }
        return merged
    }

    function resolveColor(value) {
        const key = String(value || '').toLowerCase()
        if (colorMap[key]) return colorMap[key]
        return key.startsWith('#') ? key : '#dfe6e9'
    }

    var product = useSelector((state) => state.ProductStateData)
    var maincategory = useSelector((state) => state.MaincategoryStateData)
    var subcategory = useSelector((state) => state.SubcategoryStateData)
    var brand = useSelector((state) => state.BrandStateData)
    var cart = useSelector((state) => state.CartStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)

    useEffect(() => {
        dispatch(getProduct())
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
        dispatch(getCart())
        dispatch(getWishlist())
    }, [dispatch])

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

    // Dismiss loader when products are loaded, or fallback after a timeout (if empty)
    useEffect(() => {
        if (product && product.length > 0) {
            setIsLoading(false);
        }
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, [product]);

    useEffect(() => { setmc(maincat) }, [maincat])

    function addToCart(p, sizeFromParam = null, colorFromParam = null) {
        if (!localStorage.getItem("login")) { navigate("/login"); return }
        const selectedSize = sizeFromParam || selectedSizes[p.id]
        if (!selectedSize) { toast.warning('⚠️ Please select a size first'); return; }
        const selectedColor = colorFromParam || selectedColors[p.id]
        if (normalizeColors(p.color).length > 0 && !selectedColor) { toast.warning('⚠️ Please select a color first'); return; }
        let existingItem = (cart.items || []).find((item) =>
            item.productid === p.id && item.userid === localStorage.getItem("userid") &&
            item.size === selectedSize && item.color === selectedColor
        )
        if (existingItem) {
            const currentCount = (cartNotifications[p.id] || 0) + 1;
            setCartNotifications({...cartNotifications, [p.id]: currentCount});
            toast.info(`✓ Already added! Total: ${currentCount} time(s)`);
        } else {
            dispatch(addCart({
                userId: localStorage.getItem("userid"),
                productId: p.id,
                quantity: 1,
                size: selectedSize,
                color: selectedColor
            }))
            const currentCount = (cartNotifications[p.id] || 0) + 1
            setCartNotifications({...cartNotifications, [p.id]: currentCount})
            toast.success(`✓ Added to bag! (${currentCount} item)`);
        }
    }

    const isInWishlist = (productId) => {
        const userId = localStorage.getItem('userid')
        return (wishlist || []).some((item) => String(item.productid) === String(productId) && String(item.userid) === String(userId))
    }

    // Home page style toggle wishlist logic
    function toggleWishlist(p) {
        if (!localStorage.getItem('login')) {
            navigate('/login');
            return;
        }
        const userId = localStorage.getItem('userid');
        const productId = p.id || p._id;
        const existing = (wishlist || []).find((item) => String(item.productid) === String(productId) && String(item.userid) === String(userId));

        // Wishlist expects size as string, not array
        let selectedSize = selectedSizes[p.id];
        // If no size selected, try to pick first available size
        if (!selectedSize) {
            const sizesArr = Array.isArray(p.size) ? p.size : [p.size];
            selectedSize = sizesArr && sizesArr.length > 0 ? sizesArr[0] : '';
        }
        if (!selectedSize) {
            toast.warning('⚠️ Please select a size first');
            return;
        }

        if (existing) {
            dispatch(deleteWishlist({ id: existing.id || existing._id }));
            toast.info('Removed from wishlist');
        } else {
            dispatch(addWishlist({
                userid: userId,
                productid: productId,
                name: p.name,
                color: p.color,
                size: selectedSize, // Only string!
                price: Number(p.finalprice || 0),
                pic: p.pic1
            }));
            toast.success('Added to wishlist');
        }
    }

    const filteredProducts = useMemo(() => {
        let temp = [...product];
        if (category) { temp = temp.filter((x) => matchesCategory(x.maincategory, category) || matchesCategory(x.subcategory, category)); }
        
        if (tagFilter === 'New Arrivals') {
            temp = temp.filter(x => x.newArrival);
        } else if (tagFilter === 'Sale') {
            temp = temp.filter(x => x.isSale);
        }
        
        if (mc !== 'All') temp = temp.filter(x => matchesCategory(x.maincategory, mc));
        if (sc !== 'All') temp = temp.filter(x => matchesCategory(x.subcategory, sc));
        if (br !== 'All') temp = temp.filter(x => normalizeCategory(x.brand) === normalizeCategory(br));
        if (size !== 'All') {
            temp = temp.filter(x => {
                const sizes = Array.isArray(x.size) ? x.size.map(s => String(s).toUpperCase()) : [String(x.size).toUpperCase()];
                if (size.toUpperCase() === '2XL' || size.toUpperCase() === 'XXL') {
                    return sizes.includes('2XL') || sizes.includes('XXL');
                }
                return sizes.includes(size.toUpperCase());
            });
        }
        temp = temp.filter(x => x.finalprice >= min && x.finalprice <= max);
        if (search) { temp = temp.filter((x) => matchesSearchQuery(x, search)); }
        if (sortBy === "low") temp.sort((a, b) => a.finalprice - b.finalprice);
        else if (sortBy === "high") temp.sort((a, b) => b.finalprice - a.finalprice);
        else temp.reverse();
        return temp;
    }, [product, mc, sc, br, size, min, max, search, sortBy, category, tagFilter]);

    return (
        <div className="lux-shop-root">

            {/* ══ HERO — FULLY CENTERED ══ */}
            <div className="lux-hero">
                <div className="lux-hero-glow lux-glow-l" />
                <div className="lux-hero-glow lux-glow-r" />
                <div className="lux-hero-grain" />
                <div className="lux-hero-inner">
                    <motion.span className="lux-hero-eyebrow"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                    >
                        <span className="lux-eline" />The Collection<span className="lux-eline" />
                    </motion.span>
                    <motion.h1 className="lux-hero-title"
                        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.15 }}
                    >Curated <em>Luxury</em><br />for Every Style</motion.h1>
                    <motion.p className="lux-hero-sub"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.75, delay: 0.3 }}
                    >Discover premium pieces crafted with exceptional quality</motion.p>
                    {isAdmin && (
                        <motion.div className="lux-hero-stats"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
                        >
                            <div className="lux-hstat"><span>{filteredProducts.length}</span><small>Pieces</small></div>
                            <div className="lux-hdiv" />
                            <div className="lux-hstat"><span>{brand.length}</span><small>Brands</small></div>
                            <div className="lux-hdiv" />
                            <div className="lux-hstat"><span>{maincategory.length}</span><small>Categories</small></div>
                        </motion.div>
                    )}
                </div>
                <div className="lux-hero-watermark">BOUTIQUE LUXE · ESHOPPER</div>
            </div>

            {/* ══ MOBILE BAR ══ */}
            <div className="lux-mbar">
                <button className="lux-ftoggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
                    </svg>
                    Filters
                </button>
                <span className="lux-mcount">{filteredProducts.length} items</span>
                <select className="lux-msort" onChange={(e) => setSortBy(e.target.value)}>
                    <option value="newest">Newest</option>
                    <option value="low">Price ↑</option>
                    <option value="high">Price ↓</option>
                </select>
            </div>

            <div className="lux-layout">
                {/* Backdrop */}
                {sidebarOpen && <div className="lux-backdrop" onClick={() => setSidebarOpen(false)} />}

                {/* ══ SIDEBAR — PREMIUM REFINE ══ */}
                <aside className={`lux-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="lux-sb-inner">
                        <div className="lux-sb-head">
                            <div>
                                <p className="lux-sb-eyebrow">Filter & Sort</p>
                                <h2 className="lux-sb-title">Refine</h2>
                            </div>
                            <button className="lux-sb-close" onClick={() => setSidebarOpen(false)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="lux-fg">
                            <label className="lux-fl"><span className="lux-fl-icon">◎</span>Search</label>
                            <div className="lux-sw">
                                <svg className="lux-si" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input className="lux-sinp" type="text" placeholder="Search pieces…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                            </div>
                        </div>

                        {/* Highlights (Sale / New Arrival) */}
                        <div className="lux-fg">
                            <label className="lux-fl"><span className="lux-fl-icon">✨</span>Highlights</label>
                            <div className="lux-sgrid">
                                {['All', 'New Arrivals', 'Sale'].map((t, i) => (
                                    <button key={i} onClick={() => setTagFilter(t)} className={`lux-sp ${tagFilter === t ? 'active' : ''}`}>{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* Category */}
                        <div className="lux-fg">
                            <label className="lux-fl"><span className="lux-fl-icon">⊞</span>Category</label>
                            <select className="lux-sel" value={mc} onChange={(e) => setmc(e.target.value)}>
                                <option value="All">All Categories</option>
                                {maincategory.map((item, i) => <option key={i} value={item.name}>{item.name}</option>)}
                            </select>
                        </div>

                        {/* Size */}
                        <div className="lux-fg">
                            <label className="lux-fl"><span className="lux-fl-icon">◻</span>Size</label>
                            <div className="lux-sgrid">
                                {['All',...ALL_SIZES].map((s, i) => (
                                    <button key={i} onClick={() => setSize(s)} className={`lux-sp ${size === s ? 'active' : ''}`}>{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* Brand — ADMIN ONLY */}
                        {isAdmin && (
                            <div className="lux-fg lux-admin-fg">
                                <label className="lux-fl lux-fl-admin">
                                    <span className="lux-fl-icon">◈</span>Brand
                                    <span className="lux-atag">Admin</span>
                                </label>
                                <select className="lux-sel" onChange={(e) => setbr(e.target.value)}>
                                    <option value="All">All Brands</option>
                                    {brand.map((item, i) => <option key={i} value={item.name}>{item.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Price */}
                        <div className="lux-fg">
                            <label className="lux-fl"><span className="lux-fl-icon">₹</span>Price Range</label>
                            <div className="lux-prow">
                                <input className="lux-pinp" type="number" placeholder="Min" onChange={(e) => setmin(e.target.value)} />
                                <span className="lux-psep">—</span>
                                <input className="lux-pinp" type="number" placeholder="Max" onChange={(e) => setmax(e.target.value)} />
                            </div>
                        </div>

                        {/* Sort */}
                        {/* <div className="lux-fg lux-fg-last">
                            <label className="lux-fl"><span className="lux-fl-icon">⇅</span>Sort By</label>
                            <select className="lux-sel" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                                <option value="newest">Newest First</option>
                                <option value="low">Price: Low to High</option>
                                <option value="high">Price: High to Low</option>
                            </select>
                        </div> */}
                    </div>
                </aside>

                {/* ══ MAIN ══ */}
                <main className="lux-main">
                    {/* Desktop toolbar */}
                    <div className="lux-toolbar">
                        <span className="lux-tc">Showing <strong>{filteredProducts.length}</strong> pieces</span>
                        <div className="lux-tr">
                            <span className="lux-tl">Sort</span>
                            <select className="lux-dsort" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                                <option value="newest">Newest First</option>
                                <option value="low">Price: Low to High</option>
                                <option value="high">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="lux-grid">
                        <AnimatePresence>
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, idx) => (
                                    <motion.div key={`skeleton-${idx}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="lux-card lux-skeleton-card"
                                    >
                                        <div className="lux-img-wrap lux-shimmer" style={{ background: '#f0ede8' }} />
                                        <div className="lux-cbody">
                                            <div className="lux-shimmer" style={{ height: '10px', width: '30%', background: '#f0ede8', borderRadius: '4px', marginBottom: '12px' }} />
                                            <div className="lux-shimmer" style={{ height: '18px', width: '80%', background: '#f0ede8', borderRadius: '4px', marginBottom: '12px' }} />
                                            <div className="lux-shimmer" style={{ height: '12px', width: '50%', background: '#f0ede8', borderRadius: '4px', marginBottom: '24px' }} />
                                            <div className="lux-shimmer" style={{ height: '36px', width: '100%', background: '#f0ede8', borderRadius: '4px', marginTop: 'auto' }} />
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                filteredProducts.map((item, index) => {
                                const stats = reviewStats[item.id];
                                const ratingValue = stats ? stats.average : (item.rating || 0);
                                const reviewCount = stats ? stats.count : 0;
                                return (<motion.div key={item.id} layout
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.94 }}
                                    transition={{ duration: 0.38, delay: Math.min(index * 0.035, 0.4) }}
                                    className="lux-card"
                                >
                                    <div className="lux-pcard-badges">
                                        {item.isSale && <span className="lux-badge lux-badge-sale">✦ SALE</span>}
                                        {!item.isSale && item.discount > 0 && <span className="lux-badge lux-badge-discount">✦ {item.discount}% OFF</span>}
                                        {item.newArrival && <span className="lux-badge lux-badge-new">✨ NEW ARRIVAL</span>}
                                    </div>

                                    <button
                                        type="button"
                                        className={`lux-wish ${isInWishlist(item.id) ? 'active' : ''}`}
                                        onClick={e => { e.preventDefault(); toggleWishlist(item); }}
                                        aria-label={isInWishlist(item.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                                        title={isInWishlist(item.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                                        style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                                    >
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill={isInWishlist(item.id) ? '#e74c3c' : 'none'} stroke="#b8965a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 21s-6.7-4.4-9.3-7.9C.7 10.2 1.5 6.9 4.4 5.3c2.3-1.2 4.6-.4 6 1.4 1.4-1.8 3.7-2.6 6-1.4 2.9 1.6 3.7 4.9 1.7 7.8C18.7 16.6 12 21 12 21z" />
                                        </svg>
                                    </button>

                                    {/* Image — blur + centered overlay on hover */}
                                    <Link to={`/single-product/${item.id}`} className="lux-img-wrap">
                                        <img
                                            src={optimizeCloudinaryUrlAdvanced(item.pic1, { maxWidth: 500, crop: 'fill' })}
                                            loading="lazy" decoding="async"
                                            className="lux-img" alt={item.name}
                                        />
                                        <div className="lux-overlay">
                                            <motion.span className="lux-vpill"
                                                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                View Details
                                            </motion.span>
                                        </div>
                                    </Link>

                                    <div className="lux-cbody">
                                        <div className="lux-cmeta">
                                            <span className="lux-cbrand">{item.brand}</span>
                                            <div className="lux-crating">
                                                <span className="lux-stars">{[1,2,3,4,5].map(s=><span key={s}>{s<=Math.floor(ratingValue)?'★':'☆'}</span>)}</span>
                                                <span className="lux-rnum">({ratingValue > 0 ? `${ratingValue.toFixed(1)} (${reviewCount})` : 'New'})</span>
                                            </div>
                                        </div>
                                        <h3 className="lux-cname">
                                            <Link to={`/single-product/${item.id}`} className="lux-cnlink">{item.name}</Link>
                                        </h3>
                                        <p className="lux-ccat">{item.maincategory} · {item.subcategory}</p>

                                        {normalizeColors(item.color).length > 0 && (
                                            <div className="lux-colors">
                                                <span className="lux-clabel">Colour</span>
                                                <div className="lux-cdots">
                                                    {normalizeColors(item.color).map((c) => (
                                                        <button key={`${item.id}-${c}`} type="button"
                                                            className={`lux-cdot ${selectedColors[item.id]===c?'active':''}`}
                                                            style={{ backgroundColor: resolveColor(c) }}
                                                            onClick={() => setSelectedColors({...selectedColors,[item.id]:c})}
                                                            title={c} aria-label={`Select colour ${c}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="lux-sizes">
                                            <div className="lux-shd">
                                                <span className="lux-slbl">Size</span>
                                                {selectedSizes[item.id] && <span className="lux-schosen">{selectedSizes[item.id]}</span>}
                                            </div>
                                            <div className="lux-sbtns">
                                                {Array.from(new Set((Array.isArray(item.size) ? item.size : [item.size]).filter(s => s && s !== 'All'))).map((s) => (
                                                    <motion.button key={s}
                                                        onClick={() => setSelectedSizes({...selectedSizes,[item.id]:s})}
                                                        className={`lux-sbtn ${selectedSizes[item.id]===s?'active':''}`}
                                                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                                                    >{s}</motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="lux-prow-c">
                                            <span className="lux-price">₹{item.finalprice}</span>
                                            {item.baseprice > item.finalprice && (
                                                <>
                                                    <del className="lux-orig">₹{item.baseprice}</del>
                                                    <span className="lux-save">SAVE ₹{item.baseprice - item.finalprice}</span>
                                                </>
                                            )}
                                        </div>

                                        <motion.button
                                            onClick={() => addToCart(item, selectedSizes[item.id], selectedColors[item.id])}
                                            className={`lux-addbtn ${(!selectedSizes[item.id]||(normalizeColors(item.color).length>0&&!selectedColors[item.id]))?'disabled':''}`}
                                            whileHover={(selectedSizes[item.id])?{scale:1.02}:{}}
                                            whileTap={(selectedSizes[item.id])?{scale:0.98}:{}}
                                        >
                                            <span>Add to Bag</span>
                                            <span className="lux-addico">+</span>
                                        </motion.button>

                                        {cartNotifications[item.id] && (
                                            <motion.div className="lux-cbadge"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                            >✓ Added {cartNotifications[item.id]}×</motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}))}
                        </AnimatePresence>
                    </div>

                    {!isLoading && filteredProducts.length === 0 && (
                        <div className="lux-empty">
                            <div className="lux-eico">◇</div>
                            <h4>No pieces match your selection</h4>
                            <p>Refine your filters or explore the full collection</p>
                            <button className="lux-ebtn" onClick={() => window.location.reload()}>Clear All Filters</button>
                        </div>
                    )}
                </main>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                /* Force premium admin stats CSS */
                .lux-hero-stats {
                    display: flex !important;
                    align-items: center !important;
                    gap: 0 !important;
                    border-top: 1px solid rgba(184,150,90,0.2) !important;
                    padding-top: 28px !important;
                    width: 100% !important;
                    max-width: 360px !important;
                    margin: 0 auto !important;
                }
                .lux-hstat {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 7px !important;
                }
                .lux-hstat span {
                    font-family: var(--serif) !important;
                    font-size: 34px !important;
                    font-weight: 600 !important;
                    color: var(--gold-light) !important;
                    line-height: 1 !important;
                }
                .lux-hstat small {
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    letter-spacing: 2.5px !important;
                    text-transform: uppercase !important;
                    color: rgba(245,240,232,0.32) !important;
                }
                .lux-hdiv {
                    width: 1px !important;
                    height: 42px !important;
                    background: rgba(184,150,90,0.22) !important;
                    flex-shrink: 0 !important;
                }
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600;700&display=swap');

                .lux-shop-root {
                    --gold:        #b8965a;
                    --gold-light:  #d4aa70;
                    --ink:         #1a1612;
                    --ink-mid:     #3d3530;
                    --ink-muted:   #7a6f66;
                    --cream:       #faf7f3;
                    --cream-dark:  #f2ede5;
                    --white:       #ffffff;
                    --border:      rgba(184,150,90,0.18);
                    --border-d:    rgba(184,150,90,0.38);
                    --r:           4px;
                    --r-lg:        12px;
                    --serif:       'Cormorant Garamond', Georgia, serif;
                    --sans:        'Jost', sans-serif;
                    background: var(--cream);
                    font-family: var(--sans);
                    color: var(--ink);
                    min-height: 100vh;
                }

                /* ── HERO (CENTERED) ── */
                .lux-hero {
                    position: relative;
                    background: var(--ink);
                    min-height: 420px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    overflow: hidden;
                    padding: 72px 24px;
                }
                .lux-hero-glow {
                    position: absolute;
                    width: 700px; height: 700px;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(130px);
                }
                .lux-glow-l { background: radial-gradient(circle,rgba(184,150,90,0.14) 0%,transparent 70%); top:-300px; left:-250px; }
                .lux-glow-r { background: radial-gradient(circle,rgba(184,150,90,0.09) 0%,transparent 70%); bottom:-300px; right:-250px; }
                .lux-hero-grain {
                    position: absolute; inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
                    pointer-events: none; opacity: 0.45;
                }
                .lux-hero-inner {
                    position: relative; z-index: 2;
                    display: flex; flex-direction: column; align-items: center;
                    max-width: 680px; width: 100%;
                }
                .lux-hero-eyebrow {
                    display: flex; align-items: center; gap: 16px;
                    font-family: var(--sans); font-size: 10px; font-weight: 600;
                    letter-spacing: 4px; color: var(--gold); text-transform: uppercase;
                    margin-bottom: 22px;
                }
                .lux-eline {
                    display: block; width: 44px; height: 1px;
                    background: linear-gradient(90deg, transparent, var(--gold), transparent);
                }
                .lux-hero-title {
                    font-family: var(--serif);
                    font-size: clamp(3rem, 6vw, 5.2rem);
                    font-weight: 600; color: #f5f0e8;
                    line-height: 1.08; margin: 0 0 18px;
                    letter-spacing: -0.01em;
                }
                .lux-hero-title em { font-style: italic; color: var(--gold-light); }
                .lux-wish {
                    position: absolute;
                    top: 18px;
                    right: 18px;
                    z-index: 3;
                    background: linear-gradient(135deg, #fffbe6 60%, #f7e7c4 100%);
                    border: 2.5px solid #b8965a;
                    border-radius: 50%;
                    padding: 7px;
                    margin: 0;
                    cursor: pointer;
                    outline: none;
                    box-shadow:
                        0 2px 16px 0 rgba(184,150,90,0.13),
                        0 0 0 2px #fffbe6,
                        0 0 0 0px #e7c46a;
                    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
                    position: absolute;
                    overflow: visible;
                }
                .lux-wish::before {
                    content: "";
                    position: absolute;
                    inset: -10px;
                    border-radius: 50%;
                    z-index: 1;
                    background: radial-gradient(circle, rgba(184,150,90,0.18) 0%, transparent 70%);
                    pointer-events: none;
                    opacity: 0.85;
                    transition: opacity 0.18s;
                }
                .lux-wish:hover::before, .lux-wish.active::before {
                    opacity: 1;
                    background: radial-gradient(circle, rgba(231,196,106,0.22) 0%, transparent 70%);
                }
                .lux-wish:hover, .lux-wish:focus {
                    border-color: #e7c46a;
                    box-shadow:
                        0 4px 24px 0 rgba(184,150,90,0.22),
                        0 0 0 4px #f7e7c4,
                        0 0 0 8px #e7c46a88;
                    transform: scale(1.13);
                    animation: lux-heart-pulse 0.5s;
                }
                .lux-wish:active {
                    transform: scale(0.93);
                    box-shadow:
                        0 2px 16px 0 rgba(184,150,90,0.18),
                        0 0 0 2.5px #e7c46a,
                        0 0 0 10px #e7c46a44;
                    animation: lux-heart-pulse 0.4s;
                }
                @keyframes lux-heart-pulse {
                    0% { box-shadow: 0 0 0 0 #e7c46a44; }
                    70% { box-shadow: 0 0 0 12px #e7c46a22; }
                    100% { box-shadow: 0 0 0 0 #e7c46a00; }
                }
                .lux-wish svg {
                    display: block;
                    filter: drop-shadow(0 2px 8px rgba(184,150,90,0.18));
                    stroke: #b8965a;
                    stroke-width: 2.3;
                    fill: none;
                    transition: fill 0.18s, stroke 0.18s, filter 0.18s;
                    position: relative;
                    z-index: 2;
                }
                .lux-wish.active svg {
                    fill: #e74c3c;
                    stroke: #b8965a;
                    filter: drop-shadow(0 0 16px #e74c3c99) drop-shadow(0 0 8px #e7c46a88);
                }
                .lux-wish:not(.active):hover svg {
                    stroke: #e7c46a;
                    filter: drop-shadow(0 0 12px #b8965a88);
                }
                .lux-mbar {
                    display: none; align-items: center; gap: 10px;
                    padding: 12px 16px; background: var(--white);
                    border-bottom: 1px solid var(--border);
                    position: sticky; top: 0; z-index: 200;
                    box-shadow: 0 2px 14px rgba(26,22,18,0.05);
                }
                .lux-ftoggle {
                    display: flex; align-items: center; gap: 7px;
                    background: var(--ink); color: var(--gold-light);
                    border: none; border-radius: var(--r);
                    padding: 9px 16px; font-family: var(--sans);
                    font-size: 11px; font-weight: 600; letter-spacing: 1.2px;
                    text-transform: uppercase; cursor: pointer; white-space: nowrap;
                    transition: background 0.2s;
                }
                .lux-ftoggle:hover { background: var(--ink-mid); }
                .lux-mcount { font-size: 11px; color: var(--ink-muted); font-family: var(--sans); flex: 1; text-align: center; }
                .lux-msort {
                    background: transparent; border: 1px solid var(--border-d);
                    border-radius: var(--r); padding: 8px 10px;
                    font-family: var(--sans); font-size: 11px; color: var(--ink);
                    cursor: pointer; outline: none;
                }

                /* ── LAYOUT ── */
                .lux-layout {
                    display: flex; align-items: flex-start;
                    max-width: 1540px; margin: 0 auto;
                    padding: 48px 40px; gap: 36px;
                }
                .lux-backdrop {
                    display: none; position: fixed; inset: 0;
                    background: rgba(26,22,18,0.52);
                    z-index: 399; backdrop-filter: blur(3px);
                }

                /* ── SIDEBAR ── */
                .lux-sidebar {
                    width: 295px; flex-shrink: 0;
                    position: sticky; top: 90px;
                    max-height: calc(100vh - 110px);
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: var(--border-d) transparent;
                }
                .lux-sb-inner {
                    background: var(--white);
                    border: 1px solid var(--border);
                    border-radius: var(--r-lg);
                    padding: 32px 28px;
                    box-shadow: 0 8px 40px rgba(26,22,18,0.07), 0 2px 8px rgba(26,22,18,0.04);
                }
                .lux-sb-head {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    margin-bottom: 30px; padding-bottom: 22px; border-bottom: 1px solid var(--border);
                }
                .lux-sb-eyebrow {
                    font-family: var(--sans); font-size: 9px; font-weight: 700;
                    letter-spacing: 2.5px; color: var(--gold); text-transform: uppercase;
                    margin: 0 0 6px;
                }
                .lux-sb-title {
                    font-family: var(--serif); font-size: 30px; font-weight: 600;
                    color: var(--ink); line-height: 1; margin: 0;
                }
                .lux-sb-close {
                    display: none; background: var(--cream); border: 1px solid var(--border);
                    border-radius: 50%; width: 34px; height: 34px;
                    align-items: center; justify-content: center;
                    color: var(--ink-muted); cursor: pointer; flex-shrink: 0;
                    margin-top: 4px; transition: background 0.2s, color 0.2s;
                }
                .lux-sb-close:hover { background: var(--ink); color: var(--gold-light); }

                .lux-fg {
                    margin-bottom: 26px; padding-bottom: 26px;
                    border-bottom: 1px solid rgba(184,150,90,0.1);
                }
                .lux-fg-last { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                .lux-fl {
                    display: flex; align-items: center; gap: 7px;
                    font-family: var(--sans); font-size: 9px; font-weight: 700;
                    letter-spacing: 2.5px; text-transform: uppercase;
                    color: var(--gold); margin-bottom: 13px;
                    cursor: default; user-select: none;
                }
                .lux-fl-icon { font-size: 11px; opacity: 0.7; }
                .lux-fl-admin { color: #8b6914; }
                .lux-admin-fg { background: rgba(184,150,90,0.04); border-radius: var(--r); padding: 12px; margin-left: -12px; margin-right: -12px; }
                .lux-atag {
                    margin-left: auto; background: rgba(139,105,20,0.12);
                    border: 1px solid rgba(139,105,20,0.3); color: #8b6914;
                    font-size: 8px; font-weight: 700; letter-spacing: 1px;
                    padding: 2px 8px; border-radius: 999px;
                }

                .lux-sw { position: relative; }
                .lux-si {
                    position: absolute; left: 13px; top: 50%;
                    transform: translateY(-50%); color: var(--ink-muted); pointer-events: none;
                }
                .lux-sinp {
                    width: 100%; padding: 12px 13px 12px 40px;
                    border: 1px solid var(--border-d); border-radius: var(--r);
                    font-family: var(--sans); font-size: 13px; color: var(--ink);
                    background: var(--cream); outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .lux-sinp:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(184,150,90,0.1); background: var(--white); }

                .lux-sel {
                    width: 100%; padding: 12px 13px;
                    border: 1px solid var(--border-d); border-radius: var(--r);
                    font-family: var(--sans); font-size: 13px; color: var(--ink);
                    background: var(--cream); outline: none; cursor: pointer;
                    transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
                }
                .lux-sel:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(184,150,90,0.1); }

                .lux-sgrid { display: flex; flex-wrap: wrap; gap: 7px; }
                .lux-sp {
                    padding: 6px 14px; border: 1px solid var(--border-d);
                    border-radius: 999px; font-family: var(--sans);
                    font-size: 11px; font-weight: 600; color: var(--ink-mid);
                    background: transparent; cursor: pointer;
                    transition: all 0.2s; letter-spacing: 0.4px;
                }
                .lux-sp:hover { border-color: var(--gold); color: var(--gold); }
                .lux-sp.active { background: var(--ink); color: var(--gold-light); border-color: var(--ink); }

                .lux-prow { display: flex; align-items: center; gap: 10px; }
                .lux-pinp {
                    flex: 1; padding: 11px 11px; border: 1px solid var(--border-d);
                    border-radius: var(--r); font-family: var(--sans); font-size: 12px;
                    color: var(--ink); background: var(--cream); outline: none;
                    min-width: 0; transition: border-color 0.2s; box-sizing: border-box;
                }
                .lux-pinp:focus { border-color: var(--gold); }
                .lux-psep { color: var(--ink-muted); font-size: 13px; flex-shrink: 0; }

                /* ── MAIN ── */
                .lux-main { flex: 1; min-width: 0; }
                .lux-toolbar {
                    display: flex; align-items: center; justify-content: space-between;
                    background: var(--white); border: 1px solid var(--border);
                    border-radius: var(--r-lg); padding: 15px 24px; margin-bottom: 28px;
                    box-shadow: 0 2px 14px rgba(26,22,18,0.04);
                }
                .lux-tc { font-family: var(--sans); font-size: 12px; color: var(--ink-muted); letter-spacing: 0.3px; }
                .lux-tc strong { color: var(--ink); font-weight: 700; }
                .lux-tr { display: flex; align-items: center; gap: 12px; }
                .lux-tl { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
                .lux-dsort {
                    background: transparent; border: 1px solid var(--border-d);
                    border-radius: var(--r); padding: 8px 13px;
                    font-family: var(--sans); font-size: 12px; color: var(--ink);
                    cursor: pointer; outline: none; transition: border-color 0.2s;
                }
                .lux-dsort:focus { border-color: var(--gold); }

                /* ── GRID ── */
                .lux-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 22px;
                }

                /* ── CARD ── */
                .lux-card {
                    background: var(--white); border: 1px solid var(--border);
                    border-radius: var(--r-lg); overflow: hidden; position: relative;
                    display: flex; flex-direction: column;
                    transition: border-color 0.35s, box-shadow 0.35s, transform 0.35s cubic-bezier(0.16,1,0.3,1);
                    box-shadow: 0 2px 14px rgba(26,22,18,0.04);
                }
                .lux-card:hover {
                    border-color: rgba(184,150,90,0.55);
                    box-shadow: 0 16px 48px rgba(184,150,90,0.13), 0 4px 16px rgba(26,22,18,0.06);
                    transform: translateY(-7px);
                }
                .lux-pcard-badges { position:absolute; top:14px; left:14px; display:flex; flex-direction:column; gap:8px; z-index:10; }
                .lux-badge {
                    padding: 6px 10px; border-radius: 4px;
                    font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
                    text-transform: uppercase; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    display: inline-flex; align-items: center; gap: 4px;
                    backdrop-filter: blur(4px);
                    font-family: var(--sans);
                }
                .lux-badge-sale {
                    background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
                    color: #D4AF37;
                    border: 1px solid rgba(212,175,55,0.4);
                    animation: luxSalePulse 2s infinite;
                }
                @keyframes luxSalePulse {
                    0% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 0 rgba(212,175,55,0.4); }
                    70% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 8px rgba(212,175,55,0); }
                    100% { box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 0 0 rgba(212,175,55,0); }
                }
                .lux-badge-new {
                    background: linear-gradient(135deg, #D4AF37 0%, #9A7A20 100%);
                    color: #fff;
                    border: 1px solid #E8C97A;
                }
                .lux-badge-discount {
                    background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
                    color: #E8C97A;
                    border: 1px solid rgba(212,175,55,0.3);
                }
                .lux-wish {
                    position: absolute; top: 12px; right: 12px; z-index: 12;
                    width: 36px; height: 36px; border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.55);
                    background: rgba(255,255,255,0.72); backdrop-filter: blur(10px);
                    color: var(--ink-muted); display: flex; align-items: center;
                    justify-content: center; cursor: pointer; transition: all 0.25s;
                }
                .lux-wish svg { width: 15px; height: 15px; }
                .lux-wish:hover { color: #c0392b; background: rgba(255,255,255,0.95); transform: scale(1.1); }
                .lux-wish.active { color: #c0392b; background: rgba(255,255,255,0.96); border-color: rgba(192,57,43,0.3); box-shadow: 0 4px 14px rgba(192,57,43,0.18); }
                .lux-wish.active svg path { fill: currentColor; stroke: currentColor; }

                /* Image + hover: blur + centered pill */
                .lux-img-wrap {
                    display: block; overflow: hidden; position: relative;
                    aspect-ratio: 4/5; background: var(--cream-dark); cursor: pointer;
                }
                .lux-img {
                    width: 100%; height: 100%; object-fit: cover; display: block;
                    transition: transform 0.55s cubic-bezier(0.16,1,0.3,1), filter 0.42s ease;
                    will-change: transform, filter;
                }
                .lux-card:hover .lux-img {
                    transform: scale(1.08);
                    filter: blur(4px) brightness(0.7);
                }
                .lux-overlay {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(26,22,18,0.15);
                    opacity: 0; transition: opacity 0.35s ease; z-index: 5;
                }
                .lux-card:hover .lux-overlay { opacity: 1; }
                .lux-vpill {
                    display: inline-flex; align-items: center; gap: 9px;
                    font-family: var(--sans); font-size: 11px; font-weight: 600;
                    letter-spacing: 2px; text-transform: uppercase; color: #f5f0e8;
                    background: rgba(26,22,18,0.7); backdrop-filter: blur(16px);
                    border: 1px solid rgba(212,170,112,0.5); border-radius: var(--r);
                    padding: 13px 24px; cursor: pointer; white-space: nowrap;
                    box-shadow: 0 8px 28px rgba(26,22,18,0.32);
                }
                .lux-vpill:hover { border-color: var(--gold-light); color: var(--gold-light); }

                /* Card body */
                .lux-cbody { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
                .lux-cmeta { display: flex; align-items: center; justify-content: space-between; }
                .lux-cbrand { font-family: var(--sans); font-size: 8px; font-weight: 700; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; }
                .lux-crating { display: flex; align-items: center; gap: 3px; }
                .lux-stars { font-size: 10px; color: var(--gold); letter-spacing: -1px; }
                .lux-rnum { font-size: 10px; color: var(--ink-muted); }
                .lux-cname { font-family: var(--serif); font-size: 15px; font-weight: 600; line-height: 1.3; margin: 0; color: var(--ink); }
                .lux-cnlink { color: inherit; text-decoration: none; }
                .lux-cnlink:hover { color: var(--gold); }
                .lux-ccat { font-size: 10px; color: var(--ink-muted); font-weight: 500; letter-spacing: 0.3px; margin: 0; }

                .lux-colors { display: flex; align-items: center; gap: 9px; }
                .lux-clabel { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-mid); white-space: nowrap; }
                .lux-cdots { display: flex; flex-wrap: wrap; gap: 5px; }
                .lux-cdot {
                    width: 14px; height: 14px; border-radius: 50%; border: 2px solid #e9ecef;
                    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                .lux-cdot:hover { transform: scale(1.2); border-color: var(--gold); }
                .lux-cdot.active { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(184,150,90,0.3); }

                /* Size — revealed on hover */
                .lux-sizes {
                    display: flex; flex-direction: column; gap: 8px;
                    overflow: hidden; max-height: 0; opacity: 0; pointer-events: none;
                    transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
                    border: 1px solid var(--border); border-radius: var(--r);
                    padding: 0 12px; background: var(--cream);
                }
                .lux-card:hover .lux-sizes,
                .lux-card:focus-within .lux-sizes {
                    max-height: 130px; opacity: 1; pointer-events: auto; padding: 11px 12px;
                }
                .lux-shd { display: flex; align-items: center; justify-content: space-between; }
                .lux-slbl { font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ink); }
                .lux-schosen { font-size: 8px; font-weight: 700; color: var(--gold); border: 1px solid var(--border-d); border-radius: 999px; padding: 2px 9px; letter-spacing: 0.5px; }
                .lux-sbtns { display: grid; grid-template-columns: repeat(5,1fr); gap: 5px; }
                .lux-sbtn {
                    height: 28px; border: 1px solid var(--border-d); border-radius: 2px;
                    background: var(--white); font-family: var(--sans); font-size: 9px;
                    font-weight: 700; color: var(--ink-mid); cursor: pointer; transition: all 0.2s;
                }
                .lux-sbtn:hover { border-color: var(--gold); color: var(--gold); }
                .lux-sbtn.active { background: var(--ink); color: var(--gold-light); border-color: var(--ink); }

                /* Price */
                .lux-prow-c { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
                .lux-price { font-family: var(--serif); font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; }
                .lux-orig { font-size: 13px; color: var(--ink-muted); font-weight: 400; text-decoration-color: var(--border-d); }
                .lux-save {
                    font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: #7c4700;
                    background: rgba(184,150,90,0.12); border: 1px solid rgba(184,150,90,0.25);
                    border-radius: 2px; padding: 3px 7px; white-space: nowrap;
                }

                /* Add to Bag */
                .lux-addbtn {
                    display: flex; align-items: center; justify-content: space-between;
                    width: 100%; padding: 11px 16px; background: var(--ink);
                    color: var(--gold-light); border: 1px solid var(--ink);
                    border-radius: var(--r); font-family: var(--sans); font-size: 11px;
                    font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
                    margin-top: 4px; position: relative; overflow: hidden; box-sizing: border-box;
                }
                .lux-addbtn::before {
                    content:''; position: absolute; top:0; left:-100%; width:100%; height:100%;
                    background: linear-gradient(90deg,transparent,rgba(184,150,90,0.18),transparent);
                    transition: left 0.5s;
                }
                .lux-addbtn:hover { background:#2a2218; color:var(--gold); border-color:var(--gold); box-shadow:0 4px 16px rgba(26,22,18,0.2); }
                .lux-addbtn:hover::before { left:100%; }
                .lux-addbtn.disabled { opacity:0.42; cursor:not-allowed; }
                .lux-addbtn.disabled:hover { background:var(--ink); color:var(--gold-light); border-color:var(--ink); box-shadow:none; }
                .lux-addico { font-size:18px; font-weight:300; transition:transform 0.3s; line-height:1; }
                .lux-addbtn:hover .lux-addico { transform:rotate(90deg); }

                .lux-cbadge {
                    background: linear-gradient(135deg,#eef7ea 0%,#e4f0df 100%);
                    border: 1px solid rgba(90,160,70,0.22); border-radius: var(--r);
                    font-size:10px; font-weight:700; color:#2d6a1a;
                    text-align:center; padding:6px 10px; letter-spacing:0.5px;
                }

                /* Empty */
                .lux-empty { text-align:center; padding:90px 20px; }
                .lux-eico { font-family:var(--serif); font-size:60px; color:var(--border-d); line-height:1; margin-bottom:20px; }
                .lux-empty h4 { font-family:var(--serif); font-size:26px; font-weight:600; color:var(--ink); margin-bottom:10px; }
                .lux-empty p { font-size:13px; color:var(--ink-muted); margin-bottom:30px; }
                .lux-ebtn {
                    background:var(--ink); color:var(--gold-light); border:1px solid var(--ink);
                    border-radius:var(--r); padding:13px 34px; font-family:var(--sans);
                    font-size:11px; font-weight:600; letter-spacing:2px; text-transform:uppercase;
                    cursor:pointer; transition:all 0.25s;
                }
                .lux-ebtn:hover { background:transparent; color:var(--ink); border-color:var(--gold); }

                /* Skeleton Loading */
                .lux-skeleton-card { border-color: rgba(0,0,0,0.04); box-shadow: none; pointer-events: none; }
                .lux-shimmer {
                    background: linear-gradient(90deg, #f0ede8 25%, #e8e5e0 50%, #f0ede8 75%);
                    background-size: 200% 100%;
                    animation: luxShimmer 1.5s infinite linear;
                }
                @keyframes luxShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Accessibility */
                @media (prefers-reduced-motion: reduce) {
                    .lux-card,.lux-img,.lux-overlay,.lux-addbtn,.lux-sbtn,.lux-cdot,.lux-sidebar
                    { transition:none!important; animation:none!important; }
                }

                /* Touch */
                @media (hover:none) and (pointer:coarse) {
                    .lux-card:hover { transform:none; box-shadow:0 2px 14px rgba(26,22,18,0.04); border-color:var(--border); }
                    .lux-card:hover .lux-img { transform:none; filter:none; }
                    .lux-overlay { display:none; }
                    .lux-sizes { max-height:none; opacity:1; pointer-events:auto; padding:11px 12px; }
                }

                /* ── RESPONSIVE ── */
                @media (max-width: 1280px) {
                    .lux-layout { padding:40px 28px; gap:28px; }
                    .lux-sidebar { width:268px; }
                    .lux-grid { grid-template-columns:repeat(auto-fill,minmax(195px,1fr)); gap:18px; }
                }
                @media (max-width: 991px) {
                    .lux-hero { min-height:360px; padding:60px 24px; }
                    .lux-mbar { display:flex; }
                    .lux-layout { padding:24px 16px; gap:0; }
                    .lux-toolbar { display:none; }
                    .lux-grid { grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; }
                    .lux-backdrop { display:block; }
                    .lux-sidebar {
                        position:fixed; top:0; left:0;
                        width:310px; height:100vh; max-height:none;
                        z-index:400; border-radius:0;
                        transform:translateX(-115%);
                        transition:transform 0.38s cubic-bezier(0.16,1,0.3,1);
                    }
                    .lux-sidebar.open { transform:translateX(0); }
                    .lux-sb-inner { border-radius:0; min-height:100vh; }
                    .lux-sb-close { display:flex; }
                }
                @media (max-width: 640px) {
                    .lux-hero { min-height:300px; padding:50px 20px; }
                    .lux-hero-title { font-size:2.4rem; }
                    .lux-hero-stats { max-width:100%; }
                    .lux-hero-watermark { display:none; }
                    .lux-layout { padding:16px 12px; }
                    .lux-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
                    .lux-cbody { padding:12px; gap:6px; }
                    .lux-cname { font-size:13px; }
                    .lux-price { font-size:19px; }
                    .lux-addbtn { font-size:10px; padding:9px 12px; letter-spacing:1px; }
                }
                @media (max-width: 420px) {
                    .lux-hero-title { font-size:2rem; }
                    .lux-hstat span { font-size:26px; }
                    .lux-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
                    .lux-cbody { padding:10px; gap:5px; }
                    .lux-cname { font-size:12px; }
                    .lux-addbtn { font-size:9px; padding:8px 10px; }
                    .lux-sbtn { height:25px; font-size:8px; }
                    .lux-price { font-size:17px; }
                }

                /* Custom: 500px and below - show 1 product per row, full width */
                @media (max-width: 500px) {
                    .lux-grid {
                        grid-template-columns: 1fr !important;
                        gap: 14px !important;
                    }
                    .lux-card {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 100% !important;
                    }
                }
            `}} />
        </div>
    )
}