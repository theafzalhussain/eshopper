import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import { getWishlist, addWishlist } from '../Store/ActionCreaters/WishlistActionCreators'; // Wishlist actions added
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryHelper';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const wishlist = useSelector((state) => state.WishlistStateData) // Selected Wishlist State
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const [currentSlide, setCurrentSlide] = useState(0);
    const [welcomeUser, setWelcomeUser] = useState("")
    

    const sliderData = [
        { 
            title: "Summer Elegance", 
            sub: "NEW ARRIVALS 2024", 
            desc: "Discover the latest trends in summer fashion with premium fabrics and elegant designs",
            img: "/assets/images/cr-3.png", 
            color: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", 
            link: "/shop/Female" 
        },
        { 
            title: "Urban Sophist", 
            sub: "MENS ATELIER", 
            desc: "Redefine your style with sophisticated urban wear crafted for modern gentlemen",
            img: "/assets/images/CR-6.png", 
            color: "linear-gradient(135deg, #e0f7ff 0%, #f0f4ff 100%)", 
            link: "/shop/Male" 
        },
        { 
            title: "Kids Paradise", 
            sub: "SPRING COLLECTION", 
            desc: "Vibrant colors and playful designs for your little ones' everyday adventures",
            img: "/assets/images/kids 2.png", 
            color: "linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%)", 
            link: "/shop/Kids" 
        },
        { 
            title: "Exclusive Deals", 
            sub: "UPTO 60% OFF", 
            desc: "Unbeatable prices on premium fashion - Limited time offers you can't miss",
            img: "/assets/images/Exclusive Deals 2.png", 
            color: "linear-gradient(135deg, #f0fff4 0%, #e8f5e9 100%)", 
            link: "/shop/All" 
        }
    ];

    // ⚡ Fast Loading optimization
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
        dispatch(getUser())
        dispatch(getWishlist()) // Initializing Wishlist Data
        
        const storedName = localStorage.getItem("name")
        if(storedName) setWelcomeUser(storedName)

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === sliderData.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [dispatch, sliderData.length])

    // --- LOGIC: ADD TO WISHLIST FROM HOME ---
    function addToWishlist(p) {
        if (!localStorage.getItem("login")) {
            navigate("/login")
        } else {
            let d = wishlist.find((item) => item.productid === p.id && item.userid === localStorage.getItem("userid"))
            if (d) {
                navigate("/profile") // Navigating to profile where wishlist is usually located
            } else {
                let item = {
                    productid: p.id,
                    userid: localStorage.getItem("userid"),
                    name: p.name,
                    color: p.color,
                    size: p.size,
                    price: Number(p.finalprice),
                    pic: p.pic1,
                }
                dispatch(addWishlist(item))
                navigate("/profile")
            }
        }
    }

    return (
        <div className="home-ultimate-root" style={{ backgroundColor: "#fff", overflowX: 'hidden' }}>
            
            {/* --- 1. PREMIUM PARALLAX HERO --- */}
            <section className="luxury-hero">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentSlide} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="w-100 h-100 d-flex align-items-center hero-slide-container"
                        style={{ background: sliderData[currentSlide]?.color || 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}
                    >
                        {/* Decorative Elements */}
                        <div className="hero-decoration-1"></div>
                        <div className="hero-decoration-2"></div>
                        
                        <div className="container position-relative">
                            <div className="row align-items-center">
                                <div className="col-lg-6 col-12 z-index-10 hero-text-section">
                                    <motion.div 
                                        initial={{ y: 50, opacity: 0 }} 
                                        animate={{ y: 0, opacity: 1 }} 
                                        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <div className="hero-badge mb-3">
                                            <span className="badge-icon">✨</span>
                                            <span className="text-info font-weight-bold ls-4 hero-subtitle">
                                                {welcomeUser ? `WELCOME, ${welcomeUser.toUpperCase()}` : sliderData[currentSlide]?.sub}
                                            </span>
                                        </div>
                                        <h1 className="luxury-font font-weight-bold hero-title mb-3">
                                            <span className="hero-title-gradient">{sliderData[currentSlide]?.title}</span>
                                        </h1>
                                        <p className="hero-description text-muted mb-4">
                                            {sliderData[currentSlide]?.desc}
                                        </p>
                                        <div className="d-flex flex-wrap align-items-center gap-3 hero-actions">
                                            <Link to={sliderData[currentSlide]?.link || "/shop/All"} className="btn-luxury-primary">
                                                EXPLORE NOW
                                                <span className="btn-arrow">→</span>
                                            </Link>
                                            <Link to="/shop/All" className="btn-luxury-secondary">
                                                VIEW ALL <span className="btn-underline"></span>
                                            </Link>
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="col-lg-6 col-12 text-center hero-image-section position-relative">
                                    <div className="hero-img-wrapper">
                                        <motion.div 
                                            className="hero-img-backdrop"
                                            initial={{ scale: 0.8, opacity: 0 }} 
                                            animate={{ scale: 1, opacity: 1 }} 
                                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                        ></motion.div>
                                        <motion.img 
                                            initial={{ scale: 0.85, opacity: 0, y: 30 }} 
                                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                            src={sliderData[currentSlide]?.img} 
                                            className="img-fluid floating-hero hero-main-img" 
                                            alt={sliderData[currentSlide]?.title}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Carousel Navigation */}
                        <div className="carousel-navigation">
                            <div className="carousel-dots">
                                {sliderData.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`dot ${currentSlide === index ? 'active' : ''}`}
                                        onClick={() => setCurrentSlide(index)}
                                        aria-label={`Go to slide ${index + 1}`}
                                    >
                                        <span className="dot-inner"></span>
                                    </button>
                                ))}
                            </div>
                            <div className="carousel-counter">
                                <span className="current">{String(currentSlide + 1).padStart(2, '0')}</span>
                                <span className="separator">/</span>
                                <span className="total">{String(sliderData.length).padStart(2, '0')}</span>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* --- 2. EDITORIAL CATEGORY SECTION --- */}
            <section className="py-5 bg-white border-bottom">
                <div className="container py-md-5 py-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end mb-4 mb-md-5">
                        <div>
                            <h2 className="luxury-font editorial-heading mb-0">The Editorials</h2>
                            <p className="text-info font-weight-bold mb-0 editorial-subtitle">CURATED STORIES OF FALL / WINTER 2024</p>
                        </div>
                    </div>
                    <div className="row g-3 g-md-4 align-items-stretch">
                        <div className="col-12 col-md-6 mb-3 mb-md-4">
                            <motion.div whileHover={{ scale: 0.99 }} className="story-card shadow-lg rounded-3xl overflow-hidden position-relative h-100">
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-cover story-img" alt="Manifesto" />
                                <div className="story-overlay p-4 p-md-5 d-flex flex-column justify-content-end">
                                    <h3 className="text-white font-weight-bold mb-3 story-title">MANIFESTO<br/>MAN</h3>
                                    <Link to="/shop/Male" className="btn btn-outline-light rounded-0 px-4 px-md-5 font-weight-bold ls-2 story-btn">EXPLORE SHOP</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="d-flex flex-column h-100">
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl shadow-lg overflow-hidden position-relative mb-3 mb-md-4" style={{ flex: 1, minHeight: '250px' }}>
                                    <img src="/assets/images/cr-1.png" className="w-100 h-100 object-cover opacity-75 story-img" alt="Woman" />
                                    <div className="story-overlay-light p-4 p-md-5">
                                        <h3 className="h2 h1-md text-white font-weight-bold mb-0">ELEGANT<br/>MODERN</h3>
                                        <Link to="/shop/Female" className="text-white font-weight-bold border-bottom pb-1 small mt-2 d-inline-block">VIEW DETAILS</Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl bg-info shadow-lg p-4 p-md-5 position-relative overflow-hidden" style={{ flex: 1, minHeight: '250px' }}>
                                    <div className="position-relative z-index-10 text-white">
                                        <h4 className="font-weight-bold ls-2 small mb-2 opacity-75 uppercase">Exclusives</h4>
                                        <h2 className="font-weight-bold kids-title">KIDS LAB</h2>
                                        <Link to="/shop/Kids" className="btn btn-white btn-sm px-4 font-weight-bold rounded-pill mt-3 shadow-sm">DISCOVER ALL</Link>
                                    </div>
                                    <img src="/assets/images/kids3.png" className="position-absolute kids-img" alt=""/>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 3. PREMIUM PRODUCT SHOWCASE --- */}
            <section className="py-5 bg-light shadow-inner product-showcase-section">
                <div className="container py-md-5 py-3">
                    <div className="text-center mb-5">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="showcase-badge text-info font-weight-bold ls-3 mb-2 d-inline-block">HANDPICKED FOR YOU</span>
                            <h2 className="luxury-font product-showcase-title mb-3">Trending Curations</h2>
                            <p className="showcase-subtitle text-muted mx-auto">Discover our carefully selected premium collection designed for modern lifestyle</p>
                            <div className="mx-auto bg-gradient-info mb-4" style={{ height: '4px', width: '100px', borderRadius: '2px' }}></div>
                        </motion.div>
                    </div>

                    <div className="container">
                        {displayProducts.length > 0 ? (
                            <div className="row">
                                {displayProducts.map((item, index) => (
                                    <motion.div 
                                        key={item.id} className="col-12 col-sm-6 col-md-4 col-lg-4 mb-4 mb-md-4"
                                        initial={{ opacity: 0, y: 30 }} 
                                        whileInView={{ opacity: 1, y: 0 }} 
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.08, duration: 0.5 }}
                                    >
                                        <div className="fashion-card shadow-hover transition-slow h-100 d-flex flex-column bg-white rounded-3xl overflow-hidden">
                                            <div className="position-relative img-holder product-img-container">
                                                <Link to={`/single-product/${item.id}`} className="product-link">
                                                    <img 
                                                        src={optimizeCloudinaryUrl(item.pic1)} 
                                                        loading="lazy" 
                                                        className="w-100 h-100 object-cover luxury-image" 
                                                        alt={item.name} 
                                                    />
                                                    <div className="image-overlay"></div>
                                                </Link>
                                                
                                                {/* Tags and Badges */}
                                                <div className="product-badges">
                                                    {item.discount > 0 && <div className="lux-tag discount-tag">-{item.discount}%</div>}
                                                    {index < 2 && <div className="lux-tag new-tag">NEW</div>}
                                                </div>
                                                
                                                {/* Quick Action Buttons */}
                                                <div className="action-layer">
                                                    <button onClick={() => addToWishlist(item)} className="p-icon-btn btn-wishlist" title="Add to Wishlist">
                                                        <i className="icon-heart"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Product Details */}
                                            <div className="p-3 p-md-4 flex-grow-1 d-flex flex-column">
                                                {/* Brand and Rating */}
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="product-brand text-info font-weight-bold text-uppercase">{item.brand}</span>
                                                    <div className="product-rating-wrapper">
                                                        <span className="rating-stars">★★★★★</span>
                                                        <span className="rating-text text-muted">(4.9)</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Product Name */}
                                                <h3 className="product-name font-weight-bold mb-2">
                                                    <Link to={`/single-product/${item.id}`} className="text-dark no-underline hover-info">
                                                        {item.name}
                                                    </Link>
                                                </h3>
                                                
                                                {/* Product Category/Description */}
                                                <p className="product-category text-muted mb-3">
                                                    {item.maincategory} • {item.subcategory}
                                                </p>
                                                
                                                {/* Premium Feature Highlights */}
                                                <div className="product-feature-chips mb-3">
                                                    {item.discount > 0 && <span className="feature-chip">Save {item.discount}%</span>}
                                                    {item.finalprice >= 999 && <span className="feature-chip soft">Free Shipping</span>}
                                                    <span className="feature-chip solid">Premium Fabric</span>
                                                    {item.stock === "In Stock" && <span className="feature-chip success">In Stock</span>}
                                                </div>
                                                
                                                {/* Price Section */}
                                                <div className="mt-auto pt-3 border-top">
                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <div className="price-group">
                                                            <span className="product-price font-weight-bold text-dark">₹{item.finalprice}</span>
                                                            {item.baseprice > item.finalprice && (
                                                                <del className="product-old-price text-muted ml-2">₹{item.baseprice}</del>
                                                            )}
                                                        </div>
                                                        {item.baseprice > item.finalprice && (
                                                            <span className="save-badge">
                                                                Save ₹{item.baseprice - item.finalprice}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h2 text-info">
                                <i className="icon-refresh"></i>
                                </motion.div>
                                <h4 className="mt-3 font-weight-bold text-dark">Initializing Premium Collection...</h4>
                                <p className="text-muted small text-uppercase ls-2">Backend is waking up (may take 30s)...</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <Newslatter />

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600;800&display=swap');
                
                * { box-sizing: border-box; }
                .home-ultimate-root { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
                .luxury-font { font-family: 'Bodoni Moda', serif; font-weight: 700; }
                .ls-4 { letter-spacing: 4px; }
                .ls-3 { letter-spacing: 3px; }
                .ls-2 { letter-spacing: 2px; }
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 24px !important; }
                .object-cover { object-fit: cover; }
                .object-contain { object-fit: contain; }
                .transition-slow { transition: 0.5s all cubic-bezier(0.165, 0.84, 0.44, 1); }
                .z-index-10 { z-index: 10; position: relative; }
                .gap-3 { gap: 15px; }
                .bg-gradient-info { background: linear-gradient(90deg, #17a2b8 0%, #138496 100%); }
                
                /* === HERO SECTION === */
                .luxury-hero { 
                    height: 90vh; 
                    position: relative; 
                    min-height: 650px; 
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                }
                .hero-slide-container { 
                    position: relative; 
                    width: 100%; 
                    height: 100%;
                    display: flex;
                    align-items: center;
                }
                
                /* Decorative Floating Elements */
                .hero-decoration-1, .hero-decoration-2 {
                    position: absolute;
                    border-radius: 50%;
                    opacity: 0.1;
                    pointer-events: none;
                    z-index: 1;
                }
                .hero-decoration-1 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, #17a2b8 0%, transparent 70%);
                    top: -200px;
                    right: -100px;
                    animation: float1 20s ease-in-out infinite;
                }
                .hero-decoration-2 {
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, #007bff 0%, transparent 70%);
                    bottom: -150px;
                    left: -100px;
                    animation: float2 15s ease-in-out infinite;
                }
                @keyframes float1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-50px, 50px); } }
                @keyframes float2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(50px, -50px); } }
                
                /* Hero Badge */
                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 20px;
                    background: rgba(23, 162, 184, 0.1);
                    border-radius: 30px;
                    border: 2px solid rgba(23, 162, 184, 0.3);
                    backdrop-filter: blur(10px);
                }
                .badge-icon { font-size: 18px; }
                .hero-subtitle { font-size: 11px; font-weight: 700; }
                
                /* Hero Title */
                .hero-title { 
                    font-size: 5.5rem; 
                    line-height: 0.95; 
                    margin-bottom: 20px;
                    letter-spacing: -2px;
                }
                .hero-title-gradient {
                    background: linear-gradient(135deg, #1a1a1a 0%, #17a2b8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                /* Hero Description */
                .hero-description {
                    font-size: 16px;
                    line-height: 1.7;
                    max-width: 480px;
                    font-weight: 400;
                    color: #6c757d;
                }
                
                /* Hero Buttons */
                .hero-actions { margin-top: 30px; }
                .btn-luxury-primary { 
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    color: #fff; 
                    padding: 16px 40px; 
                    font-weight: 700; 
                    font-size: 14px;
                    border-radius: 50px; 
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
                    text-decoration: none;
                    letter-spacing: 1px;
                }
                .btn-luxury-primary:hover { 
                    transform: translateY(-3px); 
                    box-shadow: 0 15px 40px rgba(0,0,0,0.25); 
                    gap: 15px;
                    color: #fff;
                }
                .btn-arrow { 
                    font-size: 20px; 
                    transition: all 0.3s;
                    display: inline-block;
                }
                
                .btn-luxury-secondary {
                    display: inline-flex;
                    align-items: center;
                    color: #000;
                    font-weight: 600;
                    font-size: 14px;
                    text-decoration: none;
                    position: relative;
                    padding-bottom: 4px;
                    letter-spacing: 0.5px;
                }
                .btn-luxury-secondary:hover { color: #17a2b8; }
                .btn-underline {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: #17a2b8;
                    transition: transform 0.3s;
                }
                .btn-luxury-secondary:hover .btn-underline { transform: scaleX(1.2); }
                
                /* Hero Image */
                .hero-img-wrapper {
                    position: relative;
                    display: inline-block;
                }
                .hero-img-backdrop {
                    position: absolute;
                    width: 80%;
                    height: 80%;
                    top: 10%;
                    left: 10%;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.2) 0%, rgba(0, 123, 255, 0.15) 100%);
                    border-radius: 50%;
                    filter: blur(60px);
                    z-index: 0;
                }
                .hero-main-img { 
                    max-height: 75vh; 
                    position: relative;
                    z-index: 1;
                    filter: drop-shadow(0px 20px 40px rgba(0,0,0,0.15));
                }
                .floating-hero { 
                    animation: floating 6s ease-in-out infinite; 
                }
                @keyframes floating { 
                    0%, 100% { transform: translateY(0px) rotate(0deg); } 
                    50% { transform: translateY(-25px) rotate(2deg); } 
                }

                /* Enhanced Carousel Navigation */
                .carousel-navigation {
                    position: absolute;
                    bottom: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 30px;
                    z-index: 100;
                }
                .carousel-dots {
                    display: flex;
                    gap: 12px;
                }
                .carousel-dots .dot {
                    width: 14px;
                    height: 14px;
                    background: transparent;
                    border: 2px solid rgba(0,0,0,0.3);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    padding: 0;
                    position: relative;
                    overflow: hidden;
                }
                .carousel-dots .dot:hover {
                    transform: scale(1.3);
                    border-color: #17a2b8;
                }
                .carousel-dots .dot.active {
                    width: 40px;
                    border-radius: 8px;
                    background: linear-gradient(90deg, #17a2b8 0%, #138496 100%);
                    border-color: #17a2b8;
                }
                .dot-inner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 6px;
                    height: 6px;
                    background: #17a2b8;
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                .carousel-dots .dot:hover .dot-inner { opacity: 1; }
                
                .carousel-counter {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 700;
                    color: #333;
                    font-size: 16px;
                }
                .carousel-counter .current {
                    font-size: 24px;
                    color: #17a2b8;
                }
                .carousel-counter .separator {
                    color: #ccc;
                }
                .carousel-counter .total {
                    font-size: 14px;
                    color: #999;
                }
                
                /* === EDITORIAL SECTION === */
                .editorial-heading { font-size: 3rem; }
                .editorial-subtitle { font-size: 12px; }
                .story-img { min-height: 400px; filter: brightness(0.9); }
                .story-title { font-size: 3rem; }
                .story-btn { font-size: 13px; }
                .kids-title { font-size: 3rem; }
                .kids-img { 
                    height: 110%; 
                    left: 50%; 
                    top: 50%; 
                    transform: translate(-50%, -50%) rotate(-5deg); 
                }

                /* === PRODUCT SHOWCASE === */
                .product-showcase-section {
                    background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
                }
                .showcase-badge {
                    font-size: 11px;
                    padding: 6px 18px;
                    background: rgba(23, 162, 184, 0.1);
                    border-radius: 20px;
                    border: 1px solid rgba(23, 162, 184, 0.2);
                }
                .product-showcase-title { 
                    font-size: 3.5rem; 
                    line-height: 1;
                    letter-spacing: -1px;
                }
                .showcase-subtitle {
                    font-size: 15px;
                    max-width: 600px;
                    line-height: 1.6;
                    color: #6c757d;
                }
                
                /* Product Cards */
                .product-img-container { 
                    aspect-ratio: 4/5; 
                    background: #ffffff;
                    position: relative; 
                    padding: 0;
                    overflow: hidden;
                    height: clamp(190px, 22vw, 240px);
                }
                .img-holder { height: auto; position: relative; overflow: hidden; }
                .product-link { display: block; position: relative; }
                .luxury-image { 
                    transition: 0.6s ease-in-out;
                    width: 100%;
                    height: 100%;
                    object-position: center center;
                    object-fit: cover;
                    display: block;
                }
                .image-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.03) 100%);
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .fashion-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid #e9ecef;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                    position: relative;
                    overflow: hidden;
                }
                .fashion-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -60%;
                    width: 40%;
                    height: 100%;
                    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent);
                    transform: skewX(-12deg);
                    opacity: 0;
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    pointer-events: none;
                }
                .fashion-card:hover {
                    transform: translateY(-12px);
                    box-shadow: 0 25px 50px rgba(0,0,0,0.15);
                    border-color: #17a2b8;
                }
                .fashion-card:hover::after {
                    left: 120%;
                    opacity: 1;
                }
                .fashion-card:hover .luxury-image { transform: none; }
                .fashion-card:hover .image-overlay { opacity: 1; }
                
                /* Product Badges */
                .product-badges {
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 5;
                }
                .lux-tag { 
                    padding: 6px 12px; 
                    font-weight: 700; 
                    font-size: 11px; 
                    border-radius: 6px; 
                    letter-spacing: 0.5px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    backdrop-filter: blur(10px);
                }
                .discount-tag {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                    color: #fff;
                }
                .new-tag {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    color: #fff;
                }
                
                /* Action Buttons */
                .action-layer {
                    position: absolute; 
                    bottom: 0; 
                    left: 0; 
                    width: 100%;
                    background: rgba(255,255,255,0.95); 
                    backdrop-filter: blur(15px);
                    padding: 18px; 
                    display: flex; 
                    justify-content: center; 
                    gap: 12px; 
                    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 -5px 20px rgba(0,0,0,0.1);
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(10px);
                }
                .fashion-card:hover .action-layer {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0);
                    animation: wishlistPop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes wishlistPop {
                    0% { opacity: 0; transform: translateY(10px) scale(0.98); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .p-icon-btn { 
                    width: 44px; 
                    height: 44px; 
                    border-radius: 50%; 
                    border: 2px solid #e9ecef; 
                    background: #fff; 
                    color: #333; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
                    cursor: pointer;
                    font-size: 16px;
                }
                .p-icon-btn:hover { 
                    background: #17a2b8; 
                    color: #fff; 
                    transform: scale(1.15) rotate(10deg); 
                    border-color: #17a2b8;
                }
                .btn-wishlist:hover {
                    background: #ff6b6b;
                    border-color: #ff6b6b;
                }
                
                /* Product Details */
                .product-brand { 
                    font-size: 10px; 
                    letter-spacing: 1.4px;
                    color: #17a2b8;
                    font-weight: 800;
                }
                .product-rating-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .rating-stars { 
                    color: #f5b301; 
                    font-size: 12px; 
                    letter-spacing: -1px;
                    font-weight: 700;
                }
                .rating-text { 
                    font-size: 10px; 
                    font-weight: 700;
                    color: #6c757d;
                }
                .product-name { 
                    font-size: 15px; 
                    line-height: 1.35;
                    font-weight: 800;
                    letter-spacing: -0.2px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .product-category {
                    font-size: 12px;
                    line-height: 1.3;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                }
                
                /* Product Features */
                .product-features {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .feature-badge {
                    padding: 4px 10px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 15px;
                    font-size: 10px;
                    font-weight: 600;
                    color: #6c757d;
                    text-transform: uppercase;
                }
                .stock-badge {
                    background: #d4edda;
                    border-color: #c3e6cb;
                    color: #155724;
                }
                
                /* Price Section */
                .price-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .product-price { 
                    font-size: 20px; 
                    font-weight: 800;
                    color: #000;
                    letter-spacing: -0.5px;
                }
                .product-old-price { 
                    font-size: 14px; 
                    font-weight: 500;
                }
                .save-badge {
                    padding: 3px 8px;
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    color: #155724;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: 700;
                }
                
                /* Add to Cart Button - Enhanced */
                .btn-add-cart {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 14px 16px;
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    min-height: 48px;
                }
                .btn-add-cart:hover {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(23, 162, 184, 0.3);
                }
                .btn-add-cart.size-not-selected {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btn-add-cart.size-not-selected:hover {
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    transform: none;
                    box-shadow: none;
                }
                .btn-icon {
                    font-size: 18px;
                    font-weight: 300;
                }
                
                /* Product Size Selector */
                .product-size-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                /* Product Image Premium Styling */
                .product-img-container { position: relative; }
                .product-img-container::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%);
                    opacity: 0;
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    pointer-events: none;
                }
                .fashion-card:hover .product-img-container::after { opacity: 1; }
                .luxury-image {
                    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .fashion-card:hover .luxury-image {
                    transform: scale(1.08);
                    filter: brightness(1.03);
                }

                /* Product Feature Highlights */
                .product-feature-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .feature-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 14px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    color: #17a2b8;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.12) 0%, rgba(23, 162, 184, 0.05) 100%);
                    border: 1px solid rgba(23, 162, 184, 0.25);
                    line-height: 1;
                }
                .feature-chip.solid {
                    color: #111;
                    background: #f7f7f7;
                    border-color: #ececec;
                }
                .feature-chip.soft {
                    color: #6f42c1;
                    background: linear-gradient(135deg, rgba(111, 66, 193, 0.12) 0%, rgba(111, 66, 193, 0.05) 100%);
                    border-color: rgba(111, 66, 193, 0.25);
                }
                .feature-chip.success {
                    color: #28a745;
                    background: linear-gradient(135deg, rgba(40, 167, 69, 0.12) 0%, rgba(40, 167, 69, 0.05) 100%);
                    border-color: rgba(40, 167, 69, 0.25);
                }
                
                /* Other Styles */
                .story-overlay { position: absolute; top:0; left:0; width: 100%; height: 100%; background: linear-gradient(transparent 30%, rgba(0,0,0,0.9)); }
                .story-overlay-light { position: absolute; top:0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.25); }
                .btn-white { background: #fff; border: none; color: #000; }
                .hover-info:hover { color: #17a2b8 !important; }
                .no-underline { text-decoration: none; }
                .shadow-hover:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.12) !important; }

                /* 📱 MOBILE RESPONSIVE */
                @media (max-width: 991px) {
                    .luxury-hero { height: auto; min-height: 550px; padding: 80px 0 100px; }
                    .hero-title { font-size: 3.5rem; line-height: 1; }
                    .hero-subtitle { font-size: 10px; letter-spacing: 2px; }
                    .hero-description { font-size: 14px; margin-bottom: 25px; }
                    .hero-text-section { margin-bottom: 40px; }
                    .hero-image-section { display: block !important; }
                    .hero-main-img { max-height: 55vh; }
                    .btn-luxury-primary { padding: 14px 35px; font-size: 13px; }
                    
                    .carousel-navigation { bottom: 30px; gap: 20px; }
                    .carousel-dots .dot { width: 12px; height: 12px; }
                    .carousel-dots .dot.active { width: 35px; }
                    .carousel-counter .current { font-size: 20px; }
                    
                    .hero-decoration-1, .hero-decoration-2 { display: none; }
                    
                    .editorial-heading { font-size: 2.2rem; }
                    .editorial-subtitle { font-size: 10px; }
                    .story-img { min-height: 320px; }
                    .story-title { font-size: 2.2rem; }
                    .story-btn { font-size: 11px; padding: 10px 30px !important; }
                    .kids-title { font-size: 2rem; }
                    .kids-img { height: 90%; right: -10px; bottom: -20px; }
                    
                    .product-showcase-title { font-size: 2.5rem; }
                    .showcase-subtitle { font-size: 14px; }
                    .product-img-container { aspect-ratio: 4/5; height: clamp(170px, 32vw, 220px); }
                    .action-layer { padding: 12px; gap: 10px; }
                    .p-icon-btn { width: 38px; height: 38px; font-size: 14px; }
                    .product-brand { font-size: 9px; }
                    .product-rating { font-size: 10px; }
                    .product-name { font-size: 13px; }
                    .product-price { font-size: 18px; }
                    .product-old-price { font-size: 13px; }
                    .fashion-card:hover { transform: translateY(-6px); }
                    
                    .feature-chip { font-size: 9px; padding: 3px 8px; }
                }

                @media (max-width: 575px) {
                    .luxury-hero { min-height: 500px; padding: 60px 0 90px; }
                    .hero-badge { padding: 6px 15px; }
                    .badge-icon { font-size: 14px; }
                    .hero-title { font-size: 2.5rem; }
                    .hero-subtitle { font-size: 9px; letter-spacing: 2px; }
                    .hero-description { font-size: 13px; line-height: 1.6; }
                    .btn-luxury-primary { padding: 12px 30px; font-size: 12px; }
                    .btn-luxury-secondary { font-size: 12px; }
                    .hero-main-img { max-height: 45vh; }
                    
                    .carousel-navigation { bottom: 20px; gap: 15px; flex-wrap: wrap; }
                    .carousel-dots { gap: 8px; }
                    .carousel-dots .dot { width: 10px; height: 10px; }
                    .carousel-dots .dot.active { width: 30px; }
                    .carousel-counter { font-size: 14px; }
                    .carousel-counter .current { font-size: 18px; }
                    
                    .editorial-heading { font-size: 1.8rem; }
                    .story-img { min-height: 280px; }
                    .story-title { font-size: 1.8rem; }
                    .kids-title { font-size: 1.6rem; }
                    
                    .showcase-badge { font-size: 10px; padding: 5px 14px; }
                    .product-showcase-title { font-size: 2rem; }
                    .showcase-subtitle { font-size: 13px; }
                    .product-img-container { height: clamp(160px, 48vw, 210px); }
                    .product-name { font-size: 12px; }
                    .product-category { font-size: 11px; }
                    .product-price { font-size: 16px; }
                    .product-old-price { font-size: 12px; }
                    .lux-tag { font-size: 10px; padding: 5px 10px; }
                    .feature-badge { font-size: 9px; padding: 3px 8px; }
                    .save-badge { font-size: 9px; }
                    .fashion-card:hover { transform: translateY(-4px); }
                    .feature-chip { font-size: 8px; padding: 3px 7px; }
                }

                @media (max-width: 375px) {
                    .hero-title { font-size: 2rem; }
                    .carousel-navigation { gap: 12px; }
                    .product-img-container { aspect-ratio: 4/5; }
                    .product-showcase-title { font-size: 1.75rem; }
                }
            `}} />
        </div>
    )
}