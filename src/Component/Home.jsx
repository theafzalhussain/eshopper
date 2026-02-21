import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [welcomeUser, setWelcomeUser] = useState("")

    // ⚡ FAST LOADING & PERFORMANCE: Memory based optimization
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
        dispatch(getUser())
        const storedName = localStorage.getItem("name")
        if(storedName) setWelcomeUser(storedName)
    }, [dispatch])

    // Animation Configs
    const fadeInUp = {
        initial: { y: 60, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
    };

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. PREMIUM HERO SECTION (FIXED OVERLAP & ALIGNMENT) --- */}
            <section className="luxury-hero" style={{ 
                minHeight: '92vh', 
                background: 'linear-gradient(135deg, #fdfbfb 0%, #f0f2f5 100%)',
                display: 'flex',
                alignItems: 'center',
                paddingTop: '80px' 
            }}>
                <div className="container py-5">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-lg-6 order-2 order-lg-1 text-center text-lg-left"
                            initial={{ x: -70, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 1, ease: "backOut" }}
                        >
                            <span className="text-info font-weight-bold ls-4 mb-3 d-inline-block px-3 py-1 bg-white rounded-pill small shadow-sm">
                                {welcomeUser ? `WELCOME, ${welcomeUser.toUpperCase()}` : 'EXCLUSIVELY CRAFTED 2024'}
                            </span>
                            <h1 className="display-2 font-weight-bold text-dark mb-4 hero-text" style={{ lineHeight: '0.9', fontFamily: "'Playfair Display', serif" }}>
                                Summer <span className="text-info font-italic">Elegance</span>
                            </h1>
                            <p className="lead text-muted mb-5 w-75 mx-auto mx-lg-0">Experience the perfect fusion of contemporary comfort and high-street fashion curated just for you.</p>
                            <div className="d-flex align-items-center justify-content-center justify-content-lg-start">
                                <Link to="/shop/All" className="btn btn-info btn-lg px-5 py-3 rounded-pill shadow-lg mr-4 transition hover-up font-weight-bold">EXPLORE COLLECTION</Link>
                            </div>
                        </motion.div>
                        
                        <div className="col-lg-6 order-1 order-lg-2 text-center position-relative mb-5 mb-lg-0">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2 }}>
                                <img 
                                    src="/assets/images/bg_1.png" 
                                    className="img-fluid floating-hero z-index-10" 
                                    alt="Summer Look" 
                                    style={{ maxHeight: '75vh', width: 'auto', filter: 'drop-shadow(30px 30px 60px rgba(0,0,0,0.12))' }} 
                                    onError={(e) => { e.target.src="https://res.cloudinary.com/dtfvoxw1p/image/upload/v1740150247/eshoper_products/temp_banner.png" }}
                                />
                                <div className="abstract-decor bg-info opacity-10"></div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. LUXURY SERVICES BAR --- */}
            <section className="py-4 bg-white border-bottom shadow-sm">
                <div className="container">
                    <div className="row text-center">
                        {[
                            { icon: "flaticon-bag", t: "WHITE GLOVE DELIVERY", s: "48-Hour Arrival" },
                            { icon: "flaticon-heart-box", t: "LUXURY PACKAGING", s: "Sustainability Focus" },
                            { icon: "flaticon-payment-security", t: "SECURE CHECKOUT", s: "PCI-DSS Verified" },
                            { icon: "flaticon-customer-service", t: "24/7 CONCIERGE", s: "Expert Style Support" }
                        ].map((v, i) => (
                            <div key={i} className="col-6 col-md-3 py-3 border-right last-no-border">
                                <span className={`${v.icon} h3 text-info d-block mb-2`}></span>
                                <h6 className="font-weight-bold mb-0 small text-dark ls-1">{v.t}</h6>
                                <p className="text-muted mb-0 xx-small text-uppercase">{v.s}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 3. THE BENTO CATEGORY GRID --- */}
            <section className="py-5 bg-white mt-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-5 border-bottom pb-4">
                        <h2 className="display-4 font-weight-bold mb-0" style={{fontFamily: "'Playfair Display', serif"}}>Curated Stories</h2>
                        <div className="text-muted small ls-2 font-weight-bold">F/W 2024 COLLECTION</div>
                    </div>
                    <div className="row g-4 align-items-stretch">
                        <div className="col-lg-7 mb-4">
                            <motion.div whileHover={{ scale: 0.99 }} className="story-box shadow rounded-2xl overflow-hidden position-relative h-100" style={{minHeight:'550px'}}>
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover transition-slow" alt="Men's Edit" />
                                <div className="overlay-grad p-5 d-flex flex-column justify-content-end h-100">
                                    <h3 className="display-4 text-white font-weight-bold mb-3" style={{lineHeight:0.9}}>MANIFESTO<br/>MAN</h3>
                                    <Link to="/shop/Male" className="btn btn-outline-light rounded-pill px-5 ls-2 font-weight-bold w-max">EXPLORE SHOP</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-lg-5">
                            <div className="d-flex flex-column h-100 gap-4">
                                <motion.div whileHover={{ scale: 0.99 }} className="story-box rounded-2xl shadow-lg overflow-hidden position-relative mb-4 flex-fill" style={{height:'265px'}}>
                                    <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover transition-slow" alt="Woman" />
                                    <div className="overlay-grad p-4 d-flex align-items-end w-100 h-100">
                                        <h3 className="text-white font-weight-bold h2 mb-0 ls-1">MODERN WOMAN</h3>
                                        <Link to="/shop/Female" className="ml-auto btn btn-light rounded-circle p-2 shadow"><i className="icon-arrow-forward h4 mb-0 text-dark"></i></Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{ scale: 0.99 }} className="story-box rounded-2xl bg-light-info shadow-lg p-5 position-relative overflow-hidden flex-fill" style={{height:'265px'}}>
                                    <div className="position-relative z-index-10">
                                        <span className="text-info font-weight-bold ls-2 small mb-2 d-block">NEW DROPS</span>
                                        <h2 className="font-weight-bold text-dark display-5 mb-3">LITTLE <br/>DREAMERS</h2>
                                        <Link to="/shop/Kids" className="btn btn-info rounded-pill px-4 btn-sm font-weight-bold shadow-sm">VIEW MORE</Link>
                                    </div>
                                    <img src="/assets/images/banner-3.png" className="kid-visual" alt="Kids fashion" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 4. TRENDING PRODUCTS GRID --- */}
            <section className="py-5 bg-light shadow-inner">
                <div className="container py-5">
                    <div className="row justify-content-center mb-5">
                        <motion.div className="col-md-7 text-center" variants={fadeInUp} initial="initial" whileInView="animate">
                            <h2 className="display-4 font-weight-bold" style={{fontFamily: "'Playfair Display', serif"}}>Trending Objects</h2>
                            <div className="mx-auto bg-info mt-2" style={{ height: '4px', width: '70px', borderRadius:'10px' }}></div>
                        </motion.div>
                    </div>

                    <div className="row g-4">
                        {displayProducts.length > 0 ? displayProducts.map((item, index) => (
                            <motion.div 
                                key={item.id} className="col-6 col-lg-3 mb-5"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -10 }}
                            >
                                <div className="fashion-product bg-white rounded-2xl shadow-hover transition-slow h-100 overflow-hidden border">
                                    <div className="position-relative img-holder overflow-hidden" style={{ aspectRatio: '10/12' }}>
                                        <Link to={`/single-product/${item.id}`}>
                                            <img src={item.pic1} loading="lazy" className="w-100 h-100 object-fit-cover" alt={item.name} />
                                        </Link>
                                        {item.discount > 0 && <span className="premium-badge">-{item.discount}%</span>}
                                        <div className="card-quick-actions">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="p-icon-btn"><i className="icon-eye"></i></button>
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="p-icon-btn active"><i className="icon-shopping_cart"></i></button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="small text-info font-weight-bold ls-1 uppercase">{item.brand}</span>
                                            <div className="rating-lux small text-warning"><i className="fa fa-star"></i> 4.9</div>
                                        </div>
                                        <h3 className="h6 font-weight-bold mb-3">
                                            <Link to={`/single-product/${item.id}`} className="text-dark-hover transition">{item.name}</Link>
                                        </h3>
                                        <div className="d-flex align-items-center justify-content-between mt-auto">
                                            <span className="h5 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                            <del className="ml-2 text-muted small">₹{item.baseprice}</del>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                             [1,2,3,4].map(i => <div key={i} className="col-lg-3 col-6"><div className="skeleton-card mb-5"></div></div>)
                        )}
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- PREMIUM STYLE DEFINITIONS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;700&display=swap');
                
                body { font-family: 'Inter', sans-serif; }
                .ls-4 { letter-spacing: 5px; } .ls-2 { letter-spacing: 2px; } .ls-1 { letter-spacing: 1px; }
                .z-index-10 { z-index: 10; } .z-index-1 { z-index: 1; }
                .rounded-2xl { border-radius: 20px !important; }
                .object-fit-cover { object-fit: cover; }
                .transition-slow { transition: 0.6s all cubic-bezier(0.165, 0.84, 0.44, 1); }
                .floating-hero { animation: hero-float 6s ease-in-out infinite; }
                @keyframes hero-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

                .abstract-decor { position: absolute; top: 10%; right: 10%; width: 400px; height: 400px; border-radius: 50%; z-index: 1; }
                .overlay-grad { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
                .bg-light-info { background-color: #f0faff; }
                
                .premium-badge { position: absolute; top: 15px; right: 15px; background: #000; color: #fff; padding: 4px 12px; font-weight: 800; font-size: 11px; border-radius: 3px; }
                
                .card-quick-actions {
                    position: absolute; bottom: -60px; left: 0; right: 0; 
                    background: rgba(255,255,255,0.75); backdrop-filter: blur(5px);
                    display: flex; justify-content: center; gap: 15px; padding: 15px;
                    transition: 0.4s ease-out;
                }
                .fashion-product:hover .card-quick-actions { bottom: 0; }
                .p-icon-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #ddd; background: #fff; display: flex; align-items: center; justify-content: center; color: #111; }
                .p-icon-btn:hover { background: #17a2b8; color: #fff; border-color: #17a2b8; transform: scale(1.1); }
                
                .kid-visual { position: absolute; bottom: -20px; right: -20px; height: 110%; transform: rotate(-5deg); pointer-events: none; filter: drop-shadow(10px 10px 20px rgba(0,0,0,0.2)); }
                .shadow-hover:hover { box-shadow: 0 30px 60px -15px rgba(0,0,0,0.12) !important; border-color: #17a2b8 !important; }
                .text-dark-hover:hover { color: #17a2b8 !important; text-decoration: none; }

                .skeleton-card { height: 450px; background: #eee; border-radius: 20px; animation: pulse 1.5s infinite linear; }
                @keyframes pulse { 0% { opacity: 0.6 } 50% { opacity: 1 } 100% { opacity: 0.6 } }
                
                .btn-white { background: white; border: none; color: black; transition: 0.3s; }
                .w-max { width: max-content; }
                .last-no-border { border-right: none !important; }
                .xx-small { font-size: 9px; letter-spacing: 2px; }
            `}} />
        </div>
    )
}