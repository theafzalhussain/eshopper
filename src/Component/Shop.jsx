import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators';
import { getSubcategory } from '../Store/ActionCreaters/SubcategoryActionCreators';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { motion, AnimatePresence } from 'framer-motion';

export default function Shop() {
    var { maincat } = useParams()
    var dispatch = useDispatch()

    // --- STATES ---
    var [mc, setmc] = useState(maincat)
    var [sc, setsc] = useState("All")
    var [br, setbr] = useState("All")
    var [size, setSize] = useState("All")
    var [min, setmin] = useState(1)
    var [max, setmax] = useState(10000)
    var [search, setSearch] = useState("")
    var [sortBy, setSortBy] = useState("newest")

    var product = useSelector((state) => state.ProductStateData)
    var maincategory = useSelector((state) => state.MaincategoryStateData)
    var subcategory = useSelector((state) => state.SubcategoryStateData)
    var brand = useSelector((state) => state.BrandStateData)

    // --- LOAD DATA ---
    useEffect(() => {
        dispatch(getProduct())
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
    }, [dispatch])

    useEffect(() => { setmc(maincat) }, [maincat])

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
                                        className="col-md-6 col-lg-4 mb-4"
                                    >
                                        <div className="product-card-premium h-100 bg-white shadow-sm overflow-hidden position-relative">
                                            {/* Discount Badge */}
                                            {item.discount > 0 && (
                                                <div className="premium-badge">{item.discount}% OFF</div>
                                            )}

                                            <Link to={`/single-product/${item.id}`} className="img-wrap">
                                                <motion.img 
                                                    src={item.pic1} 
                                                    className="w-100" 
                                                    style={{ height: "320px", objectFit: "cover" }} 
                                                    alt={item.name}
                                                    whileHover={{ scale: 1.1, rotate: 2 }}
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

                                            <div className="p-4">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="text-muted small uppercase">{item.brand}</span>
                                                    {/* Rating System */}
                                                    <div className="text-warning small">
                                                        <i className="fa fa-star"></i>
                                                        <i className="fa fa-star"></i>
                                                        <i className="fa fa-star"></i>
                                                        <i className="fa fa-star"></i>
                                                        <i className="fa fa-star-half-o"></i>
                                                    </div>
                                                </div>
                                                <h3 className="h6 font-weight-bold mb-3">
                                                    <Link to={`/single-product/${item.id}`} className="text-dark">{item.name}</Link>
                                                </h3>
                                                <div className="d-flex align-items-end justify-content-between">
                                                    <div>
                                                        <span className="h5 font-weight-bold text-info mb-0">₹{item.finalprice}</span>
                                                        <del className="text-muted small ml-2">₹{item.baseprice}</del>
                                                    </div>
                                                    <button onClick={() => window.location.href=`/single-product/${item.id}`} className="btn btn-info btn-sm rounded-circle shadow-sm">
                                                        <i className="icon-shopping_cart"></i>
                                                    </button>
                                                </div>
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
                .rounded-xl { border-radius: 20px !important; }
                .product-card-premium {
                    border-radius: 20px;
                    transition: all 0.4s ease;
                    border: 1px solid #f0f0f0;
                }
                .product-card-premium:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
                }
                .img-wrap { position: relative; display: block; overflow: hidden; }
                .img-wrap img { transition: 0.6s all ease; }
                
                .card-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.2); display: flex; align-items: center;
                    justify-content: center; opacity: 0; transition: 0.3s;
                }
                
                .premium-badge {
                    position: absolute; top: 15px; left: 15px; z-index: 10;
                    background: #ff4757; color: white; padding: 4px 12px;
                    border-radius: 50px; font-size: 11px; font-weight: bold;
                    box-shadow: 0 4px 10px rgba(255,71,87,0.3);
                }
                .gap-2 { gap: 10px; }
                .btn-white { background: white; color: black; border: none; font-weight: bold; }
            `}} />
        </div>
    )
}