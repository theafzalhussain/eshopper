import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const [currentSlide, setCurrentSlide] = useState(0);

    // --- ⚡ PERFORMANCE OPTIMIZATION ---
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
        // Auto-slide for Hero
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === sliderData.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [dispatch])

    // --- PREMIUM SLIDER DATA ---
    const sliderData = [
        {
            title: "Summer Elegance",
            subtitle: "NEW ARRIVALS 2024",
            desc: "Experience the fusion of comfort and high-street fashion.",
            img: "/assets/images/banner-1.png",
            color: "#f8f9fa",
            link: "/shop/Female"
        },
        {
            title: "Urban Sophistication",
            subtitle: "MENS COLLECTION",
            desc: "Define your style with our premium hand-picked essentials.",
            img: "/assets/images/banner-2.png",
            color: "#e3f2fd",
            link: "/shop/Male"
        }
    ];

    // --- ANIMATION VARIANTS ---
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    }

    return (
        <div className="home-premium-wrapper" style={{ backgroundColor: "#ffffff" }}>
            
            {/* --- 1. DYNAMIC PREMIUM HERO CAROUSEL --- */}
            <section className="hero-slider position-relative overflow-hidden" style={{ height: '90vh' }}>
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="w-100 h-100 d-flex align-items-center"
                        style={{ backgroundColor: sliderData[currentSlide].color }}
                    >
                        <div className="container">
                            <div className="row align-items-center">
                                <div className="col-lg-6">
                                    <motion.span 
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-info font-weight-bold letter-spacing-2 mb-3 d-block"
                                    >
                                        {sliderData[currentSlide].subtitle}
                                    </motion.span>
                                    <motion.h1 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="display-2 font-weight-bold mb-4"
                                    >
                                        {sliderData[currentSlide].title}
                                    </motion.h1>
                                    <motion.p 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="lead text-muted mb-5"
                                    >
                                        {sliderData[currentSlide].desc}
                                    </motion.p>
                                    <Link to={sliderData[currentSlide].link} className="btn btn-dark btn-lg px-5 py-3 rounded-pill shadow-lg">
                                        EXPLORE COLLECTION
                                    </Link>
                                </div>
                                <div className="col-lg-6 text-center d-none d-lg-block">
                                    <motion.img 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        src={sliderData[currentSlide].img} 
                                        className="img-fluid hero-floating-img"
                                        alt="Hero"
                                        style={{ maxHeight: '70vh' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
                
                {/* Slider Dots */}
                <div className="slider-dots">
                    {sliderData.map((_, i) => (
                        <div key={i} onClick={() => setCurrentSlide(i)} className={`dot ${currentSlide === i ? 'active' : ''}`}></div>
                    ))}
                </div>
            </section>

            {/* --- 2. LUXURY BENTO CATEGORIES --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-md-7">
                            <motion.div whileHover={{y:-10}} className="category-card large shadow-sm rounded-xl overflow-hidden position-relative">
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover" alt="Male" style={{minHeight:'500px'}} />
                                <div className="category-content-overlay">
                                    <h2 className="text-white display-4 font-weight-bold">MEN</h2>
                                    <Link to="/shop/Male" className="btn btn-light rounded-pill px-4">Shop Now</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-5">
                            <div className="d-flex flex-column h-100 gap-4">
                                <motion.div whileHover={{y:-10}} className="category-card shadow-sm rounded-xl overflow-hidden position-relative mb-4" style={{flex:1}}>
                                    <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover" alt="Female" />
                                    <div className="category-content-overlay">
                                        <h3 className="text-white font-weight-bold">WOMEN</h3>
                                        <Link to="/shop/Female" className="text-white border-bottom">Discover</Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{y:-10}} className="category-card shadow-sm rounded-xl overflow-hidden position-relative bg-info" style={{flex:1, minHeight: '235px'}}>
                                    <div className="p-4 text-white">
                                        <h3 className="font-weight-bold">KIDS WEAR</h3>
                                        <p className="small">Playful styles for little ones.</p>
                                        <Link to="/shop/Kids" className="btn btn-outline-light btn-sm rounded-pill mt-2">View All</Link>
                                    </div>
                                    <img src="/assets/images/banner-3.png" className="position-absolute" style={{bottom:'-20px', right:'-20px', height:'120%'}} alt="" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 3. TRENDING PRODUCTS (FIXED STRETCHING) --- */}
            <section className="py-5 bg-light">
                <div className="container">
                    <div className="text-center mb-5">
                        <h6 className="text-info font-weight-bold text-uppercase letter-spacing-2">Curated for you</h6>
                        <h2 className="display-4 font-weight-bold">The Trend Report</h2>
                    </div>

                    <div className="row">
                        {displayProducts.length > 0 ? displayProducts.map((item) => (
                            <div key={item.id} className="col-6 col-md-4 col-lg-3 mb-4">
                                <motion.div 
                                    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                    className="product-premium-card bg-white rounded-xl shadow-hover overflow-hidden h-100 d-flex flex-column"
                                >
                                    <div className="position-relative overflow-hidden aspect-ratio-box">
                                        <Link to={`/single-product/${item.id}`}>
                                            <img 
                                                src={item.pic1} 
                                                loading="lazy"
                                                className="product-img-main w-100 h-100" 
                                                alt={item.name} 
                                            />
                                        </Link>
                                        {item.discount > 0 && <span className="discount-tag">-{item.discount}%</span>}
                                        <div className="product-actions-hover">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="btn-action shadow"><i className="icon-shopping_cart"></i></button>
                                            <button className="btn-action shadow"><i className="icon-heart"></i></button>
                                        </div>
                                    </div>
                                    <div className="p-3 mt-auto">
                                        <p className="text-muted small mb-1 text-uppercase letter-spacing-1">{item.brand}</p>
                                        <h6 className="font-weight-bold mb-2">
                                            <Link to={`/single-product/${item.id}`} className="text-dark text-decoration-none">{item.name}</Link>
                                        </h6>
                                        <div className="d-flex align-items-center">
                                            <span className="h6 font-weight-bold text-info mb-0">₹{item.finalprice}</span>
                                            {item.baseprice > item.finalprice && <del className="ml-2 text-muted x-small">₹{item.baseprice}</del>}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )) : (
                            // Skeleton loader during fetch
                            [1,2,3,4].map(i => <div key={i} className="col-lg-3 mb-4"><div className="skeleton-box rounded-xl"></div></div>)
                        )}
                    </div>
                </div>
            </section>

            {/* --- 4. EXCLUSIVE FLASH SALE BANNER --- */}
            <section className="py-5 my-5">
                <div className="container">
                    <div className="flash-sale-banner rounded-3xl p-5 d-flex align-items-center justify-content-between flex-wrap shadow-lg" style={{background: 'linear-gradient(45deg, #17a2b8, #0056b3)'}}>
                        <div className="text-white mb-4 mb-md-0">
                            <h2 className="display-4 font-weight-bold">Season End Sale</h2>
                            <p className="lead opacity-75">Get up to <span className="h2 font-weight-bold">70% OFF</span> on all luxury brands.</p>
                        </div>
                        <div className="d-flex gap-4">
                            <Link to="/shop/All" className="btn btn-light btn-lg rounded-pill px-5 shadow">SHOP THE SALE</Link>
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- 💎 PREMIUM CSS (STYLING & NO-STRETCH) --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 40px !important; }
                .letter-spacing-2 { letter-spacing: 2px; }
                .letter-spacing-1 { letter-spacing: 1px; }
                .x-small { font-size: 0.75rem; }

                /* Prevent Image Stretching */
                .aspect-ratio-box {
                    width: 100%;
                    aspect-ratio: 4 / 5; /* Standard Fashion Ratio */
                    background: #f8f9fa;
                }
                .product-img-main {
                    object-fit: cover; /* This prevents stretching */
                    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .product-premium-card:hover .product-img-main { transform: scale(1.08); }

                /* Hero Floating Animation */
                .hero-floating-img { animation: float 6s ease-in-out infinite; }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

                /* Custom Slider Dots */
                .slider-dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
                .dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(0,0,0,0.1); cursor: pointer; transition: 0.3s; }
                .dot.active { width: 30px; border-radius: 10px; background: #17a2b8; }

                /* Category Overlays */
                .category-card { height: 100%; min-height: 250px; }
                .category-content-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
                    display: flex; flex-direction: column; justify-content: flex-end; padding: 40px;
                }

                /* Product Hover Actions */
                .product-actions-hover {
                    position: absolute; bottom: -60px; left: 0; width: 100%;
                    display: flex; justify-content: center; gap: 10px;
                    padding: 20px; transition: 0.4s ease;
                }
                .product-premium-card:hover .product-actions-hover { bottom: 0; }
                .btn-action { width: 45px; height: 45px; border-radius: 50%; border: none; background: white; color: #333; display: flex; align-items: center; justify-content: center; }
                .btn-action:hover { background: #17a2b8; color: white; }

                .discount-tag { position: absolute; top: 15px; right: 15px; background: #ff4757; color: white; padding: 4px 12px; border-radius: 50px; font-weight: bold; font-size: 11px; }
                
                .shadow-hover { transition: 0.3s; }
                .product-premium-card:hover { shadow: 0 15px 35px rgba(0,0,0,0.1) !important; }

                .skeleton-box { height: 350px; background: #eee; position: relative; overflow: hidden; }
                .skeleton-box::after {
                    content: ""; position: absolute; top: 0; right: 0; bottom: 0; left: 0;
                    transform: translateX(-100%);
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer { 100% { transform: translateX(100%); } }
            `}} />
        </div>
    )
}