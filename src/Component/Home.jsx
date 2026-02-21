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

    // --- ⚡ PERFORMANCE OPTIMIZATION ---
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
        }, 5000);
        return () => clearInterval(timer);
    }, [dispatch])

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

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    }

    return (
        <div className="home-premium-wrapper" style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. PREMIUM HERO CAROUSEL WITH DECOR --- */}
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
                        <div className="container position-relative z-index-10">
                            <div className="row align-items-center">
                                <div className="col-lg-6">
                                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{delay: 0.3}}>
                                        <span className="text-info font-weight-bold letter-spacing-2 mb-3 d-block uppercase small">
                                            {welcomeUser ? `Welcome, ${welcomeUser.split(' ')[0]} | ` : ""}{sliderData[currentSlide].subtitle}
                                        </span>
                                        <h1 className="display-2 font-weight-bold mb-4 text-dark line-height-1">
                                            {sliderData[currentSlide].title}
                                        </h1>
                                        <p className="lead text-muted mb-5">
                                            {sliderData[currentSlide].desc}
                                        </p>
                                        <Link to={sliderData[currentSlide].link} className="btn btn-dark btn-lg px-5 py-3 rounded-0 shadow-lg transition hover-up">
                                            SHOP THE COLLECTION
                                        </Link>
                                    </motion.div>
                                </div>
                                <div className="col-lg-6 text-center d-none d-lg-block position-relative">
                                    <motion.img 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        src={sliderData[currentSlide].img} 
                                        className="img-fluid hero-floating-img z-index-10 position-relative"
                                        alt="Main banner"
                                        style={{ maxHeight: '75vh', filter: 'drop-shadow(20px 20px 60px rgba(0,0,0,0.1))' }}
                                    />
                                    {/* Decor Circle from update */}
                                    <div className="decor-circle bg-info"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
                
                <div className="slider-dots">
                    {sliderData.map((_, i) => (
                        <div key={i} onClick={() => setCurrentSlide(i)} className={`dot ${currentSlide === i ? 'active' : ''}`}></div>
                    ))}
                </div>
            </section>

            {/* --- 2. BRAND IDENTITY BAR (Newly Added) --- */}
            <section className="py-4 bg-white border-top border-bottom text-center">
                <div className="container">
                    <div className="row text-uppercase font-weight-bold align-items-center" style={{letterSpacing:'3px', opacity:0.5, fontSize: '0.9rem'}}>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">ADIDAS</div>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">ZARA</div>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">GUCCI</div>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">PRADA</div>
                    </div>
                </div>
            </section>

            {/* --- 3. LUXURY BENTO CATEGORY GRID --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-md-7">
                            <motion.div whileHover={{ scale: 0.98 }} className="category-card large shadow rounded-2xl overflow-hidden position-relative h-100" style={{minHeight:'550px'}}>
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover transition-slow" alt="Men" />
                                <div className="category-content-overlay p-5 d-flex flex-column justify-content-end">
                                    <h2 className="text-white display-4 font-weight-bold">MEN</h2>
                                    <Link to="/shop/Male" className="btn btn-white w-max px-5 rounded-0 font-weight-bold">SHOP NOW</Link>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-5">
                            <div className="d-flex flex-column h-100 gap-4">
                                <motion.div whileHover={{ scale: 0.98 }} className="category-card shadow rounded-2xl overflow-hidden position-relative mb-4 border" style={{ flex: 1 }}>
                                    <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover transition-slow" alt="Women" />
                                    <div className="category-content-overlay p-4">
                                        <h3 className="text-white font-weight-bold h2 mb-0">WOMEN</h3>
                                        <Link to="/shop/Female" className="text-white border-bottom small font-weight-bold mt-2 d-inline-block">VIEW LOOKBOOK</Link>
                                    </div>
                                </motion.div>
                                <motion.div whileHover={{ scale: 0.98 }} className="category-card shadow rounded-2xl overflow-hidden position-relative bg-info p-5 d-flex align-items-center" style={{ flex: 1 }}>
                                    <div className="text-white position-relative z-index-10">
                                        <h3 className="font-weight-bold h1">KIDS</h3>
                                        <p className="small mb-3">Styles that keep up with their imagination.</p>
                                        <Link to="/shop/Kids" className="btn btn-outline-light rounded-pill btn-sm px-4">EXPLORE</Link>
                                    </div>
                                    <img src="/assets/images/banner-3.png" className="position-absolute h-100" style={{ right: '-30px', bottom: '-20px' }} alt="" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 4. TRENDING REPORT --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-4 font-weight-bold">Trending Report</h2>
                        <div className="mx-auto bg-info" style={{ height: '3px', width: '70px' }}></div>
                    </div>

                    <div className="row">
                        {displayProducts.length > 0 ? displayProducts.map((item, index) => (
                            <motion.div 
                                key={item.id} className="col-6 col-md-4 col-lg-3 mb-5"
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="product-luxury-card group bg-white shadow-hover transition">
                                    <div className="position-relative overflow-hidden aspect-ratio-standard rounded-2xl shadow-sm">
                                        <Link to={`/single-product/${item.id}`}>
                                            <img src={item.pic1} loading="lazy" className="w-100 h-100 object-fit-cover luxury-img-main" alt={item.name} />
                                        </Link>
                                        {item.discount > 0 && <span className="p-badge">{item.discount}% OFF</span>}
                                        <div className="p-card-overlay">
                                            <button onClick={() => navigate(`/single-product/${item.id}`)} className="p-btn shadow"><i className="icon-eye"></i></button>
                                            <button className="p-btn shadow"><i className="icon-heart"></i></button>
                                        </div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <span className="small text-info font-weight-bold text-uppercase" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>{item.brand}</span>
                                        <h3 className="h6 font-weight-bold mb-2">
                                            <Link to={`/single-product/${item.id}`} className="text-dark hover-text-info">{item.name}</Link>
                                        </h3>
                                        <div className="d-flex justify-content-center align-items-baseline">
                                            <span className="h6 font-weight-bold mb-0">₹{item.finalprice}</span>
                                            {item.baseprice > item.finalprice && <del className="ml-2 text-muted x-small">₹{item.baseprice}</del>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            [1, 2, 3, 4].map(i => <div key={i} className="col-lg-3 col-6 mb-4"><div className="skeleton-p shadow-sm rounded-2xl h-350"></div></div>)
                        )}
                    </div>
                </div>
            </section>

            <Newslatter />

            <style dangerouslySetInnerHTML={{ __html: `
                .line-height-1 { line-height: 1; }
                .rounded-2xl { border-radius: 24px !important; }
                .transition { transition: all 0.3s ease; }
                .transition-slow { transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
                .hover-up:hover { transform: translateY(-5px); }
                .letter-spacing-2 { letter-spacing: 2px; }
                .z-index-10 { z-index: 10; }
                
                /* Floating and Decor Elements */
                .hero-floating-img { animation: hero-float 6s ease-in-out infinite; }
                @keyframes hero-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
                
                .decor-circle { 
                    position: absolute; top: 10%; right: 10%; width: 400px; height: 400px; 
                    border-radius: 50%; opacity: 0.08; z-index: 1; background: #17a2b8;
                }

                .category-content-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
                    display: flex; flex-direction: column; justify-content: flex-end;
                }

                .aspect-ratio-standard { width: 100%; aspect-ratio: 10/12; }
                .product-luxury-card:hover .luxury-img-main { transform: scale(1.1); }
                
                .p-badge { position: absolute; top: 15px; left: 15px; background: #ff4757; color: white; padding: 4px 10px; border-radius: 5px; font-weight: bold; font-size: 10px; }

                .p-card-overlay {
                    position: absolute; bottom: -60px; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.15); display: flex; justify-content: center; align-items: flex-end;
                    padding-bottom: 25px; transition: 0.4s; gap: 12px;
                }
                .product-luxury-card:hover .p-card-overlay { bottom: 0; }
                
                .p-btn { width: 45px; height: 45px; border-radius: 50%; border: none; background: white; color: #111; display: flex; align-items: center; justify-content: center; }
                .p-btn:hover { background: #17a2b8; color: white; transform: scale(1.1); }

                .dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer; transition: 0.3s; }
                .dot.active { width: 30px; border-radius: 5px; background: #17a2b8; }
                .slider-dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 50; }
                .btn-white { background: white; color: #000; border: none; font-weight: 800; padding: 12px 25px; transition: 0.3s; }
                .btn-white:hover { background: #17a2b8; color: white; }
                .w-max { width: max-content; }
            `}} />
        </div>
    )
}