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
    
    const [currentSlide, setCurrentSlide] = useState(0);
    const [welcomeUser, setWelcomeUser] = useState("")

    // --- ⚡ SPEED & LOGIC OPTIMIZATION ---
    // Latest products logic (MongoDB String IDs safe)
    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
        dispatch(getUser())
        const storedName = localStorage.getItem("name")
        if(storedName) setWelcomeUser(storedName)

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === sliderData.length - 1 ? 0 : prev + 1));
        }, 6000);
        return () => clearInterval(timer);
    }, [dispatch])

    const sliderData = [
        {
            title: "Haute Couture 24",
            subtitle: "SUMMER EDIT",
            desc: "Redefining contemporary style through architectural tailoring.",
            img: "/assets/images/banner-1.png",
            color: "#f8f9fa",
            link: "/shop/Female"
        },
        {
            title: "Architectural Fit",
            subtitle: "MEN'S ATELIER",
            desc: "Precision craftsmanship meets the fluidity of modern motion.",
            img: "/assets/images/banner-2.png",
            color: "#e3f2fd",
            link: "/shop/Male"
        }
    ];

    // --- ANIMATION SUITE ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const cardVariants = {
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
    };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="home-main-ctx" style={{ backgroundColor: "#fff" }}>
            
            {/* --- 1. DYNAMIC IMMERSIVE HERO --- */}
            <section className="position-relative overflow-hidden vh-90">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="w-100 h-100 d-flex align-items-center"
                        style={{ backgroundColor: sliderData[currentSlide].color, minHeight:'90vh' }}
                    >
                        <div className="container">
                            <div className="row align-items-center">
                                <div className="col-lg-6 z-index-2">
                                    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                                        <div className="d-flex align-items-center mb-4">
                                            <span className="line-dec bg-info mr-2"></span>
                                            <span className="text-dark font-weight-bold uppercase small ls-3">
                                                {welcomeUser ? `Exclusively For You, ${welcomeUser.split(' ')[0]} ` : sliderData[currentSlide].subtitle}
                                            </span>
                                        </div>
                                        <h1 className="display-1 font-weight-extra-bold mb-4 text-dark hero-title">
                                            {sliderData[currentSlide].title}
                                        </h1>
                                        <p className="lead text-muted mb-5 pr-lg-5 serif-text italic">
                                            {sliderData[currentSlide].desc}
                                        </p>
                                        <div className="d-flex gap-4 flex-wrap">
                                            <Link to={sliderData[currentSlide].link} className="btn btn-dark px-5 py-3 rounded-0 ls-2 shadow-2xl hover-zoom">
                                                DISCOVER NOW
                                            </Link>
                                            <Link to="/about" className="btn btn-outline-dark px-5 py-3 rounded-0 ls-2 border-2 hover-bg-dark">
                                                OUR STUDIO
                                            </Link>
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="col-lg-6 text-center d-none d-lg-block position-relative">
                                    <motion.img 
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 1, delay: 0.7 }}
                                        src={sliderData[currentSlide].img} 
                                        className="img-fluid hero-visual z-index-1"
                                        alt="Fashion"
                                        style={{ maxHeight: '80vh', filter: 'drop-shadow(0 40px 100px rgba(0,0,0,0.15))' }}
                                    />
                                    <div className="blob-bg bg-info"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* --- 2. LUXURY SERVICES BAR --- */}
            <section className="py-4 bg-white border-bottom shadow-sm">
                <div className="container">
                    <div className="row">
                        {[
                            { icon: "flaticon-bag", t: "WHITE GLOVE DELIVERY", s: "48-Hour Guarantee" },
                            { icon: "flaticon-heart-box", t: "LUXURY PACKAGING", s: "Premium sustainable box" },
                            { icon: "flaticon-payment-security", t: "ENCRYPTED CHECKOUT", s: "PCI-DSS Security Level" },
                            { icon: "flaticon-customer-service", t: "PERSONAL STYLIST", s: "Direct WhatsApp support" }
                        ].map((v, i) => (
                            <div key={i} className="col-md-3 border-md-right py-3 text-center text-md-left d-flex align-items-center justify-content-center justify-content-md-start last-no-border px-lg-4">
                                <span className={`${v.icon} h3 text-info mr-3 mb-0`}></span>
                                <div>
                                    <h6 className="font-weight-bold mb-0 x-small-text ls-1 text-dark">{v.t}</h6>
                                    <p className="text-muted small-text mb-0">{v.s}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 3. THE ATELIER CATEGORY GRID (BENTO STYLE) --- */}
            <section className="py-5 bg-white">
                <div className="container mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-5 border-bottom pb-4">
                        <h2 className="display-4 font-weight-bold mb-0 section-header">Current Stories</h2>
                        <div className="text-muted small ls-2 font-weight-bold">FALL / WINTER 2024</div>
                    </div>
                    <div className="row g-4 bento-grid">
                        <div className="col-lg-7">
                            <motion.div whileHover={{ scale: 0.99 }} className="category-block tall-card shadow-2xl rounded-3xl overflow-hidden border">
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover hover-scale" alt="Male" />
                                <div className="block-overlay p-5 text-white">
                                    <h2 className="display-3 font-weight-bold mb-3">MANIFESTO<br/>MAN</h2>
                                    <Link to="/shop/Male" className="btn btn-outline-light rounded-0 px-5 ls-2 font-weight-bold">EXPLORE SHOP</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-lg-5">
                            <motion.div whileHover={{ scale: 0.99 }} className="category-block small-card mb-4 rounded-3xl overflow-hidden border shadow-xl bg-dark text-white">
                                <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover opacity-60 hover-scale" alt="Female" />
                                <div className="block-overlay p-4 d-flex align-items-center justify-content-between w-100">
                                    <h3 className="mb-0 font-weight-bold ls-1 h2">WOMAN</h3>
                                    <Link to="/shop/Female" className="btn-circle bg-white text-dark shadow-lg"><i className="icon-arrow-right"></i></Link>
                                </div>
                            </motion.div>
                            <motion.div whileHover={{ scale: 0.99 }} className="category-block small-card rounded-3xl overflow-hidden border bg-light-info shadow-xl p-5 position-relative">
                                <div className="position-relative z-index-10">
                                    <span className="text-info font-weight-bold ls-2 small mb-2 d-block">NEW DROPS</span>
                                    <h2 className="font-weight-bold text-dark display-5 mb-3">LITTLE <br/>MODERN</h2>
                                    <Link to="/shop/Kids" className="text-dark font-weight-bold border-bottom border-dark pb-1 text-decoration-none">Discover More</Link>
                                </div>
                                <img src="/assets/images/banner-3.png" className="kid-visual-float" alt="" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 4. THE LUXURY SHOWCASE (PRODUCTS) --- */}
            <section className="py-5 bg-white mb-5">
                <div className="container">
                    <div className="row mb-5 text-center justify-content-center">
                        <div className="col-md-7">
                            <h6 className="text-info font-weight-bold ls-3 text-uppercase">The Highlight Reel</h6>
                            <h2 className="display-4 font-weight-bold mb-3 text-dark">Trending Objects</h2>
                        </div>
                    </div>

                    <div className="row">
                        {displayProducts.length > 0 ? displayProducts.map((item, idx) => (
                            <motion.div key={item.id} className="col-6 col-lg-3 mb-5" variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                                <div className="fashion-card h-100 transition-normal">
                                    <div className="fashion-image-container rounded-2xl shadow-xl overflow-hidden bg-light mb-3">
                                        <Link to={`/single-product/${item.id}`}>
                                            <img src={item.pic1} loading="lazy" className="w-100 h-100 object-fit-cover fashion-img transition-image" alt={item.name} />
                                        </Link>
                                        <div className="badge-luxury">{item.discount}%</div>
                                        <div className="card-quick-access">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="circle-action-btn"><i className="icon-search"></i></button>
                                            <button className="circle-action-btn active"><i className="icon-shopping-cart"></i></button>
                                        </div>
                                    </div>
                                    <div className="fashion-details px-1">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-info-p small ls-1 font-weight-bold text-uppercase">{item.brand}</span>
                                            <span className="small text-muted font-weight-bold italic">⭐ 4.9</span>
                                        </div>
                                        <h3 className="h6 font-weight-bold text-dark mb-2 clamp-1">
                                            <Link to={`/single-product/${item.id}`} className="text-dark no-underline-hover">{item.name}</Link>
                                        </h3>
                                        <div className="d-flex align-items-baseline">
                                            <span className="h6 font-weight-bold text-dark mb-0">₹{item.finalprice}</span>
                                            {item.baseprice > item.finalprice && <del className="ml-2 text-muted x-small">₹{item.baseprice}</del>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            [1,2,3,4].map(n => <div key={n} className="col-lg-3 col-6"><div className="skeleton-fashion-p mb-5 shadow rounded-2xl"></div></div>)
                        )}
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- PREMIUM STYLE DEFS (SCSS) --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Quicksand:wght@300;500;700&display=swap');
                
                .home-main-ctx { font-family: 'Quicksand', sans-serif; }
                .hero-title, .section-header { font-family: 'Marcellus', serif; }
                
                .vh-90 { min-height: 90vh; }
                .ls-3 { letter-spacing: 3.5px; } .ls-2 { letter-spacing: 2px; }
                .ls-1 { letter-spacing: 1.2px; }
                .z-index-2 { z-index: 20; position: relative; }
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 45px !important; }
                .shadow-2xl { box-shadow: 0 40px 80px -12px rgba(0,0,0,0.14) !important; }
                .italic { font-style: italic; }

                /* Immersive Visuals */
                .line-dec { width: 50px; height: 3px; display: inline-block; }
                .blob-bg { 
                    position: absolute; top: 15%; right: 15%; width: 400px; height: 400px; 
                    border-radius: 50%; opacity: 0.12; filter: blur(50px); z-index: 0;
                }
                .hero-visual { position: relative; z-index: 5; }

                /* Fashion Card Grid */
                .fashion-image-container { height: 400px; position: relative; }
                .fashion-img { transition: 0.8s cubic-bezier(0.19, 1, 0.22, 1); }
                .product-luxury-card:hover .fashion-img { transform: scale(1.1); }
                
                .badge-luxury { 
                    position: absolute; top: 18px; left: 18px; background: #000; 
                    color: #fff; font-size: 10px; font-weight: 800; padding: 5px 12px; 
                }

                .card-quick-access {
                    position: absolute; bottom: -50px; left: 0; right: 0; 
                    background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
                    padding: 20px; display: flex; justify-content: center; gap: 15px; 
                    transition: 0.5s ease;
                }
                .fashion-image-container:hover .card-quick-access { bottom: 0; }
                
                .circle-action-btn { 
                    width: 45px; height: 45px; border-radius: 50%; border: none; 
                    background: white; color: #111; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                }
                .circle-action-btn:hover { background: #17a2b8; color: #fff; transform: scale(1.1); }

                /* Bento Style banners */
                .category-block { height: 100%; position: relative; transition: 0.5s; }
                .block-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%); }
                .hover-scale { transition: 1s ease; }
                .category-block:hover .hover-scale { transform: scale(1.05); }

                .kid-visual-float { position: absolute; right: -25px; bottom: -40px; height: 110%; transform: rotate(-8deg); pointer-events: none; }
                .bg-light-info { background: #f0fbff; }

                .skeleton-fashion-p { height: 500px; background: #f2f2f2; animation: shimmer 1.5s infinite linear; }
                @keyframes shimmer { 0% { opacity:0.6 } 50% { opacity:1 } 100% { opacity:0.6 } }
                
                .dot { width: 10px; height: 4px; background: rgba(0,0,0,0.2); cursor: pointer; transition: 0.3s; }
                .dot.active { width: 35px; background: #17a2b8; }
                .slider-dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 50; }

                .clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
                .no-underline-hover:hover { text-decoration: none; color: #17a2b8 !important; }
                .btn-white { background: #fff; border: 1px solid #ddd; }
                .w-max { width: max-content; }
            `}} />
        </motion.div>
    )
}