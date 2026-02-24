import React, { useState, useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators'
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators'
import { addCart, getCart } from '../Store/ActionCreaters/CartActionCreators'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ShoppingCart, ChevronDown, Star, X } from 'lucide-react'

export default function Shop() {
    const { maincat } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // --- Redux State ---
    const allProducts = useSelector(state => state.ProductStateData)
    const categories = useSelector(state => state.MaincategoryStateData)
    const brands = useSelector(state => state.BrandStateData)
    const cart = useSelector(state => state.CartStateData)

    // --- Filter States ---
    const [search, setSearch] = useState("")
    const [selectedCat, setSelectedCat] = useState(maincat || "All")
    const [selectedBrand, setSelectedBrand] = useState("All")
    const [selectedSize, setSelectedSize] = useState("All")
    const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })
    const [sortOrder, setSortOrder] = useState("newest")
    const [localSizes, setLocalSizes] = useState({}) // Har card ke liye alag size

    useEffect(() => {
        dispatch(getProduct()); dispatch(getMaincategory()); dispatch(getBrand()); dispatch(getCart());
    }, [dispatch])

    useEffect(() => {
        if (maincat) setSelectedCat(maincat)
    }, [maincat])

    // --- 🧮 Smart Filtering Logic ---
    const filteredProducts = useMemo(() => {
        let list = [...allProducts]

        if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        if (selectedCat !== "All") list = list.filter(p => p.maincategory === selectedCat)
        if (selectedBrand !== "All") list = list.filter(p => p.brand === selectedBrand)
        if (selectedSize !== "All") list = list.filter(p => p.size.includes(selectedSize))
        
        list = list.filter(p => p.finalprice >= priceRange.min && p.finalprice <= priceRange.max)

        if (sortOrder === "low") list.sort((a, b) => a.finalprice - b.finalprice)
        if (sortOrder === "high") list.sort((a, b) => b.finalprice - a.finalprice)
        if (sortOrder === "newest") list.reverse()

        return list
    }, [allProducts, search, selectedCat, selectedBrand, selectedSize, priceRange, sortOrder])

    // --- Add to Cart Handler ---
    const handleAddToCart = (p) => {
        if (!localStorage.getItem("login")) {
            navigate("/login")
            return
        }
        const sizeToBuy = localSizes[p.id] || p.size.split(',')[0] // Default first size if not selected
        
        const existing = cart.find(item => item.productid === p.id && item.userid === localStorage.getItem("userid"))
        if (existing) {
            navigate("/cart")
        } else {
            dispatch(addCart({
                productid: p.id, userid: localStorage.getItem("userid"),
                name: p.name, color: p.color, size: sizeToBuy,
                price: p.finalprice, qty: 1, total: p.finalprice, pic: p.pic1
            }))
            navigate("/cart")
        }
    }

    return (
        <div className="shop-premium-root">
            <div className="container-fluid px-lg-5 py-5">
                <div className="row">
                    
                    {/* --- SIDEBAR FILTERS --- */}
                    <div className="col-lg-3 pr-lg-5 mb-5">
                        <div className="sticky-filter-panel p-4 bg-white shadow-sm rounded-3xl">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center">
                                <Filter size={20} className="mr-2 text-info" /> Refining Tools
                            </h4>

                            {/* Search */}
                            <div className="search-box-lux mb-4">
                                <Search size={18} className="search-icon" />
                                <input type="text" placeholder="Search trends..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>

                            {/* Categories */}
                            <div className="filter-group mb-4">
                                <label className="filter-label">COLLECTIONS</label>
                                <select className="lux-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                    <option value="All">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Size Filter */}
                            <div className="filter-group mb-4">
                                <label className="filter-label">SELECT SIZE</label>
                                <div className="size-chip-grid">
                                    {["All", "S", "M", "L", "XL", "XXL", "38", "40", "42"].map(s => (
                                        <button key={s} 
                                                className={`size-chip ${selectedSize === s ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(s)}>{s}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Brand Filter */}
                            <div className="filter-group mb-4">
                                <label className="filter-label">DESIGNER LABELS</label>
                                <select className="lux-select" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                                    <option value="All">All Brands</option>
                                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>

                            {/* Price Range */}
                            <div className="filter-group">
                                <label className="filter-label">PRICE RANGE (₹)</label>
                                <div className="d-flex gap-2">
                                    <input type="number" placeholder="Min" className="form-control lux-input" onChange={e => setPriceRange({...priceRange, min: e.target.value})} />
                                    <input type="number" placeholder="Max" className="form-control lux-input" onChange={e => setPriceRange({...priceRange, max: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- PRODUCT GRID --- */}
                    <div className="col-lg-9">
                        <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap">
                            <p className="text-muted mb-0 font-weight-bold">SHOWING <span className="text-dark">{filteredProducts.length}</span> CURATED PIECES</p>
                            <div className="d-flex align-items-center">
                                <span className="small font-weight-bold mr-3 text-muted">SORT BY:</span>
                                <select className="sort-minimal" onChange={e => setSortOrder(e.target.value)}>
                                    <option value="newest">Newest Arrivals</option>
                                    <option value="low">Price: Low to High</option>
                                    <option value="high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>

                        <div className="row">
                            <AnimatePresence>
                                {filteredProducts.map((p, index) => (
                                    <motion.div 
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="col-6 col-md-4 mb-5"
                                    >
                                        <div className="product-card-premium h-100 bg-white">
                                            <div className="img-container-lux rounded-2xl overflow-hidden shadow-sm position-relative">
                                                <Link to={`/single-product/${p.id}`}>
                                                    <img src={p.pic1} className="w-100 h-100 object-fit-cover transition-slow" alt={p.name} />
                                                </Link>
                                                {p.discount > 0 && <div className="lux-badge">-{p.discount}%</div>}
                                                
                                                {/* Hover Quick Actions */}
                                                <div className="card-hover-overlay p-3">
                                                    <div className="size-selector-mini mb-2">
                                                        {p.size.split(',').map(s => (
                                                            <button 
                                                                key={s} 
                                                                className={`mini-size-btn ${localSizes[p.id] === s ? 'active' : ''}`}
                                                                onClick={() => setLocalSizes({...localSizes, [p.id]: s})}
                                                            >{s}</button>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => handleAddToCart(p)} className="btn btn-info btn-block rounded-pill font-weight-bold py-2 shadow-lg">
                                                        <ShoppingCart size={16} className="mr-2" /> ADD TO CART
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="small text-info font-weight-bold uppercase letter-spacing-1">{p.brand}</span>
                                                    <div className="d-flex align-items-center text-warning small"><Star size={12} fill="currentColor" className="mr-1" /> 4.9</div>
                                                </div>
                                                <h3 className="h6 font-weight-bold mb-3">
                                                    <Link to={`/single-product/${p.id}`} className="text-dark no-underline text-capitalize hover-info">{p.name}</Link>
                                                </h3>
                                                <div className="d-flex align-items-baseline">
                                                    <span className="h5 font-weight-bold text-dark mb-0">₹{p.finalprice}</span>
                                                    {p.baseprice > p.finalprice && <del className="ml-2 text-muted x-small">₹{p.baseprice}</del>}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .shop-premium-root { background: #fafafa; min-height: 100vh; font-family: 'Inter', sans-serif; }
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 35px !important; }
                .uppercase { text-transform: uppercase; }
                .letter-spacing-1 { letter-spacing: 1px; }
                .no-underline { text-decoration: none !important; }
                
                /* Sidebar Styling */
                .search-box-lux { position: relative; }
                .search-box-lux input { width: 100%; border: 1px solid #eee; padding: 12px 15px 12px 40px; border-radius: 15px; outline: none; background: #f9f9f9; }
                .search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #aaa; }
                
                .filter-label { font-size: 10px; font-weight: 800; color: #aaa; letter-spacing: 2px; margin-bottom: 15px; display: block; }
                .lux-select { width: 100%; border: 1px solid #eee; padding: 12px; border-radius: 15px; background: #f9f9f9; outline: none; font-size: 14px; font-weight: 600; cursor: pointer; }
                
                .size-chip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                .size-chip { border: 1px solid #eee; background: #f9f9f9; padding: 8px; border-radius: 10px; font-size: 11px; font-weight: bold; transition: 0.3s; }
                .size-chip.active { background: #17a2b8; color: white; border-color: #17a2b8; }
                
                .sort-minimal { border: none; background: transparent; font-weight: 800; outline: none; cursor: pointer; }

                /* Card Styling */
                .img-container-lux { aspect-ratio: 10 / 13; background: #f2f2f2; }
                .transition-slow { transition: 0.6s all cubic-bezier(0.165, 0.84, 0.44, 1); }
                .product-card-premium:hover .transition-slow { transform: scale(1.1); }
                
                .lux-badge { position: absolute; top: 15px; left: 15px; background: #ff4757; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 10px; z-index: 5; }
                
                .card-hover-overlay {
                    position: absolute; bottom: -100px; left: 0; width: 100%;
                    background: linear-gradient(to top, rgba(255,255,255,0.95), transparent);
                    transition: 0.4s ease; display: flex; flex-direction: column; align-items: center;
                }
                .product-card-premium:hover .card-hover-overlay { bottom: 0; }
                
                .size-selector-mini { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; }
                .mini-size-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #ddd; background: white; font-size: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                .mini-size-btn.active { background: #111; color: white; border-color: #111; }
                .mini-size-btn:hover:not(.active) { border-color: #17a2b8; color: #17a2b8; }

                .hover-info:hover { color: #17a2b8 !important; }
            `}} />
        </div>
    )
}