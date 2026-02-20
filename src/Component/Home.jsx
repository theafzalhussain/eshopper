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
}