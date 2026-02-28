import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import { getWishlist, addWishlist } from '../Store/ActionCreaters/WishlistActionCreators'; // Wishlist actions added
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrl, optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

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
            img: "/assets/images/CR-3.png", 
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
                                            loading="eager"
                                            fetchPriority="high"
                                            decoding="async"
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
                                <img src="/assets/images/choose-1.jpg" className="w-100 h-100 object-cover story-img" alt="Manifesto" loading="eager" decoding="async" />
                                <div className="story-overlay p-4 p-md-5 d-flex flex-column justify-content-end">
                                    <h3 className="text-white font-weight-bold mb-3 story-title">MANIFESTO<br/>MAN</h3>
                                    <Link to="/shop/Male" className="btn btn-outline-light rounded-0 px-4 px-md-5 font-weight-bold ls-2 story-btn">EXPLORE SHOP</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="d-flex flex-column h-100">
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl shadow-lg overflow-hidden position-relative mb-3 mb-md-4" style={{ flex: 1, minHeight: '250px' }}>
                                    <img src="/assets/images/CR-1.png" className="w-100 h-100 object-cover opacity-75 story-img" alt="Woman" loading="eager" decoding="async" />
                                    <div className="story-overlay-light p-4 p-md-5">
                                        <h3 className="h2 h1-md text-white font-weight-bold mb-0">ELEGANT<br/>MODERN</h3>
                                        <Link to="/shop/Female" className="text-white font-weight-bold border-bottom pb-1 small mt-2 d-inline-block">VIEW DETAILS</Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{ scale: 0.99 }} className="story-card rounded-3xl bg-info shadow-lg p-4 p-md-5 position-relative overflow-hidden" style={{ flex: 1, minHeight: '250px' }}>
                                    <div className="story-overlay-kids position-absolute" style={{top:0, left:0, width:'100%', height:'100%'}}></div>
                                    <div className="position-relative z-index-10 text-white">
                                        <h4 className="font-weight-bold ls-2 small mb-2 opacity-75 uppercase">Exclusives</h4>
                                        <motion.h2 
                                            className="font-weight-bold kids-title kids-title-white"
                                            initial={{ opacity: 0.8 }}
                                            whileHover={{ opacity: 1, textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                                        >
                                            KIDS LAB
                                        </motion.h2>
                                        <Link to="/shop/Kids" className="btn btn-white btn-sm px-4 font-weight-bold rounded-pill mt-3 shadow-sm">DISCOVER ALL</Link>
                                    </div>
                                    <img src="/assets/images/kids3.png" className="position-absolute kids-img" alt="" loading="lazy" decoding="async"/>
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
                                                        src={optimizeCloudinaryUrlAdvanced(item.pic1, { maxWidth: 700, crop: 'fill' })} 
                                                        loading="lazy" 
                                                        decoding="async"
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
                    min-height: 700px; 
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                }
                .hero-slide-container { 
                    position: relative; 
                    width: 100%; 
                    height: 100%;
                    display: flex;
                    align-items: center;
                    padding: 60px 0;
                }
                
                /* Decorative Floating Elements */
                .hero-decoration-1, .hero-decoration-2 {
                    position: absolute;
                    border-radius: 50%;
                    opacity: 0.08;
                    pointer-events: none;
                    z-index: 1;
                }
                .hero-decoration-1 {
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, #17a2b8 0%, transparent 70%);
                    top: -250px;
                    right: -150px;
                    animation: float1 20s ease-in-out infinite;
                }
                .hero-decoration-2 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, #007bff 0%, transparent 70%);
                    bottom: -200px;
                    left: -150px;
                    animation: float2 15s ease-in-out infinite;
                }
                @keyframes float1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-50px, 50px); } }
                @keyframes float2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(50px, -50px); } }
                
                /* Hero Badge */
                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 24px;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.12) 0%, rgba(23, 162, 184, 0.06) 100%);
                    border-radius: 40px;
                    border: 2px solid rgba(23, 162, 184, 0.35);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 8px 24px rgba(23, 162, 184, 0.1);
                    margin-bottom: 20px;
                }
                .badge-icon { font-size: 20px; animation: pulse 2s ease-in-out infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .hero-subtitle { 
                    font-size: 12px; 
                    font-weight: 800; 
                    letter-spacing: 1.5px;
                    color: #17a2b8;
                }
                
                /* Hero Title */
                .hero-title { 
                    font-size: 5.5rem; 
                    line-height: 1.1; 
                    margin: 30px 0 35px 0;
                    letter-spacing: -1px;
                    font-weight: 900;
                }
                .hero-title-gradient {
                    background: linear-gradient(135deg, #0a0a0a 0%, #17a2b8 50%, #007bff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                /* Hero Description */
                .hero-description {
                    font-size: 17px;
                    line-height: 1.8;
                    max-width: 520px;
                    font-weight: 500;
                    color: #5a6c7d;
                    margin-bottom: 40px;
                    letter-spacing: 0.3px;
                }
                
                /* Hero Section with spacing */
                .hero-text-section {
                    padding-left: 40px;
                    padding-right: 60px;
                }
                
                /* Hero Buttons */
                .hero-actions { 
                    margin-top: 45px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 25px;
                    align-items: center;
                }
                .btn-luxury-primary { 
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    color: #fff; 
                    padding: 18px 45px; 
                    font-weight: 800; 
                    font-size: 15px;
                    border-radius: 50px; 
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
                    box-shadow: 0 12px 40px rgba(0,0,0,0.2); 
                    text-decoration: none;
                    letter-spacing: 1.2px;
                    position: relative;
                    overflow: hidden;
                }
                .btn-luxury-primary::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }
                .btn-luxury-primary:hover::before {
                    left: 100%;
                }
                .btn-luxury-primary:hover { 
                    transform: translateY(-5px); 
                    box-shadow: 0 18px 50px rgba(0,0,0,0.3); 
                    gap: 18px;
                    color: #fff;
                }
                .btn-arrow { 
                    font-size: 22px; 
                    transition: all 0.4s;
                    display: inline-block;
                }
                
                .btn-luxury-secondary {
                    display: inline-flex;
                    align-items: center;
                    color: #0a0a0a;
                    font-weight: 700;
                    font-size: 15px;
                    text-decoration: none;
                    position: relative;
                    padding-bottom: 6px;
                    letter-spacing: 0.8px;
                    transition: all 0.3s;
                }
                .btn-luxury-secondary:hover { 
                    color: #17a2b8;
                    transform: translateY(-2px);
                }
                .btn-underline {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #17a2b8 0%, #007bff 100%);
                    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .btn-luxury-secondary:hover .btn-underline { 
                    width: 100%;
                }
                
                /* Hero Image */
                .hero-img-wrapper {
                    position: relative;
                    display: inline-block;
                }
                .hero-img-backdrop {
                    position: absolute;
                    width: 85%;
                    height: 85%;
                    top: 7.5%;
                    left: 7.5%;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.25) 0%, rgba(0, 123, 255, 0.2) 100%);
                    border-radius: 50%;
                    filter: blur(70px);
                    z-index: 0;
                    animation: pulse-backdrop 4s ease-in-out infinite;
                }
                @keyframes pulse-backdrop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .hero-main-img { 
                    max-height: 75vh; 
                    position: relative;
                    z-index: 1;
                    filter: drop-shadow(0px 25px 50px rgba(0,0,0,0.2));
                }
                .floating-hero { 
                    animation: floating 6s ease-in-out infinite; 
                }
                @keyframes floating { 
                    0%, 100% { transform: translateY(0px) rotate(0deg); } 
                    50% { transform: translateY(-30px) rotate(2deg); } 
                }

                /* Enhanced Carousel Navigation */
                .carousel-navigation {
                    position: absolute;
                    bottom: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 50px;
                    z-index: 100;
                    background: rgba(255, 255, 255, 0.8);
                    padding: 20px 40px;
                    border-radius: 50px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(23, 162, 184, 0.2);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }
                .carousel-dots {
                    display: flex;
                    gap: 14px;
                    align-items: center;
                }
                .carousel-dots .dot {
                    width: 14px;
                    height: 14px;
                    background: transparent;
                    border: 2.5px solid rgba(0,0,0,0.25);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    padding: 0;
                    position: relative;
                    overflow: hidden;
                }
                .carousel-dots .dot:hover {
                    transform: scale(1.4);
                    border-color: #17a2b8;
                    background: rgba(23, 162, 184, 0.1);
                }
                .carousel-dots .dot.active {
                    width: 45px;
                    border-radius: 8px;
                    background: linear-gradient(90deg, #17a2b8 0%, #0dafcc 100%);
                    border-color: #17a2b8;
                    box-shadow: 0 4px 15px rgba(23, 162, 184, 0.4);
                }
                .dot-inner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 6px;
                    height: 6px;
                    background: #fff;
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .carousel-dots .dot.active .dot-inner { 
                    opacity: 1;
                }
                
                .carousel-counter {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 800;
                    color: #0a0a0a;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.1) 0%, rgba(0, 123, 255, 0.1) 100%);
                    padding: 8px 16px;
                    border-radius: 30px;
                    border: 1px solid rgba(23, 162, 184, 0.2);
                }
                .carousel-counter .current {
                    font-size: 16px;
                    color: #17a2b8;
                    font-weight: 900;
                    letter-spacing: 1px;
                }
                .carousel-counter .separator {
                    color: rgba(0,0,0,0.2);
                    font-weight: 400;
                }
                .carousel-counter .total {
                    font-size: 14px;
                    color: #999;
                    font-weight: 600;
                }
                
                /* === EDITORIAL SECTION === */
                .editorial-heading { font-size: 3rem; }
                .editorial-subtitle { font-size: 12px; }
                .story-img { min-height: 400px; filter: brightness(0.9); }
                .story-title { font-size: 3rem; }
                .story-btn { font-size: 13px; }
                .kids-title { font-size: 3rem; }
                .kids-title-white { 
                    color: #ffffff !important; 
                    letter-spacing: 2px; 
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    font-weight: 900;
                    transition: text-shadow 0.3s ease;
                }
                .kids-title-white:hover {
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
                }
                .kids-img { 
                    height: 110%; 
                    left: 50%; 
                    top: 50%; 
                    transform: translate(-50%, -50%) rotate(-5deg); 
                }

                /* === PRODUCT SHOWCASE === */
                .product-showcase-section {
                    background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
                    padding: 80px 0 100px !important;
                }
                .showcase-badge {
                    font-size: 12px;
                    padding: 10px 24px;
                    background: linear-gradient(135deg, rgba(23, 162, 184, 0.12) 0%, rgba(23, 162, 184, 0.06) 100%);
                    border-radius: 25px;
                    border: 2px solid rgba(23, 162, 184, 0.3);
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(23, 162, 184, 0.1);
                }
                .product-showcase-title { 
                    font-size: 3.8rem; 
                    line-height: 1.05;
                    letter-spacing: -0.5px;
                    margin: 30px 0 25px 0 !important;
                    font-weight: 900;
                }
                .showcase-subtitle {
                    font-size: 16px;
                    max-width: 700px;
                    line-height: 1.8;
                    color: #6c757d;
                    margin-bottom: 50px !important;
                    font-weight: 500;
                }
                
                /* Product Cards */
                .product-img-container { 
                    aspect-ratio: 4/5; 
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    position: relative; 
                    padding: 0;
                    overflow: hidden;
                    height: clamp(200px, 24vw, 280px);
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }
                .img-holder { height: auto; position: relative; overflow: hidden; border-radius: 12px; }
                .product-link { display: block; position: relative; }
                .luxury-image { 
                    transition: 0.7s ease-in-out;
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
                    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.05) 100%);
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .fashion-card {
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1.5px solid rgba(23, 162, 184, 0.1);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    background: #fff;
                }
                .fashion-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -60%;
                    width: 40%;
                    height: 100%;
                    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent);
                    transform: skewX(-12deg);
                    opacity: 0;
                    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
                    pointer-events: none;
                }
                .fashion-card:hover {
                    transform: translateY(-18px) scale(1.01);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.18);
                    border-color: rgba(23, 162, 184, 0.4);
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
                    top: 18px;
                    left: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 5;
                }
                .lux-tag { 
                    padding: 8px 16px; 
                    font-weight: 800; 
                    font-size: 12px; 
                    border-radius: 8px; 
                    letter-spacing: 0.7px;
                    box-shadow: 0 6px 15px rgba(0,0,0,0.2);
                    backdrop-filter: blur(12px);
                    transition: all 0.3s;
                }
                .discount-tag {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                    color: #fff;
                }
                .discount-tag:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(255, 107, 107, 0.3);
                }
                .new-tag {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    color: #fff;
                }
                .new-tag:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(23, 162, 184, 0.3);
                }
                
                /* Action Buttons */
                .action-layer {
                    position: absolute; 
                    bottom: 0; 
                    left: 0; 
                    width: 100%;
                    background: rgba(255,255,255,0.98); 
                    backdrop-filter: blur(20px);
                    padding: 22px; 
                    display: flex; 
                    justify-content: center; 
                    gap: 14px; 
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 -8px 25px rgba(0,0,0,0.12);
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(15px);
                }
                .fashion-card:hover .action-layer {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0);
                    animation: wishlistPop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes wishlistPop {
                    0% { opacity: 0; transform: translateY(15px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .p-icon-btn { 
                    width: 48px; 
                    height: 48px; 
                    border-radius: 50%; 
                    border: 2.5px solid #e9ecef; 
                    background: #fff; 
                    color: #333; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); 
                    cursor: pointer;
                    font-size: 18px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .p-icon-btn:hover { 
                    background: #17a2b8; 
                    color: #fff; 
                    transform: scale(1.2) rotate(12deg); 
                    border-color: #17a2b8;
                    box-shadow: 0 8px 20px rgba(23, 162, 184, 0.35);
                }
                .btn-wishlist:hover {
                    background: #ff6b6b;
                    border-color: #ff6b6b;
                    box-shadow: 0 8px 20px rgba(255, 107, 107, 0.35);
                }
                
                /* Product Details */
                .product-brand { 
                    font-size: 11px; 
                    letter-spacing: 1.6px;
                    color: #17a2b8;
                    font-weight: 900;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .product-rating-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 10px;
                }
                .rating-stars { 
                    color: #f5b301; 
                    font-size: 13px; 
                    letter-spacing: -1px;
                    font-weight: 800;
                }
                .rating-text { 
                    font-size: 11px; 
                    font-weight: 700;
                    color: #6c757d;
                }
                .product-name { 
                    font-size: 16px; 
                    line-height: 1.4;
                    font-weight: 800;
                    letter-spacing: -0.3px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin: 12px 0 10px 0;
                    color: #0a0a0a;
                }
                .product-category {
                    font-size: 13px;
                    line-height: 1.4;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    color: #6c757d;
                    margin-bottom: 8px;
                }
                
                /* Product Features */
                .product-features {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .feature-badge {
                    padding: 5px 12px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border: 1.5px solid #d4d8db;
                    border-radius: 18px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #495057;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }
                .stock-badge {
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    border-color: #b1dfbb;
                    color: #155724;
                    font-weight: 800;
                }
                
                /* Price Section */
                .price-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin: 16px 0 18px 0;
                }
                .product-price { 
                    font-size: 22px; 
                    font-weight: 900;
                    color: #000;
                    letter-spacing: -0.6px;
                }
                .product-old-price { 
                    font-size: 15px; 
                    font-weight: 600;
                    color: #b0b0b0;
                    text-decoration: line-through;
                }
                .save-badge {
                    padding: 5px 10px;
                    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
                    color: #c62828;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                
                /* Add to Cart Button - Enhanced */
                .btn-add-cart {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 100%;
                    padding: 16px 18px;
                    background: linear-gradient(135deg, #000 0%, #2c2c2c 100%);
                    color: #fff;
                    border: none;
                    border-radius: 14px;
                    font-weight: 800;
                    font-size: 15px;
                    letter-spacing: 0.6px;
                    cursor: pointer;
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    min-height: 52px;
                    box-shadow: 0 6px 18px rgba(0,0,0,0.15);
                }
                .btn-add-cart:hover {
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    transform: translateY(-3px);
                    box-shadow: 0 12px 28px rgba(23, 162, 184, 0.35);
                }
                .btn-add-cart.size-not-selected {
                    opacity: 0.55;
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
                .story-overlay-kids { position: absolute; top:0; left:0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(23,162,184,0.15) 0%, rgba(0,0,0,0.35) 100%); z-index: 5; }
                .btn-white { background: #fff; border: none; color: #000; }
                .hover-info:hover { color: #17a2b8 !important; }
                .no-underline { text-decoration: none; }
                .shadow-hover:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.12) !important; }

                /* 📱 MOBILE RESPONSIVE */
                @media (max-width: 991px) {
                    .luxury-hero { height: auto; min-height: 600px; padding: 70px 0 80px; }
                    .hero-text-section { padding-left: 20px; padding-right: 20px; }
                    .hero-title { font-size: 3.5rem; line-height: 1.05; margin: 25px 0 30px 0; }
                    .hero-subtitle { font-size: 11px; letter-spacing: 1.8px; }
                    .hero-description { font-size: 15px; margin-bottom: 30px; line-height: 1.7; }
                    .hero-actions { gap: 20px; margin-top: 35px; }
                    .hero-text-section { margin-bottom: 50px; }
                    .hero-image-section { display: block !important; }
                    .hero-main-img { max-height: 55vh; }
                    .btn-luxury-primary { padding: 16px 38px; font-size: 14px; font-weight: 700; gap: 10px; }
                    
                    .carousel-navigation { bottom: 40px; gap: 40px; padding: 16px 32px; }
                    .carousel-counter { padding: 6px 14px; gap: 6px; }
                    .carousel-counter .current { font-size: 15px; }
                    .carousel-dots { gap: 12px; }
                    .carousel-dots .dot { width: 13px; height: 13px; }
                    .carousel-dots .dot.active { width: 40px; }
                    
                    .hero-decoration-1, .hero-decoration-2 { display: none; }
                    
                    .editorial-heading { font-size: 2.2rem; }
                    .editorial-subtitle { font-size: 10px; }
                    .story-img { min-height: 320px; }
                    .story-title { font-size: 2.2rem; }
                    .story-btn { font-size: 11px; padding: 10px 30px !important; }
                    .kids-title { font-size: 2rem; }
                    .kids-img { height: 90%; right: -10px; bottom: -20px; }
                    
                    .product-showcase-title { font-size: 2.8rem; margin: 25px 0 20px 0; }
                    .showcase-subtitle { font-size: 15px; margin-bottom: 40px; }
                    .product-img-container { aspect-ratio: 4/5; height: clamp(180px, 28vw, 240px); border-radius: 10px; }
                    .action-layer { padding: 16px; gap: 12px; }
                    .p-icon-btn { width: 42px; height: 42px; font-size: 16px; }
                    .product-brand { font-size: 10px; margin-bottom: 6px; }
                    .product-rating-wrapper { gap: 5px; margin-bottom: 8px; }
                    .rating-stars { font-size: 12px; }
                    .product-name { font-size: 14px; margin: 10px 0 8px 0; }
                    .product-category { font-size: 12px; margin-bottom: 6px; }
                    .product-price { font-size: 20px; }
                    .product-old-price { font-size: 13px; }
                    .price-group { margin: 12px 0 14px 0; }
                    .btn-add-cart { padding: 14px 16px; font-size: 14px; min-height: 48px; }
                    .feature-badge { padding: 4px 10px; font-size: 10px; }
                    .fashion-card:hover { transform: translateY(-10px) scale(1.005); }
                    
                    .feature-chip { font-size: 9px; padding: 3px 8px; }
                }

                @media (max-width: 575px) {
                    .luxury-hero { min-height: 520px; padding: 60px 0 70px; }
                    .hero-text-section { padding-left: 0; padding-right: 0; }
                    .hero-badge { padding: 8px 16px; gap: 8px; }
                    .badge-icon { font-size: 16px; }
                    .hero-title { font-size: 2.6rem; line-height: 1.08; margin: 20px 0 25px 0; }
                    .hero-subtitle { font-size: 10px; letter-spacing: 1.5px; font-weight: 800; }
                    .hero-description { font-size: 14px; line-height: 1.7; margin-bottom: 25px; }
                    .btn-luxury-primary { padding: 14px 32px; font-size: 13px; font-weight: 700; gap: 8px; }
                    .btn-luxury-secondary { font-size: 13px; font-weight: 700; }
                    .hero-main-img { max-height: 45vh; }
                    .hero-actions { gap: 16px; margin-top: 28px; }
                    
                    .carousel-navigation { bottom: 25px; gap: 30px; padding: 14px 24px; border-radius: 40px; }
                    .carousel-dots { gap: 10px; }
                    .carousel-dots .dot { width: 11px; height: 11px; }
                    .carousel-dots .dot.active { width: 35px; }
                    .carousel-counter { padding: 5px 12px; gap: 5px; font-size: 13px; }
                    .carousel-counter .current { font-size: 14px; }
                    .carousel-counter .separator { font-size: 12px; }
                    .carousel-counter .total { font-size: 12px; }
                    
                    .editorial-heading { font-size: 1.8rem; }
                    .story-img { min-height: 280px; }
                    .story-title { font-size: 1.8rem; }
                    .kids-title { font-size: 1.6rem; }
                    
                    .product-showcase-section { padding: 60px 0 80px !important; }
                    .showcase-badge { font-size: 11px; padding: 8px 18px; }
                    .product-showcase-title { font-size: 2.2rem; margin: 20px 0 18px 0; }
                    .showcase-subtitle { font-size: 14px; margin-bottom: 35px; }
                    .product-img-container { height: clamp(160px, 50vw, 220px); border-radius: 10px; }
                    .action-layer { padding: 14px; gap: 10px; }
                    .p-icon-btn { width: 40px; height: 40px; font-size: 15px; }
                    .product-brand { font-size: 10px; }
                    .product-name { font-size: 13px; margin: 8px 0 6px 0; }
                    .product-category { font-size: 11px; margin-bottom: 5px; }
                    .product-price { font-size: 18px; }
                    .product-old-price { font-size: 12px; }
                    .price-group { gap: 8px; margin: 10px 0 12px 0; }
                    .btn-add-cart { padding: 13px 14px; font-size: 13px; min-height: 46px; gap: 8px; border-radius: 12px; }
                    .lux-tag { font-size: 10px; padding: 6px 12px; }
                    .feature-badge { font-size: 9px; padding: 4px 10px; }
                    .save-badge { font-size: 9px; padding: 4px 8px; }
                    .fashion-card:hover { transform: translateY(-8px) scale(1.002); }
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