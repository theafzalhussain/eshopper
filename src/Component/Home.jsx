import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import { getCheckout } from '../Store/ActionCreaters/CheckoutActionCreators'; // Import for Orders/Revenue
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ShoppingBag, DollarSign, Package } from 'lucide-react'; // Icons for Stats

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const users = useSelector((state) => state.UserStateData)
    const orders = useSelector((state) => state.CheckoutStateData) // For revenue/orders count
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const [currentSlide, setCurrentSlide] = useState(0);
    const [welcomeUser, setWelcomeUser] = useState("")

    // --- ⚡ LIVE DATA CALCULATION (OPTIMIZED) ---
    // Calculates Revenue, Orders and User counts instantly when data arrives
    const stats = useMemo(() => {
        const revenue = orders?.reduce((sum, item) => sum + (Number(item.finalAmount) || 0), 0);
        return {
            totalUsers: users?.length || 0,
            totalOrders: orders?.length || 0,
            totalRevenue: revenue?.toLocaleString() || 0,
            totalProducts: product?.length || 0
        }
    }, [users, orders, product]);

    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        // Fetching all lists from backend (Render/MongoDB) to keep site real-time
        dispatch(getProduct())
        dispatch(getUser())
        dispatch(getCheckout()) // Refreshes orders list

        const storedName = localStorage.getItem("name")
        if(storedName) setWelcomeUser(storedName)

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [dispatch])

    const sliderData = [
        { title: "Summer Elegance", sub: "NEW ARRIVALS 2024", img: "/assets/images/banner-1.png", color: "#fdfdfd", link: "/shop/Female" },
        { title: "Urban Sophist", sub: "MENS ATELIER", img: "/assets/images/banner-2.png", color: "#f4faff", link: "/shop/Male" }
    ];

    return (
        <div className="home-ultimate-root" style={{ backgroundColor: "#fff", overflowX: 'hidden' }}>
            
            {/* --- 1. PREMIUM PARALLAX HERO --- */}
            <section className="luxury-hero" style={{ height: '85vh', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
                        className="w-100 h-100 d-flex align-items-center"
                        style={{ backgroundColor: sliderData[currentSlide]?.color || '#f8f9fa' }}
                    >
                        <div className="container">
                            <div className="row align-items-center">
                                <div className="col-lg-6 z-index-10">
                                    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                                        <span className="text-info font-weight-bold ls-4 mb-3 d-block small uppercase">
                                            {welcomeUser ? `WELCOME, ${welcomeUser.toUpperCase()}` : sliderData[currentSlide]?.sub}
                                        </span>
                                        <h1 className="display-1 luxury-font font-weight-bold text-dark mb-4" style={{lineHeight:0.9}}>
                                            {sliderData[currentSlide]?.title}
                                        </h1>
                                        <Link to={sliderData[currentSlide]?.link || "/shop/All"} className="btn-luxury mt-4">EXPLORE NOW</Link>
                                    </motion.div>
                                </div>
                                <div className="col-lg-6 text-center d-none d-lg-block">
                                    <motion.img 
                                        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1 }}
                                        src={sliderData[currentSlide]?.img} className="img-fluid floating-hero" style={{ maxHeight: '70vh' }} alt=""
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* --- 🟢 NEW: LIVE PERFORMANCE ANALYTICS BAR (Connected to DB) --- */}
            <section className="py-4 bg-white shadow-sm border-bottom">
                <div className="container">
                    <div className="row">
                        {[
                            { label: "Elite Users", val: stats.totalUsers, icon: <Users size={20}/> },
                            { label: "Success Orders", val: stats.totalOrders, icon: <ShoppingBag size={20}/> },
                            { label: "Net Revenue", val: `₹${stats.totalRevenue}`, icon: <DollarSign size={20}/> },
                            { label: "Active Designs", val: stats.totalProducts, icon: <Package size={20}/> }
                        ].map((item, i) => (
                            <div key={i} className="col-6 col-md-3 border-md-right text-center p-3 last-no-border">
                                <div className="d-flex align-items-center justify-content-center mb-1 text-info">
                                    {item.icon} <span className="ml-2 font-weight-bold text-dark">{item.val}</span>
                                </div>
                                <small className="text-muted text-uppercase ls-1" style={{fontSize:'10px'}}>{item.label}</small>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 2. EDITORIAL CATEGORY SECTION --- */}
            <section className="py-5 bg-white border-bottom">
                <div className="container py-5">
                    <div className="d-flex justify-content-between align-items-end mb-5">
                        <div>
                            <h2 className="luxury-font display-4 mb-0">The Editorials</h2>
                            <p className="text-info font-weight-bold mb-0">CURATED STORIES OF FALL / WINTER 2024</p>
                        </div>
                    </div>
                    <div className="row g-4 align-items-stretch">
                        <div className="col-md-6 mb-4">
                            <motion.div whileHover={{ scale: 0.99 }} className="story-card shadow-lg rounded-3xl overflow-hidden position-relative h-100">
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-cover" alt="Manifesto" style={{minHeight:'550px'}} />
                                <div className="story-overlay p-5 d-flex flex-column justify-content-end">
                                    <h3 className="display-4 text-white font-weight-bold mb-3">MANIFESTO<br/>MAN</h3>
                                    <Link to="/shop/Male" className="btn btn-outline-light rounded-0 px-5 font-weight-bold ls-2">EXPLORE SHOP</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-6">
                            <div className="d-flex flex-column h-100">
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl shadow-lg overflow-hidden position-relative mb-4" style={{ flex: 1 }}>
                                    <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-cover opacity-75" alt="Woman" />
                                    <div className="story-overlay-light p-5">
                                        <h3 className="h1 text-white font-weight-bold mb-0">ELEGANT<br/>MODERN</h3>
                                        <Link to="/shop/Female" className="text-white font-weight-bold border-bottom pb-1 small mt-2 d-inline-block">VIEW DETAILS</Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl bg-info shadow-lg p-5 position-relative overflow-hidden" style={{ flex: 1 }}>
                                    <div className="position-relative z-index-10 text-white">
                                        <h4 className="font-weight-bold ls-2 small mb-2 opacity-75 uppercase">Exclusives</h4>
                                        <h2 className="display-4 font-weight-bold">KIDS LAB</h2>
                                        <Link to="/shop/Kids" className="btn btn-white btn-sm px-4 font-weight-bold rounded-pill mt-3 shadow-sm">DISCOVER ALL</Link>
                                    </div>
                                    <img src="/assets/images/banner-3.png" className="position-absolute h-110" style={{right:'-20px', bottom:'-30px', transform: 'rotate(-5deg)'}} alt=""/>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 3. PREMIUM PRODUCT SHOWCASE --- */}
            <section className="py-5 bg-light shadow-inner">
                <div className="container py-5 text-center">
                    <h2 className="luxury-font display-4 mb-2 text-dark">Trending Curations</h2>
                    <div className="mx-auto bg-info mb-5" style={{ height: '3px', width: '80px' }}></div>

                    <div className="row">
                        {displayProducts.length > 0 ? displayProducts.map((item, index) => (
                            <motion.div 
                                key={item.id} className="col-6 col-md-4 col-lg-3 mb-5"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                            >
                                <div className="fashion-card shadow-hover transition-slow h-100 d-flex flex-column bg-white rounded-2xl overflow-hidden border">
                                    <div className="position-relative img-holder overflow-hidden" style={{ aspectSratio:'10/13' }}>
                                        <Link to={`/single-product/${item.id}`}>
                                            <img src={item.pic1} loading="lazy" className="w-100 h-100 object-cover luxury-image" alt={item.name} />
                                        </Link>
                                        {item.discount > 0 && <div className="lux-tag">-{item.discount}%</div>}
                                        <div className="action-layer">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="p-icon-btn"><i className="icon-eye"></i></button>
                                            <button className="p-icon-btn"><i className="icon-shopping_cart"></i></button>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-grow-1 d-flex flex-column text-left">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small text-info font-weight-bold text-uppercase">{item.brand}</span>
                                            <span className="small text-muted font-weight-bold">⭐ 4.9</span>
                                        </div>
                                        <h3 className="h6 font-weight-bold mb-3 text-dark">
                                            <Link to={`/single-product/${item.id}`} className="text-dark no-underline hover-info">{item.name}</Link>
                                        </h3>
                                        <div className="mt-auto pt-2 border-top d-flex align-items-center">
                                            <span className="h5 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                            {item.baseprice > item.finalprice && <del className="ml-2 text-muted x-small">₹{item.baseprice}</del>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : [1,2,3,4].map(i => <div key={i} className="col-lg-3 col-6"><div className="skeleton-p mb-5"></div></div>)}
                    </div>
                </div>
            </section>

            <Newslatter />

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600;800&display=swap');
                
                .home-ultimate-root { font-family: 'Inter', sans-serif; }
                .luxury-font { font-family: 'Bodoni Moda', serif; }
                .ls-4 { letter-spacing: 4px; }
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 35px !important; }
                .object-cover { object-fit: cover; }
                .bg-info-light { background-color: rgba(23,162,184,0.1); }
                .transition-slow { transition: 0.5s all cubic-bezier(0.165, 0.84, 0.44, 1); }
                .floating-hero { animation: floating 6s ease-in-out infinite; }
                @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }

                .btn-luxury { display: inline-block; background: #000; color: #fff; padding: 15px 45px; font-weight: 800; border-radius: 50px; transition: 0.3s; }
                
                .fashion-card:hover .luxury-image { transform: scale(1.15); }
                .action-layer { position: absolute; bottom: -50px; left: 0; width: 100%; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); padding: 15px; display: flex; justify-content: center; gap: 15px; transition: 0.4s; }
                .fashion-card:hover .action-layer { bottom: 0; }
                .p-icon-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: #fff; color: #111; display: flex; align-items: center; justify-content: center; }
                .lux-tag { position: absolute; top: 15px; left: 15px; background: #000; color: #fff; padding: 5px 12px; font-weight: bold; font-size: 10px; }
                .shadow-hover:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important; transform: translateY(-5px); border-color: #17a2b8 !important; }

                .story-overlay { position: absolute; top:0; left:0; width: 100%; height: 100%; background: linear-gradient(transparent 30%, rgba(0,0,0,0.9)); }
                .btn-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                
                .skeleton-p { height: 400px; background: #eee; border-radius: 24px; animation: p-shimmer 1.5s infinite; }
                @keyframes p-shimmer { 0%, 100% { opacity:0.5; } 50% { opacity: 1; } }

                .border-md-right { border-right: 1px solid #eee; }
                @media (max-width: 768px) { .border-md-right { border-right: none; border-bottom: 1px solid #eee; } }
            `}} />
        </div>
    )
}