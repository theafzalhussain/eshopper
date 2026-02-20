import React, { useEffect } from 'react'
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';
import { motion } from 'framer-motion'; // For smooth animations

export default function Home() {
    var product = useSelector((state) => state.ProductStateData)
    let displayProducts = [...product].reverse().slice(0, 8)

    var dispatch = useDispatch()
    function getAPIData() {
        dispatch(getProduct())
    }

    useEffect(() => {
        getAPIData()
    }, [product.length])

    // Animation Variants
    const fadeInUp = {
        initial: { y: 60, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div style={{ overflowX: 'hidden' }}>
            {/* --- HERO SECTION: MODERN & SLICK --- */}
            <section id="home-section" className="hero">
                <div id="carouselExampleFade" className="carousel slide carousel-fade" data-ride="carousel" data-interval="5000">
                    <div className="carousel-inner">
                        <div className="carousel-item active" style={{ height: '90vh', background: 'linear-gradient(45deg, #f3f3f3, #ffffff)' }}>
                            <div className="container h-100">
                                <div className="row h-100 align-items-center">
                                    <motion.div className="col-md-6" initial="initial" animate="animate" variants={fadeInUp}>
                                        <span className="text-uppercase font-weight-bold text-info" style={{ letterSpacing: '5px' }}>#New Collection 2024</span>
                                        <h1 className="display-3 font-weight-bold text-dark mb-4">Elevate Your <br/><span className="text-info">Style</span></h1>
                                        <p className="lead mb-5">Experience luxury and comfort with our handpicked premium collection.</p>
                                        <Link to="/shop/All" className="btn btn-info btn-lg px-5 py-3 rounded-pill shadow-lg">Shop Now</Link>
                                    </motion.div>
                                    <div className="col-md-6 text-center">
                                        <motion.img 
                                            initial={{ scale: 0.8, opacity: 0 }} 
                                            animate={{ scale: 1, opacity: 1 }} 
                                            transition={{ duration: 0.8 }}
                                            src="/assets/images/banner-1.png" className="img-fluid hero-img" alt="Banner" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Repeat for other slides... */}
                    </div>
                </div>
            </section>

            {/* --- TRUST BADGES: GLASSMORPHISM STYLE --- */}
            <section className="py-5" style={{ background: '#f8f9fa' }}>
                <div className="container">
                    <div className="row">
                        {[
                            { icon: "flaticon-bag", title: "Free Shipping", desc: "On all orders above ₹999" },
                            { icon: "flaticon-heart-box", title: "Premium Quality", desc: "Best-in-class materials" },
                            { icon: "flaticon-payment-security", title: "Secure Payment", desc: "100% protected payments" }
                        ].map((item, i) => (
                            <motion.div key={i} className="col-lg-4 mb-4" whileHover={{ y: -10 }}>
                                <div className="p-4 text-center bg-white shadow-sm border-0 rounded-lg h-100 transition">
                                    <div className="icon mb-3"><span className={`${item.icon} h1 text-info`}></span></div>
                                    <h5 className="font-weight-bold">{item.title}</h5>
                                    <p className="text-muted small">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- LATEST PRODUCTS: PREMIUM GRID --- */}
            <section className="py-5">
                <div className="container">
                    <div className="row justify-content-center mb-5">
                        <motion.div className="col-md-7 text-center" initial="initial" whileInView="animate" variants={fadeInUp}>
                            <h2 className="display-4 font-weight-bold">Trending Now</h2>
                            <div className="mx-auto bg-info" style={{ height: '3px', width: '80px' }}></div>
                        </motion.div>
                    </div>
                    <div className="row">
                        {displayProducts.map((item, index) => (
                            <motion.div 
                                key={index} 
                                className="col-sm-12 col-md-6 col-lg-3 mb-5"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -10 }}
                            >
                                <div className="product-card border-0 shadow-sm overflow-hidden bg-white h-100 position-relative" style={{ borderRadius: '15px' }}>
                                    <Link to={`/single-product/${item.id}`} className="img-prod d-block overflow-hidden">
                                        <img className="img-fluid transition-all" src={item.pic1} style={{ height: "320px", width: "100%", objectFit: "cover" }} alt={item.name} />
                                        {item.discount > 0 && (
                                            <span className="position-absolute top-0 left-0 bg-danger text-white px-3 py-1 m-2 rounded-pill small">
                                                {item.discount}% OFF
                                            </span>
                                        )}
                                        <div className="overlay-btn d-flex align-items-center justify-content-center">
                                            <span className="btn btn-white btn-sm px-4 rounded-pill font-weight-bold shadow">Quick View</span>
                                        </div>
                                    </Link>
                                    <div className="p-3 text-center">
                                        <h3 className="h6 mb-2"><Link to={`/single-product/${item.id}`} className="text-dark font-weight-bold">{item.name}</Link></h3>
                                        <div className="d-flex justify-content-center align-items-center mb-3">
                                            <span className="text-info font-weight-bold h5 mb-0">₹{item.finalprice}</span>
                                            <del className="ml-2 text-muted small">₹{item.baseprice}</del>
                                        </div>
                                        <button onClick={() => window.location.href=`/single-product/${item.id}`} className="btn btn-outline-info btn-sm btn-block rounded-pill">Add to Cart</button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CATEGORY BANNERS: IMAGE OVERLAY STYLE --- */}
            <section className="pb-5">
                <div className="container-fluid px-md-5">
                    <div className="row">
                        <div className="col-md-4 mb-4">
                            <motion.div whileHover={{ scale: 1.02 }} className="category-banner rounded-lg d-flex align-items-center justify-content-center shadow" style={{ backgroundImage: "url('assets/images/choose-1.jpg')", height: '450px', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                <div className="text-center text-white bg-dark-overlay p-4 w-100">
                                    <h2 className="h1 font-weight-bold">MEN</h2>
                                    <Link to="/shop/Male" className="text-white border-bottom border-white pb-1">Shop Collection</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-4 mb-4">
                            <motion.div whileHover={{ scale: 1.02 }} className="category-banner rounded-lg d-flex align-items-center justify-content-center shadow" style={{ backgroundImage: "url('assets/images/choose-2.jpg')", height: '450px', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                <div className="text-center text-white bg-dark-overlay p-4 w-100">
                                    <h2 className="h1 font-weight-bold">WOMEN</h2>
                                    <Link to="/shop/Female" className="text-white border-bottom border-white pb-1">Shop Collection</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-4 mb-4">
                            <motion.div whileHover={{ scale: 1.02 }} className="category-banner rounded-lg d-flex align-items-center justify-content-center shadow" style={{ backgroundColor: '#111', height: '450px' }}>
                                <div className="text-center text-white p-4">
                                    <span className="text-info font-weight-bold">SPECIAL DEAL</span>
                                    <h2 className="h1 font-weight-bold">KIDS WEAR</h2>
                                    <p className="small">Starting from ₹499</p>
                                    <Link to="/shop/Kids" className="btn btn-info rounded-pill px-4">Buy Now</Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* Custom CSS for extra effects */}
            <style dangerouslySetInnerHTML={{ __html: `
                .bg-dark-overlay { background: rgba(0,0,0,0.3); transition: all 0.3s; }
                .category-banner:hover .bg-dark-overlay { background: rgba(0,0,0,0.5); }
                .product-card:hover img { scale: 1.1; }
                .transition-all { transition: all 0.5s ease-in-out; }
                .overlay-btn {
                    position: absolute; top: 0; left: 0; width: 100%; height: 320px;
                    background: rgba(0,0,0,0.1); opacity: 0; transition: 0.3s;
                }
                .img-prod:hover .overlay-btn { opacity: 1; }
                .hero-img { filter: drop-shadow(20px 20px 30px rgba(0,0,0,0.15)); }
                .rounded-lg { border-radius: 20px !important; }
            `}} />
        </div>
    )
}import React, { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // FAST LOADING LOGIC: Optimize data processing
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
    }, [dispatch])

    // Animation presets
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. LUXURY HERO SECTION --- */}
            <section className="position-relative overflow-hidden" style={{ height: '95vh', background: '#f8f9fa' }}>
                <div id="heroCarousel" className="carousel slide h-100" data-ride="carousel">
                    <div className="carousel-inner h-100">
                        <div className="carousel-item active h-100">
                            <div className="container h-100">
                                <div className="row h-100 align-items-center">
                                    <motion.div 
                                        className="col-lg-6"
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ duration: 0.8 }}
                                    >
                                        <h5 className="text-info font-weight-bold mb-3" style={{ letterSpacing: '4px' }}>ESTABLISHED 2024</h5>
                                        <h1 className="display-2 font-weight-bold text-dark line-height-1 mb-4">
                                            Urban <span className="text-info">Elegance</span>
                                        </h1>
                                        <p className="lead text-muted mb-5 w-75">Discover the intersection of high-fashion and street-style with our latest arrivals.</p>
                                        <div className="d-flex gap-3">
                                            <Link to="/shop/All" className="btn btn-dark btn-lg px-5 py-3 rounded-0 mr-3 shadow-lg hover-up">SHOP COLLECTION</Link>
                                            <Link to="/about" className="btn btn-outline-dark btn-lg px-5 py-3 rounded-0 hover-up">OUR STORY</Link>
                                        </div>
                                    </motion.div>
                                    <div className="col-lg-6 d-none d-lg-block text-right">
                                        <motion.img 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 1 }}
                                            src="/assets/images/bg_1.png" 
                                            className="img-fluid" 
                                            style={{ maxHeight: '80vh', filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.1))' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. PREMIUM FEATURES (ICON SECTION) --- */}
            <section className="py-5 border-bottom">
                <div className="container">
                    <div className="row text-center">
                        {[
                            { icon: "flaticon-bag", title: "EXPRESS DELIVERY", sub: "Worldwide in 3-5 days" },
                            { icon: "flaticon-heart-box", title: "LUXURY PACKAGING", sub: "Premium unboxing experience" },
                            { icon: "flaticon-payment-security", title: "SECURE CHECKOUT", sub: "Encrypted transactions" },
                            { icon: "flaticon-customer-service", title: "24/7 CONCIERGE", sub: "Expert fashion support" }
                        ].map((f, i) => (
                            <div key={i} className="col-md-3 mb-4 mb-md-0">
                                <div className="p-3">
                                    <span className={`${f.icon} h2 text-info mb-3 d-block`}></span>
                                    <h6 className="font-weight-bold mb-1" style={{ letterSpacing: '1px' }}>{f.title}</h6>
                                    <p className="small text-muted">{f.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 3. TRENDING NOW (FAST LOADING GRID) --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-end mb-5">
                        <div>
                            <h2 className="display-4 font-weight-bold mb-0">Trending Now</h2>
                            <p className="text-muted">Handpicked selection of our most loved pieces.</p>
                        </div>
                        <Link to="/shop/All" className="btn btn-link text-dark font-weight-bold text-decoration-none">VIEW ALL PRODUCTS →</Link>
                    </div>

                    <motion.div 
                        className="row"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {displayProducts.length > 0 ? displayProducts.map((item, index) => (
                            <motion.div key={index} className="col-sm-6 col-lg-3 mb-5" variants={itemVariants}>
                                <div className="product-card-luxury group">
                                    <div className="position-relative overflow-hidden rounded-xl bg-light" style={{ height: '350px' }}>
                                        <Link to={`/single-product/${item.id}`}>
                                            <img src={item.pic1} className="w-100 h-100 object-cover transition-slow" alt={item.name} />
                                        </Link>
                                        {item.discount > 0 && (
                                            <span className="premium-tag">-{item.discount}%</span>
                                        )}
                                        <div className="product-actions">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="action-btn shadow-sm" title="Quick View">
                                                <i className="icon-eye"></i>
                                            </button>
                                            <button className="action-btn shadow-sm" title="Add to Wishlist">
                                                <i className="icon-heart"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-3 px-1">
                                        <div className="d-flex justify-content-between small text-muted mb-1">
                                            <span>{item.brand}</span>
                                            <span className="text-warning"><i className="fa fa-star"></i> 4.8</span>
                                        </div>
                                        <h3 className="h6 font-weight-bold mb-2">
                                            <Link to={`/single-product/${item.id}`} className="text-dark hover-info">{item.name}</Link>
                                        </h3>
                                        <div className="d-flex align-items-center">
                                            <span className="h5 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                            <del className="ml-2 text-muted small">₹{item.baseprice}</del>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            // Skeleton Loader for Fast Loading Experience
                            [1,2,3,4].map(n => (
                                <div key={n} className="col-sm-6 col-lg-3 mb-5">
                                    <div className="skeleton-img mb-3"></div>
                                    <div className="skeleton-text w-75 mb-2"></div>
                                    <div className="skeleton-text w-50"></div>
                                </div>
                            ))
                        )}
                    </motion.div>
                </div>
            </section>

            {/* --- 4. BRAND SHOWCASE (MARQUEE EFFECT) --- */}
            <div className="py-5 bg-light overflow-hidden">
                <div className="container">
                    <div className="row align-items-center opacity-50">
                        <div className="col text-center font-weight-bold h4 px-5">GUCCI</div>
                        <div className="col text-center font-weight-bold h4 px-5">ZARA</div>
                        <div className="col text-center font-weight-bold h4 px-5">ADIDAS</div>
                        <div className="col text-center font-weight-bold h4 px-5">NIKE</div>
                        <div className="col text-center font-weight-bold h4 px-5">PRADA</div>
                    </div>
                </div>
            </div>

            {/* --- 5. INTERACTIVE CATEGORY CARDS --- */}
            <section className="py-5 mt-5">
                <div className="container-fluid px-lg-5">
                    <div className="row">
                        <div className="col-md-6 mb-4">
                            <motion.div 
                                whileHover={{ scale: 0.98 }}
                                className="category-card shadow-lg position-relative rounded-xl overflow-hidden" 
                                style={{ backgroundImage: "url('assets/images/choose-1.jpg')", height: '600px', backgroundSize: 'cover' }}
                            >
                                <div className="card-overlay-luxury d-flex flex-column justify-content-end p-5">
                                    <h2 className="text-white display-4 font-weight-bold">Men's<br/>Essentials</h2>
                                    <Link to="/shop/Male" className="btn btn-white rounded-0 px-5 py-3 mt-3 w-max">EXPLORE NOW</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-6">
                            <div className="row">
                                <div className="col-12 mb-4">
                                    <motion.div 
                                        whileHover={{ scale: 0.98 }}
                                        className="category-card shadow-lg position-relative rounded-xl overflow-hidden" 
                                        style={{ backgroundImage: "url('assets/images/choose-2.jpg')", height: '285px', backgroundSize: 'cover' }}
                                    >
                                        <div className="card-overlay-luxury d-flex align-items-center p-5 text-white">
                                            <h2 className="mb-0 font-weight-bold">WOMEN</h2>
                                            <Link to="/shop/Female" className="ml-auto text-white border-bottom border-white">SHOP NOW</Link>
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="col-12">
                                    <motion.div 
                                        whileHover={{ scale: 0.98 }}
                                        className="category-card shadow-lg position-relative rounded-xl overflow-hidden bg-info" 
                                        style={{ height: '285px' }}
                                    >
                                        <div className="p-5 text-white">
                                            <h2 className="font-weight-bold">Kids Collection</h2>
                                            <p className="w-75">Comfortable and stylish clothes for your little ones.</p>
                                            <Link to="/shop/Kids" className="btn btn-light rounded-pill px-4 mt-3">VIEW COLLECTION</Link>
                                        </div>
                                        <img src="/assets/images/banner-3.png" style={{ position:'absolute', bottom:0, right:0, height:'90%', opacity:0.8 }} />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- PREMIUM STYLING --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .line-height-1 { line-height: 1.1; }
                .rounded-xl { border-radius: 30px !important; }
                .object-cover { object-fit: cover; }
                .transition-slow { transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .product-card-luxury:hover img { transform: scale(1.1); }
                .hover-up { transition: 0.3s; }
                .hover-up:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                
                .premium-tag {
                    position: absolute; top: 20px; left: 20px;
                    background: #ff4757; color: white; padding: 5px 15px;
                    font-weight: bold; border-radius: 50px; font-size: 12px;
                }
                
                .product-actions {
                    position: absolute; bottom: 20px; left: 0; right: 0;
                    display: flex; justify-content: center; gap: 10px;
                    transform: translateY(100px); transition: 0.4s;
                }
                .product-card-luxury:hover .product-actions { transform: translateY(0); }
                
                .action-btn {
                    width: 45px; height: 45px; background: white; border: none;
                    border-radius: 50%; color: #333; display: flex; 
                    align-items: center; justify-content: center; transition: 0.3s;
                }
                .action-btn:hover { background: #17a2b8; color: white; }

                .card-overlay-luxury {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
                }

                /* Skeleton Styles for fast loading feel */
                .skeleton-img { height: 350px; background: #eee; border-radius: 20px; animation: pulse 1.5s infinite; }
                .skeleton-text { height: 20px; background: #eee; border-radius: 10px; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                
                .btn-white { background: white; color: black; font-weight: bold; }
                .w-max { width: max-content; }
                .hover-info:hover { color: #17a2b8 !important; text-decoration: none; }
            `}} />
        </div>
    )
}