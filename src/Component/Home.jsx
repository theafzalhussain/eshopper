import React, { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // ⚡ FAST LOADING & OPTIMIZATION: Memoizing data to avoid re-renders
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
    }, [dispatch])

    // --- ANIMATION VARIANTS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
    }

    const itemVariants = {
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
    }

    const heroVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 1, ease: "easeOut" } }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. LUXURY HERO SECTION --- */}
            <section className="hero-wrap" style={{ minHeight: '95vh', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', display: 'flex', alignItems: 'center' }}>
                <div className="container">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-lg-6"
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "backOut" }}
                        >
                            <span className="text-info font-weight-bold mb-3 d-inline-block px-3 py-1 bg-white rounded-pill small shadow-sm" style={{ letterSpacing: '4px' }}>
                                EXCLUSIVE COLLECTION 2024
                            </span>
                            <h1 className="display-2 font-weight-bold text-dark mb-4" style={{ lineHeight: '1' }}>
                                Refined <span className="text-info">Aesthetics</span> For You.
                            </h1>
                            <p className="lead text-muted mb-5 w-75" style={{ fontSize: '1.2rem' }}>
                                Discover the pinnacle of luxury fashion. Curated pieces for those who settle for nothing but the best.
                            </p>
                            <div className="d-flex align-items-center">
                                <Link to="/shop/All" className="btn btn-dark btn-lg px-5 py-3 rounded-0 shadow-lg mr-4 hover-glow">
                                    SHOP NOW
                                </Link>
                                <Link to="/about" className="text-dark font-weight-bold border-bottom border-dark pb-1 text-decoration-none transition">
                                    Our Story
                                </Link>
                            </div>
                        </motion.div>
                        <div className="col-lg-6 d-none d-lg-block">
                            <motion.div 
                                initial="hidden" animate="visible" variants={heroVariants}
                                className="position-relative text-right"
                            >
                                <img src="/assets/images/banner-3.png" className="img-fluid floating-anim" alt="Luxury Model" style={{ maxHeight: '85vh', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.12))' }} />
                                <div className="abstract-shape bg-info opacity-10"></div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. PREMIUM TRUST BADGES (Value Props) --- */}
            <section className="py-5 border-bottom bg-white">
                <div className="container">
                    <div className="row">
                        {[
                            { icon: "flaticon-bag", title: "Express Shipping", sub: "Global delivery in 3 days" },
                            { icon: "flaticon-heart-box", title: "Quality Assured", sub: "Certified premium fabrics" },
                            { icon: "flaticon-payment-security", title: "Safe Checkout", sub: "AES-256 Encrypted" },
                            { icon: "flaticon-customer-service", title: "24/7 Concierge", sub: "Dedicated style experts" }
                        ].map((f, i) => (
                            <div key={i} className="col-md-3 text-center mb-4 mb-md-0 px-4">
                                <motion.div whileHover={{ y: -5 }}>
                                    <span className={`${f.icon} h2 text-info mb-3 d-block`}></span>
                                    <h6 className="font-weight-bold mb-1">{f.title}</h6>
                                    <p className="text-muted x-small text-uppercase mb-0" style={{ fontSize: '10px', letterSpacing: '1px' }}>{f.sub}</p>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 3. TRENDING PRODUCTS (FAST LOADING GRID) --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-end mb-5">
                        <motion.div initial={{opacity:0, x:-20}} whileInView={{opacity:1, x:0}}>
                            <h2 className="display-4 font-weight-bold mb-0">The Trend Report</h2>
                            <p className="text-info font-weight-bold text-uppercase small" style={{letterSpacing:'2px'}}>Top picks of the week</p>
                        </motion.div>
                        <Link to="/shop/All" className="btn btn-link text-dark font-weight-bold text-decoration-none">EXPLORE ALL PRODUCTS →</Link>
                    </div>

                    <motion.div 
                        className="row"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        <AnimatePresence>
                            {displayProducts.length > 0 ? displayProducts.map((item, index) => (
                                <motion.div key={item.id} className="col-sm-6 col-lg-3 mb-5" variants={itemVariants}>
                                    <div className="product-card-premium group">
                                        <div className="img-container rounded-2xl overflow-hidden shadow-sm bg-light">
                                            <Link to={`/single-product/${item.id}`}>
                                                <img src={item.pic1} className="w-100 h-100 object-fit-cover transition-img" alt={item.name} />
                                            </Link>
                                            {item.discount > 0 && <span className="luxury-badge">-{item.discount}%</span>}
                                            <div className="card-actions">
                                                <button onClick={() => navigate(`/single-product/${item.id}`)} className="action-btn-p shadow"><i className="icon-eye"></i></button>
                                                <button className="action-btn-p shadow"><i className="icon-heart"></i></button>
                                                <button onClick={() => navigate(`/single-product/${item.id}`)} className="quick-add-btn shadow">BUY NOW</button>
                                            </div>
                                        </div>
                                        <div className="pt-3 px-1">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-info small font-weight-bold">{item.brand}</span>
                                                <div className="rating small text-warning"><i className="fa fa-star"></i> 4.9</div>
                                            </div>
                                            <h3 className="h6 font-weight-bold mb-2">
                                                <Link to={`/single-product/${item.id}`} className="text-dark-hover">{item.name}</Link>
                                            </h3>
                                            <div className="d-flex align-items-center">
                                                <span className="h5 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                                <del className="ml-3 text-muted small">₹{item.baseprice}</del>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                // Elegant Skeleton Loaders
                                [1,2,3,4].map(n => (
                                    <div key={n} className="col-sm-6 col-lg-3 mb-5">
                                        <div className="skeleton-image rounded-2xl mb-3"></div>
                                        <div className="skeleton-line w-75 mb-2"></div>
                                        <div className="skeleton-line w-50"></div>
                                    </div>
                                ))
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </section>

            {/* --- 4. INTERACTIVE CATEGORY BENTO GRID --- */}
            <section className="py-5 mt-4">
                <div className="container-fluid px-lg-5">
                    <div className="row">
                        <div className="col-md-6 mb-4">
                            <motion.div 
                                whileHover={{ scale: 0.99 }}
                                className="category-box shadow-lg rounded-2xl overflow-hidden position-relative" 
                                style={{ backgroundImage: "url('assets/images/choose-1.jpg')", height: '620px', backgroundSize: 'cover' }}
                            >
                                <div className="category-overlay p-5 d-flex flex-column justify-content-end">
                                    <h2 className="text-white display-3 font-weight-bold mb-3">Modern<br/>Man</h2>
                                    <Link to="/shop/Male" className="btn btn-light rounded-0 px-5 py-3 w-max font-weight-bold">SHOP NOW</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-6">
                            <motion.div 
                                whileHover={{ scale: 0.99 }}
                                className="category-box shadow-lg rounded-2xl overflow-hidden mb-4 position-relative" 
                                style={{ backgroundImage: "url('assets/images/choose-2.jpg')", height: '298px', backgroundSize: 'cover' }}
                            >
                                <div className="category-overlay p-5 d-flex align-items-center">
                                    <h2 className="text-white font-weight-bold mb-0">WOMAN</h2>
                                    <Link to="/shop/Female" className="ml-auto text-white border-bottom font-weight-bold">EXPLORE</Link>
                                </div>
                            </motion.div>
                            <motion.div 
                                whileHover={{ scale: 0.99 }}
                                className="category-box shadow-lg rounded-2xl overflow-hidden bg-info position-relative" 
                                style={{ height: '298px' }}
                            >
                                <div className="p-5 text-white position-relative z-index-10">
                                    <h2 className="font-weight-bold">KIDS WEAR</h2>
                                    <p className="w-50 small opacity-75">Quality comfort for the little dreamers.</p>
                                    <Link to="/shop/Kids" className="btn btn-white rounded-pill px-4 mt-2 font-weight-bold">VIEW MORE</Link>
                                </div>
                                <img src="/assets/images/banner-3.png" className="kid-img-parallax" alt="" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- CUSTOM CSS FOR PREMIUM INTERFACE --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 28px !important; }
                .z-index-10 { z-index: 10; }
                .z-index-20 { z-index: 20; }
                
                .floating-anim { animation: float-up-down 5s ease-in-out infinite; }
                @keyframes float-up-down { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-25px); } }

                .hover-glow:hover { box-shadow: 0 0 30px rgba(23,162,184,0.4) !important; transform: translateY(-3px); }
                
                .img-container { height: 380px; position: relative; }
                .transition-img { transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .product-card-premium:hover .transition-img { transform: scale(1.1); }
                
                .card-actions {
                    position: absolute; bottom: -80px; left: 0; right: 0;
                    display: flex; justify-content: center; gap: 10px;
                    padding: 25px; transition: 0.5s ease;
                    background: linear-gradient(transparent, rgba(0,0,0,0.4));
                }
                .product-card-premium:hover .card-actions { bottom: 0; }
                
                .action-btn-p { width: 42px; height: 42px; border-radius: 50%; border: none; background: white; display: flex; align-items: center; justify-content: center; color: #333; }
                .action-btn-p:hover { background: #17a2b8; color: white; }
                .quick-add-btn { background: #17a2b8; color: white; border: none; padding: 0 25px; border-radius: 50px; font-weight: 800; font-size: 11px; }

                .luxury-badge { position: absolute; top: 20px; right: 20px; background: #ff4757; color: white; padding: 5px 14px; border-radius: 50px; font-weight: 800; font-size: 11px; box-shadow: 0 5px 15px rgba(255,71,87,0.3); }

                .category-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.7)); }
                
                .kid-img-parallax { position: absolute; bottom: -30px; right: -30px; height: 100%; filter: drop-shadow(10px 10px 30px rgba(0,0,0,0.2)); }
                
                .skeleton-image { height: 380px; background: #f3f3f3; animation: pulse-anim 1.5s infinite; }
                .skeleton-line { height: 15px; background: #f3f3f3; animation: pulse-anim 1.5s infinite; }
                @keyframes pulse-anim { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

                .text-dark-hover:hover { color: #17a2b8 !important; text-decoration: none; }
                .w-max { width: max-content; }
                .btn-white { background: white; color: black; border: none; }
            `}} />
        </div>
    )
}