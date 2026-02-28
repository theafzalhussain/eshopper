import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators';
import { getSubcategory } from '../Store/ActionCreaters/SubcategoryActionCreators';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

export default function Shop() {
    var { maincat } = useParams()
    var dispatch = useDispatch()
    var navigate = useNavigate()

    // --- STATES ---
    var [mc, setmc] = useState(maincat)
    var [sc, setsc] = useState("All")
    var [br, setbr] = useState("All")
    var [size, setSize] = useState("All")
    var [min, setmin] = useState(1)
    var [max, setmax] = useState(10000)
    var [search, setSearch] = useState("")
    var [sortBy, setSortBy] = useState("newest")
    var [selectedSizes, setSelectedSizes] = useState({}) // Track selected sizes per product
    var [cartNotifications, setCartNotifications] = useState({}) // Track cart add counts
    var [showNotification, setShowNotification] = useState(null) // Current notification to show
    var [selectedColors, setSelectedColors] = useState({}) // Track selected colors per product
    
    // Available sizes for products
    const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '2XL']

    const colorMap = {
        black: '#111111',
        white: '#ffffff',
        red: '#e74c3c',
        blue: '#3498db',
        green: '#27ae60',
        yellow: '#f1c40f',
        orange: '#f39c12',
        purple: '#9b59b6',
        pink: '#e84393',
        gray: '#95a5a6',
        grey: '#95a5a6',
        brown: '#8e6e53',
        beige: '#f5f5dc',
        navy: '#1b2a4e',
        maroon: '#7b1e1e'
    }

    const DEFAULT_COLORS = ['black', 'white', 'red', 'blue', 'green']

    function normalizeColors(value) {
        const list = value
            ? value
            .split(/[,/|]/)
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
            .slice(0, 6)
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

    // --- LOAD DATA ---
    useEffect(() => {
        dispatch(getProduct())
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
        dispatch(getCart())
    }, [dispatch])

    useEffect(() => { setmc(maincat) }, [maincat])
    
    // --- SMART ADD TO CART FUNCTION (NO REDIRECT) ---
    function addToCart(p, sizeFromParam = null, colorFromParam = null) {
        if (!localStorage.getItem("login")) {
            navigate("/login")
            return
        }
        
        // Check if size is selected
        const selectedSize = sizeFromParam || selectedSizes[p.id]
        if (!selectedSize) {
            setShowNotification({
                type: 'warning',
                message: '⚠️ Please select a size first',
                productId: p.id,
                count: 0
            })
            setTimeout(() => setShowNotification(null), 2000)
            return
        }

        // Check if color is selected (if product has color options)
        const selectedColor = colorFromParam || selectedColors[p.id]
        if (normalizeColors(p.color).length > 0 && !selectedColor) {
            setShowNotification({
                type: 'warning',
                message: '⚠️ Please select a color first',
                productId: p.id,
                count: 0
            })
            setTimeout(() => setShowNotification(null), 2000)
            return
        }
        
        // Check if product already exists in cart with this size AND color
        let existingItem = cart.find((item) => 
            item.productid === p.id && 
            item.userid === localStorage.getItem("userid") &&
            item.size === selectedSize &&
            item.color === selectedColor
        )
        
        if (existingItem) {
            // Item already in cart - just show notification
            const currentCount = (cartNotifications[p.id] || 0) + 1
            setCartNotifications({...cartNotifications, [p.id]: currentCount})
            
            setShowNotification({
                type: 'info',
                message: `✓ Already added! Total: ${currentCount} time(s)`,
                productId: p.id,
                count: currentCount
            })
        } else {
            // Add new item to cart
            let item = {
                productid: p.id,
                userid: localStorage.getItem("userid"),
                name: p.name,
                color: selectedColor || p.color,
                size: selectedSize,
                price: Number(p.finalprice),
                qty: 1,
                total: Number(p.finalprice),
                pic: p.pic1,
            }
            dispatch(addCart(item))
            
            const currentCount = (cartNotifications[p.id] || 0) + 1
            setCartNotifications({...cartNotifications, [p.id]: currentCount})
            
            setShowNotification({
                type: 'success',
                message: `✓ Added to bag! (${currentCount} item)`,
                productId: p.id,
                count: currentCount
            })
        }
        
        // Clear notification after 3 seconds
        setTimeout(() => setShowNotification(null), 3000)
    }

    // --- SMART FILTERING LOGIC (For Fast Loading) ---
    const filteredProducts = useMemo(() => {
        let temp = [...product];

        if (mc !== 'All') temp = temp.filter(x => x.maincategory === mc);
        if (sc !== 'All') temp = temp.filter(x => x.subcategory === sc);
        if (br !== 'All') temp = temp.filter(x => x.brand === br);
        if (size !== 'All') temp = temp.filter(x => x.size === size);
        
        // Price Filter
        temp = temp.filter(x => x.finalprice >= min && x.finalprice <= max);

        // Search Filter
        if (search) {
            temp = temp.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
        }

        // Sorting
        if (sortBy === "low") temp.sort((a, b) => a.finalprice - b.finalprice);
        else if (sortBy === "high") temp.sort((a, b) => b.finalprice - a.finalprice);
        else temp.reverse(); // newest

        return temp;
    }, [product, mc, sc, br, size, min, max, search, sortBy]);

    return (
        <div style={{ backgroundColor: "#fcfcfc" }}>
            {/* Toast Notification */}
            {showNotification && (
                <motion.div 
                    className={`toast-notification toast-${showNotification.type}`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="toast-message">{showNotification.message}</span>
                </motion.div>
            )}
            
            {/* --- TOP PREMIUM BANNER --- */}
            <div className="hero-wrap py-5" style={{ background: 'linear-gradient(45deg, #17a2b8, #0056b3)', position: 'relative' }}>
                <div className="container text-center py-4">
                    <motion.h1 initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} className="text-white font-weight-bold display-4">Shop Premium</motion.h1>
                    <p className="text-white-50">Discover curated collections tailored for your style</p>
                </div>
            </div>

            <section className="container-fluid px-lg-5 py-5">
                <div className="row">
                    {/* --- SIDEBAR FILTERS --- */}
                    <div className="col-lg-3">
                        <div className="sticky-top" style={{ top: '100px' }}>
                            <div className="bg-white shadow-sm p-4 rounded-xl mb-4 border-0">
                                <h5 className="font-weight-bold mb-4">Search & Filter</h5>
                                
                                {/* Search Bar */}
                                <div className="input-group mb-4 shadow-sm rounded-pill overflow-hidden border">
                                    <div className="input-group-prepend">
                                        <span className="input-group-text bg-white border-0"><i className="icon-search"></i></span>
                                    </div>
                                    <input type="text" className="form-control border-0" placeholder="Search products..." onChange={(e) => setSearch(e.target.value)} />
                                </div>

                                {/* Main Category */}
                                <div className="mb-4">
                                    <p className="small font-weight-bold text-uppercase text-info mb-2">Category</p>
                                    <select className="form-control custom-select-sm" value={mc} onChange={(e) => setmc(e.target.value)}>
                                        <option value="All">All Categories</option>
                                        {maincategory.map((item, i) => <option key={i} value={item.name}>{item.name}</option>)}
                                    </select>
                                </div>

                                {/* Size Selection (New Feature) */}
                                <div className="mb-4">
                                    <p className="small font-weight-bold text-uppercase text-info mb-2">Select Size</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {["All", "S", "M", "L", "XL", "XXL", "38", "40", "42"].map((s, i) => (
                                            <button key={i} onClick={() => setSize(s)} className={`btn btn-sm m-1 rounded-pill ${size === s ? 'btn-info shadow' : 'btn-outline-light text-dark'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Brands */}
                                <div className="mb-4">
                                    <p className="small font-weight-bold text-uppercase text-info mb-2">Brands</p>
                                    <select className="form-control" onChange={(e) => setbr(e.target.value)}>
                                        <option value="All">All Brands</option>
                                        {brand.map((item, i) => <option key={i} value={item.name}>{item.name}</option>)}
                                    </select>
                                </div>

                                {/* Price Range */}
                                <div className="mb-2">
                                    <p className="small font-weight-bold text-uppercase text-info mb-2">Price Range (₹)</p>
                                    <div className="d-flex align-items-center">
                                        <input type="number" className="form-control form-control-sm" placeholder="Min" onChange={(e) => setmin(e.target.value)} />
                                        <span className="mx-2">-</span>
                                        <input type="number" className="form-control form-control-sm" placeholder="Max" onChange={(e) => setmax(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN SHOP AREA --- */}
                    <div className="col-lg-9">
                        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded-lg">
                            <span className="text-muted small">Showing <strong>{filteredProducts.length}</strong> Products</span>
                            <div className="d-flex align-items-center">
                                <span className="small mr-2 d-none d-md-block">Sort by:</span>
                                <select className="form-control form-control-sm border-0 bg-light" onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="newest">Newest First</option>
                                    <option value="low">Price: Low to High</option>
                                    <option value="high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>

                        <div className="row">
                            <AnimatePresence>
                                {filteredProducts.map((item, index) => (
                                    <motion.div 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3 }}
                                        className="col-sm-6 col-md-4 col-lg-3 mb-4"
                                    >
                                        <div className="product-card-premium h-100 bg-white shadow-sm overflow-hidden position-relative rounded-lg">
                                            {/* Discount Badge */}
                                            {item.discount > 0 && (
                                                <div className="premium-badge">{item.discount}% OFF</div>
                                            )}

                                            <Link to={`/single-product/${item.id}`} className="img-wrap">
                                                <motion.img 
                                                    src={optimizeCloudinaryUrlAdvanced(item.pic1, { maxWidth: 500, crop: 'fill' })} 
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-100" 
                                                    style={{ height: "220px", objectFit: "cover" }} 
                                                    alt={item.name}
                                                    whileHover={{ scale: 1.1 }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                                <motion.div 
                                                    className="card-overlay"
                                                    whileHover={{ opacity: 1 }}
                                                    initial={{ opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <motion.span 
                                                        className="btn btn-white btn-sm px-4 rounded-pill"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        View Detail
                                                    </motion.span>
                                                </motion.div>
                                            </Link>

                                            <div className="p-3 p-md-3">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="product-brand-shop">{item.brand}</span>
                                                    <div className="rating-shop">
                                                        ★★★★★
                                                    </div>
                                                </div>
                                                <h3 className="product-name-shop mb-2">
                                                    <Link to={`/single-product/${item.id}`} className="product-name-link">{item.name}</Link>
                                                </h3>
                                                
                                                {/* Category */}
                                                <p className="product-category-shop mb-2">
                                                    {item.maincategory} • {item.subcategory}
                                                </p>
                                                
                                                {/* Premium Features Badges */}
                                                <div className="premium-features-badges mb-2">
                                                    {item.discount > 0 && <span className="feature-chip">Save {item.discount}%</span>}
                                                    {item.stock === "In Stock" && <span className="feature-chip stock">In Stock</span>}
                                                </div>

                                                {normalizeColors(item.color).length > 0 && (
                                                    <div className="color-options-shop mb-2">
                                                        <span className="color-label">Color</span>
                                                        <div className="color-dots">
                                                            {normalizeColors(item.color).map((c) => (
                                                                <button
                                                                    key={`${item.id}-${c}`}
                                                                    type="button"
                                                                    className={`color-dot ${selectedColors[item.id] === c ? 'active' : ''}`}
                                                                    style={{ backgroundColor: resolveColor(c) }}
                                                                    onClick={() => setSelectedColors({ ...selectedColors, [item.id]: c })}
                                                                    title={c}
                                                                    aria-label={`Select color ${c}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                
                                                {/* Size Selection - Smaller */}
                                                <div className="product-size-selector-shop mb-2">
                                                    <label className="size-label-shop">Size</label>
                                                    <div className="size-options-shop">
                                                        {AVAILABLE_SIZES.map((s) => (
                                                            <motion.button
                                                                key={s}
                                                                onClick={() => setSelectedSizes({...selectedSizes, [item.id]: s})}
                                                                className={`size-btn-shop ${selectedSizes[item.id] === s ? 'active' : ''}`}
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                {s}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Price and Cart */}
                                                <div className="d-flex align-items-end justify-content-between mb-2">
                                                    <div>
                                                        <span className="h5 font-weight-bold text-dark mb-0" style={{ fontSize: '18px' }}>₹{item.finalprice}</span>
                                                        {item.baseprice > item.finalprice && (
                                                            <del className="text-muted small ml-2">₹{item.baseprice}</del>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Add to Bag Button - Premium */}
                                                <motion.button 
                                                    onClick={() => addToCart(item, selectedSizes[item.id], selectedColors[item.id])} 
                                                    className={`btn-add-bag w-100 ${(!selectedSizes[item.id] || (normalizeColors(item.color).length > 0 && !selectedColors[item.id])) ? 'size-not-selected' : ''}`}
                                                    whileHover={(selectedSizes[item.id] && (normalizeColors(item.color).length === 0 || selectedColors[item.id])) ? { scale: 1.02 } : {}}
                                                    whileTap={(selectedSizes[item.id] && (normalizeColors(item.color).length === 0 || selectedColors[item.id])) ? { scale: 0.98 } : {}}
                                                >
                                                    <span>Add to Bag</span>
                                                    <span className="bag-icon">+</span>
                                                </motion.button>
                                                
                                                {/* Cart Count Indicator */}
                                                {cartNotifications[item.id] && (
                                                    <motion.div 
                                                        className="cart-count-badge-shop mt-2"
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                    >
                                                        <span>✓ Added {cartNotifications[item.id]}x</span>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* If No Products */}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-5">
                                <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" width="120" className="opacity-50 mb-3" />
                                <h4 className="text-muted">Oops! No products match your filters.</h4>
                                <button className="btn btn-info mt-3 rounded-pill" onClick={() => window.location.reload()}>Clear All Filters</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-lg { border-radius: 16px !important; }
                .rounded-xl { border-radius: 20px !important; }
                
                .product-card-premium {
                    border-radius: 16px;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 2px solid #f0f0f0;
                    overflow: hidden;
                    position: relative;
                    box-shadow: none;
                }
                .product-card-premium::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(23,162,184,0.02) 0%, rgba(0,0,0,0) 100%);
                    pointer-events: none;
                    z-index: 1;
                    border-radius: 16px;
                }
                .product-card-premium:hover {
                    transform: translateY(-12px);
                    box-shadow: 0 8px 18px rgba(23, 162, 184, 0.12) !important;
                    border-color: #17a2b8;
                    outline: 2px solid rgba(23, 162, 184, 0.35);
                    outline-offset: -2px;
                }
                .img-wrap { position: relative; display: block; overflow: hidden; border-radius: 16px 16px 0 0; }
                .img-wrap::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%);
                    opacity: 0;
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    pointer-events: none;
                }
                .img-wrap img { transition: 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
                .product-card-premium:hover .img-wrap img { 
                    transform: scale(1.15);
                    filter: brightness(1.05);
                }
                .product-card-premium:hover .img-wrap::after { opacity: 1; }
                
                .card-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.15); display: flex; align-items: center;
                    justify-content: center; opacity: 0; transition: 0.3s;
                }
                
                .premium-badge {
                    position: absolute; top: 12px; left: 12px; z-index: 10;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                    color: white; padding: 6px 14px;
                    border-radius: 8px; font-size: 11px; font-weight: bold;
                    box-shadow: 0 4px 10px rgba(255,71,87,0.3);
                    animation: badgePulse 2s ease-in-out infinite;
                }
                @keyframes badgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                .gap-2 { gap: 10px; }
                .btn-white { background: white; color: black; border: none; font-weight: bold; }

                .product-brand-shop {
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    color: #17a2b8;
                    text-transform: uppercase;
                }
                .rating-shop {
                    font-size: 11px;
                    color: #f5b301;
                    letter-spacing: -1px;
                    font-weight: 700;
                }
                .product-name-shop {
                    font-size: 13px;
                    line-height: 1.35;
                    font-weight: 800;
                    letter-spacing: -0.2px;
                }
                .product-name-link {
                    color: #1b1b1b;
                    text-decoration: none;
                }
                .product-name-link:hover { color: #17a2b8; }
                .product-category-shop {
                    font-size: 10px;
                    color: #6c757d;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                }
                
                /* Premium Features Badges */
                .premium-features-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                .feature-chip {
                    display: inline-block;
                    padding: 3px 8px;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.1) 0%, rgba(23, 162, 184, 0.05) 100%);
                    border: 1px solid rgba(23, 162, 184, 0.3);
                    color: #17a2b8;
                    border-radius: 12px;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    line-height: 1;
                }
                .feature-chip.stock {
                    background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
                    color: #28a745;
                    border-color: rgba(40, 167, 69, 0.3);
                }

                .color-options-shop {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .color-label {
                    font-size: 9px;
                    font-weight: 700;
                    color: #333;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                }
                .color-dots {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .color-dot {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2px solid #e9ecef;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .color-dot:hover {
                    transform: scale(1.1);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                    border-color: #17a2b8;
                }
                .color-dot.active {
                    border-color: #17a2b8;
                    box-shadow: 0 0 0 2px rgba(23,162,184,0.25);
                }

                
                /* Size Selector for Shop - SMALLER */
                .product-size-selector-shop {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .size-label-shop {
                    font-size: 9px;
                    font-weight: 700;
                    color: #333;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                .size-options-shop {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 3px;
                }
                .size-btn-shop {
                    padding: 4px 8px;
                    background: #f8f9fa;
                    border: 2px solid #e9ecef;
                    border-radius: 5px;
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.4px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    color: #333;
                    flex: 1;
                    min-width: 32px;
                    text-align: center;
                    position: relative;
                }
                .size-btn-shop:hover {
                    border-color: #17a2b8;
                    color: #17a2b8;
                    background: rgba(23, 162, 184, 0.08);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(23, 162, 184, 0.15);
                }
                .size-btn-shop.active {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    color: #fff;
                    border-color: #17a2b8;
                    box-shadow: 0 3px 12px rgba(23, 162, 184, 0.35);
                    font-weight: 700;
                }
                
                /* Add to Bag Button - Premium */
                .btn-add-bag {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    width: 100%;
                    padding: 9px 14px;
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 12px;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    min-height: 32px;
                    position: relative;
                    overflow: hidden;
                }
                .btn-add-bag::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }
                .btn-add-bag:hover {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(23, 162, 184, 0.35);
                }
                .btn-add-bag:hover::before {
                    left: 100%;
                }
                .btn-add-bag.size-not-selected {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-add-bag.size-not-selected:hover {
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    transform: none;
                    box-shadow: none;
                }
                .bag-icon {
                    font-size: 16px;
                    font-weight: 300;
                    transition: transform 0.3s;
                }
                .btn-add-bag:hover .bag-icon {
                    transform: rotate(90deg) scale(1.2);
                }
                
                /* Cart Count Badge */
                .cart-count-badge-shop {
                    padding: 6px 10px;
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    border: 1px solid #c3e6cb;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #155724;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.15);
                }
                
                /* Toast Notifications */
                .toast-notification {
                    position: fixed;
                    top: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 14px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    z-index: 9999;
                    max-width: 90%;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    backdrop-filter: blur(10px);
                    letter-spacing: 0.5px;
                }
                .toast-success {
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .toast-warning {
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                    color: #856404;
                    border: 1px solid #ffeaa7;
                }
                .toast-info {
                    background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                .toast-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                /* Responsive */
                @media (max-width: 1200px) {
                    .size-btn-shop { padding: 4px 7px; font-size: 9px; }
                                .btn-add-bag { padding: 8px 10px; font-size: 11px; min-height: 32px; }
                                .product-name-shop { font-size: 12px; }
                                .product-category-shop { font-size: 9px; }
                }
                
                @media (max-width: 991px) {
                    .product-card-premium { border-radius: 14px; }
                    .img-wrap { border-radius: 14px 14px 0 0; }
                    .size-btn-shop { padding: 4px 6px; font-size: 9px; min-width: 30px; }
                                .btn-add-bag { padding: 8px 10px; font-size: 11px; min-height: 32px; }
                    .size-label-shop { font-size: 8px; }
                    .toast-notification { font-size: 13px; padding: 12px 20px; }
                    .product-card-premium:hover { transform: translateY(-8px); }
                                .product-brand-shop { font-size: 8px; }
                                .product-name-shop { font-size: 12px; }
                }
                
                @media (max-width: 768px) {
                    .product-card-premium:hover {
                        transform: translateY(-4px);
                    }
                    .size-options-shop { gap: 2px; }
                    .size-btn-shop { padding: 4px 6px; font-size: 8px; flex: 0 1 calc(50% - 1px); min-width: 28px; }
                    .btn-add-bag { padding: 8px 10px; font-size: 10px; min-height: 32px; }
                    .cart-count-badge-shop { font-size: 9px; padding: 4px 8px; margin-top: 4px; }
                    .toast-notification { font-size: 12px; padding: 10px 18px; top: 20px; }
                    .feature-chip { font-size: 8px; padding: 2px 6px; }
                    .product-name-shop { font-size: 12px; }
                    .product-category-shop { font-size: 10px; }
                }
                
                @media (max-width: 575px) {
                    .product-card-premium { border-radius: 12px; margin-bottom: 12px; border: 1px solid #f0f0f0; }
                    .img-wrap { border-radius: 12px 12px 0 0; }
                    .size-btn-shop { padding: 4px 5px; font-size: 8px; flex: 0 1 calc(33.33% - 2px); }
                    .size-label-shop { font-size: 8px; margin-bottom: 2px; }
                    .btn-add-bag { padding: 8px 10px; font-size: 10px; min-height: 32px; }
                    .premium-badge { padding: 5px 10px; font-size: 9px; top: 10px; left: 10px; }
                    .p-3 { padding: 10px !important; }
                    .p-md-4 { padding: 10px !important; }
                    .feature-chip { font-size: 7px; padding: 2px 5px; }
                    .product-name-shop { font-size: 12px; }
                    .product-category-shop { font-size: 9px; }
                    .color-dot { width: 14px; height: 14px; }
                }
                
                @media (max-width: 375px) {
                    .size-btn-shop { flex: 0 1 calc(50% - 1px); font-size: 8px; }
                                .btn-add-bag { padding: 7px 10px; font-size: 9px; min-height: 30px; }
                    .premium-badge { font-size: 8px; padding: 4px 8px; }
                }
            `}} />
        </div>
    )
}