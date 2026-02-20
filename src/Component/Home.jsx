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

    // ⚡ FAST LOADING & OPTIMIZATION: Memoizing processed data
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
    }, [dispatch])

    // --- ANIMATION VARIANTS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
    }

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
    }

    const heroTextVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: "backOut" } }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. LUXURY PARALLAX HERO SECTION --- */}
            <section className="hero-section" style={{ height: '92vh', background: '#fcfcfc', position: 'relative' }}>
                <div className="container h-100">
                    <div className="row h-100 align-items-center">
                        <motion.div 
                            className="col-lg-6 z-index-10"
                            initial="hidden"
                            animate="visible"
                            variants={heroTextVariants}
                        >
                            <span className="text-info font-weight-bold mb-3 d-inline-block px-3 py-1 bg-light rounded-pill small shadow-sm" style={{ letterSpacing: '3px' }}>
                                NEW ARRIVALS 2024
                            </span>
                            <h1 className="display-1 font-weight-bold text-dark mb-4" style={{ lineHeight: '0.9' }}>
                                Pure <br /> <span className="text-info">Sophistication.</span>
                            </h1>
                            <p className="lead text-secondary mb-5 w-75" style={{ fontSize: '1.2rem' }}>
                                Unveiling our most exclusive collection yet. Designed for the bold, crafted for the elegant.
                            </p>
                            <div className="d-flex align-items-center gap-4">
                                <Link to="/shop/All" className="btn btn-info btn-lg px-5 py-3 rounded-pill shadow-lg hover-glow mr-3">
                                    EXPLORE SHOP
                                </Link>
                                <Link to="/about" className="text-dark font-weight-bold border-bottom border-dark pb-1 text-decoration-none">
                                    Our Story
                                </Link>
                            </div>
                        </motion.div>
                        <div className="col-lg-6 position-absolute-lg-right">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1.2, ease: "circOut" }}
                                className="hero-image-wrapper"
                            >
                                <img src="/assets/images/bg_1.png" className="img-fluid floating-anim" alt="Luxury Wear" />
                                <div className="abstract-circle bg-info opacity-10"></div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. FLOATING TRUST BADGES --- */}
            <section className="py-4 mt-n5 position-relative z-index-20">
                <div className="container">
                    <div className="row bg-white shadow-xl rounded-2xl py-4 border-0 no-gutters">
                        {[
                            { icon: "flaticon-bag", title: "Worldwide Shipping", sub: "Delivery in 48 hours" },
                            { icon: "flaticon-heart-box", title: "Luxury Quality", sub: "Hand-picked materials" },
                            { icon: "flaticon-payment-security", title: "Secure Checkout", sub: "100% safe payment" },
                            { icon: "flaticon-customer-service", title: "Personal Stylist", sub: "Available 24/7" }
                        ].map((f, i) => (
                            <div key={i} className="col-md-3 text-center px-4 py-3 border-md-right last-no-border">
                                <span className={`${f.icon} h3 text-info mb-2 d-block`}></span>
                                <h6 className="font-weight-bold mb-0 small">{f.title}</h6>
                                <p className="text-muted xx-small mb-0 uppercase">{f.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 3. TRENDING GRID (SUPER FAST & ANIMATED) --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-end mb-5">
                        <motion.div initial={{opacity:0, x:-20}} whileInView={{opacity:1, x:0}}>
                            <h2 className="display-4 font-weight-bold mb-0">Trending Now</h2>
                            <p className="text-info font-weight-bold">Handpicked for you</p>
                        </motion.div>
                        <Link to="/shop/All" className="btn btn-link text-info font-weight-bold text-decoration-none">VIEW ALL COLLECTIONS →</Link>
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
                                        <div className="img-container rounded-2xl overflow-hidden shadow-sm">
                                            <Link to={`/single-product/${item.id}`}>
                                                <img src={item.pic1} className="w-100 h-100 object-fit-cover" alt={item.name} />
                                            </Link>
                                            {item.discount > 0 && <span className="premium-discount">-{item.discount}%</span>}
                                            <div className="hover-actions">
                                                <button onClick={() => navigate(`/single-product/${item.id}`)} className="btn-action shadow"><i className="icon-eye"></i></button>
                                                <button className="btn-action shadow"><i className="icon-heart"></i></button>
                                                <button onClick={() => navigate(`/single-product/${item.id}`)} className="btn-add shadow">QUICK ADD</button>
                                            </div>
                                        </div>
                                        <div className="pt-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-info small font-weight-bold uppercase">{item.brand}</span>
                                                <div className="rating small text-warning"><i className="fa fa-star"></i> 4.9</div>
                                            </div>
                                            <h3 className="h6 font-weight-bold mb-2">
                                                <Link to={`/single-product/${item.id}`} className="text-dark-hover">{item.name}</Link>
                                            </h3>
                                            <div className="d-flex align-items-center">
                                                <span className="h5 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                                <del className="ml-2 text-muted small">₹{item.baseprice}</del>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                // Elegant Skeleton Loader
                                [1,2,3,4].map(n => (
                                    <div key={n} className="col-sm-6 col-lg-3 mb-5">
                                        <div className="skeleton-box h-350 rounded-2xl mb-3"></div>
                                        <div className="skeleton-box h-20 w-75 mb-2"></div>
                                        <div className="skeleton-box h-20 w-50"></div>
                                    </div>
                                ))
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </section>

            {/* --- 4. LUXURY CATEGORY BENTO GRID --- */}
            <section className="py-5 bg-light">
                <div className="container-fluid px-lg-5">
                    <div className="row">
                        <div className="col-md-6 mb-4">
                            <motion.div whileHover={{y:-5}} className="luxury-banner-lg rounded-2xl" style={{ backgroundImage: "url('assets/images/choose-1.jpg')" }}>
                                <div className="overlay-dark p-5 d-flex flex-column justify-content-end h-100">
                                    <h2 className="text-white display-3 font-weight-bold">MAN</h2>
                                    <Link to="/shop/Male" className="btn btn-outline-light btn-lg rounded-0 w-max px-5">SHOP ESSENTIALS</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-6">
                            <motion.div whileHover={{y:-5}} className="luxury-banner-sm rounded-2xl mb-4" style={{ backgroundImage: "url('assets/images/choose-2.jpg')" }}>
                                <div className="overlay-dark p-5 d-flex align-items-center h-100">
                                    <h2 className="text-white font-weight-bold mb-0">WOMAN</h2>
                                    <Link to="/shop/Female" className="ml-auto text-white border-bottom font-weight-bold">SHOP NOW</Link>
                                </div>
                            </motion.div>
                            <motion.div whileHover={{y:-5}} className="luxury-banner-sm rounded-2xl bg-info d-flex align-items-center overflow-hidden">
                                <div className="p-5 text-white z-index-10">
                                    <h2 className="font-weight-bold">LITTLE ONES</h2>
                                    <p className="small">Starting at ₹499</p>
                                    <Link to="/shop/Kids" className="btn btn-white rounded-pill px-4 mt-2">SHOP KIDS</Link>
                                </div>
                                <img src="/assets/images/banner-3.png" className="kid-img-abs" alt="" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- CUSTOM SCSS/CSS FOR ULTRA PREMIUM FEEL --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;800&display=swap');
                
                body { font-family: 'Inter', sans-serif; }
                h1, h2 { font-family: 'Playfair Display', serif; }

                .rounded-2xl { border-radius: 24px !important; }
                .shadow-xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08) !important; }
                
                .hero-section { background-image: radial-gradient(circle at 80% 20%, #e0f7fa 0%, transparent 40%); }
                .floating-anim { animation: float 6s ease-in-out infinite; }
                @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }

                .product-card-premium { position: relative; transition: 0.3s; }
                .img-container { height: 380px; position: relative; }
                .img-container img { transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                .product-card-premium:hover img { transform: scale(1.1); }
                
                .hover-actions {
                    position: absolute; bottom: -60px; left: 0; right: 0;
                    display: flex; justify-content: center; gap: 10px;
                    padding: 20px; transition: 0.4s; background: linear-gradient(transparent, rgba(0,0,0,0.3));
                }
                .product-card-premium:hover .hover-actions { bottom: 0; }
                
                .btn-action { 
                    width: 40px; height: 40px; border-radius: 50%; border: none; 
                    background: white; color: #333; display: flex; align-items: center; justify-content: center;
                }
                .btn-add {
                    background: #17a2b8; color: white; border: none; padding: 0 20px;
                    border-radius: 50px; font-weight: 800; font-size: 11px;
                }
                
                .premium-discount {
                    position: absolute; top: 20px; right: 20px; background: #ff4757;
                    color: white; padding: 4px 12px; border-radius: 50px; font-weight: 800; font-size: 11px;
                }

                .luxury-banner-lg { height: 600px; background-size: cover; background-position: center; position: relative; overflow: hidden; }
                .luxury-banner-sm { height: 288px; background-size: cover; background-position: center; position: relative; overflow: hidden; }
                .overlay-dark { background: rgba(0,0,0,0.25); transition: 0.4s; }
                .luxury-banner-lg:hover .overlay-dark, .luxury-banner-sm:hover .overlay-dark { background: rgba(0,0,0,0.4); }

                .skeleton-box { background: #f0f0f0; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                .h-350 { height: 350px; } .h-20 { height: 20px; }
                
                .kid-img-abs { position: absolute; bottom: -20px; right: -20px; height: 90%; transform: rotate(-5deg); filter: drop-shadow(10px 10px 20px rgba(0,0,0,0.2)); }
                .text-dark-hover:hover { color: #17a2b8 !important; text-decoration: none; }
                .hover-glow:hover { box-shadow: 0 0 20px rgba(23,162,184,0.4) !important; }
            `}} />
        </div>
    )
}