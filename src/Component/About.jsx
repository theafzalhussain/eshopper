import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Newslatter from './Newslatter'

export default function About() {
    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.2 } }
    }

    const item = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: "hidden" }}>
            
            {/* --- 1. LUXURY HERO SECTION --- */}
            <section className="about-hero position-relative d-flex align-items-center" style={{ minHeight: "80vh", background: "#0a0a0a" }}>
                <div className="container position-relative z-index-10">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-lg-7 text-white"
                            initial={{ opacity: 0, x: -60 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <span className="text-info font-weight-bold letter-spacing-5 mb-3 d-block">EST. 2024</span>
                            <h1 className="display-2 font-weight-bold mb-4" style={{ lineHeight: "1" }}>
                                Redefining <span className="text-outline">Modern</span> Luxury.
                            </h1>
                            <p className="lead opacity-75 mb-5 w-75">
                                Eshopper is more than a brand; it's a movement towards mindful elegance and global trend leadership. We curate experiences, not just products.
                            </p>
                            <div className="d-flex gap-4">
                                <Link to="/shop/All" className="btn btn-info btn-lg px-5 rounded-pill shadow-lg mr-3">EXPLORE SHOP</Link>
                                <Link to="/contact" className="btn btn-outline-light btn-lg px-5 rounded-pill">OUR TEAM</Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="hero-decor-circle"></div>
            </section>

            {/* --- 2. THE BRAND PHILOSOPHY (Connected & Professional) --- */}
            <section className="py-5 mt-5">
                <div className="container py-5">
                    <div className="row align-items-center">
                        <div className="col-lg-5 mb-5 mb-lg-0">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                className="position-relative"
                            >
                                <img src="/assets/images/choose-1.jpg" className="w-100 rounded-3xl shadow-2xl" alt="Philosophy" style={{ height: "600px", objectFit: "cover" }} />
                                <div className="floating-experience-card shadow-lg p-4 bg-white rounded-xl">
                                    <h4 className="font-weight-bold text-info mb-0">10+ Years</h4>
                                    <p className="small text-muted mb-0">Combined Design Expertise</p>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-lg-6 offset-lg-1">
                            <h6 className="text-info font-weight-bold text-uppercase mb-3">Our Vision</h6>
                            <h2 className="display-4 font-weight-bold mb-4">Crafting Perfection in Every Detail</h2>
                            <p className="text-muted mb-4">At Eshopper, we believe that quality is never an accident. It is always the result of intelligent effort. Our team of global designers works tirelessly to bring you the finest fabrics and contemporary silhouettes.</p>
                            
                            <div className="row mt-5">
                                <div className="col-6 mb-4">
                                    <h5 className="font-weight-bold"><i className="fa fa-check-circle text-info mr-2"></i> Sustainability</h5>
                                    <p className="small text-muted">Eco-friendly packaging and ethical sourcing.</p>
                                </div>
                                <div className="col-6 mb-4">
                                    <h5 className="font-weight-bold"><i className="fa fa-check-circle text-info mr-2"></i> Innovation</h5>
                                    <p className="small text-muted">AI-driven style recommendations for you.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 3. CORE VALUES GRID (Interactive) --- */}
            <section className="py-5 bg-light">
                <div className="container py-5">
                    <motion.div 
                        className="row text-center"
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                    >
                        {[
                            { icon: "fa-shipping-fast", title: "Global Express", desc: "Doorstep delivery in 3-5 business days worldwide." },
                            { icon: "fa-gem", title: "Premium Quality", desc: "Every piece is hand-checked by our quality assurance team." },
                            { icon: "fa-shield-alt", title: "Secure Checkout", desc: "End-to-end encrypted payments via major gateways." },
                            { icon: "fa-headset", title: "VIP Support", desc: "Dedicated concierge for all your fashion queries." }
                        ].map((item, i) => (
                            <motion.div key={i} className="col-lg-3 col-md-6 mb-4" variants={item}>
                                <div className="value-card p-5 bg-white shadow-hover border-0 rounded-2xl h-100">
                                    <div className="icon-box-p bg-info-light mb-4 mx-auto">
                                        <i className={`fas ${item.icon} h3 text-info`}></i>
                                    </div>
                                    <h5 className="font-weight-bold mb-3">{item.title}</h5>
                                    <p className="small text-muted mb-0">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* --- 4. ANIMATED STATS BAR --- */}
            <section className="stats-bar py-5 text-white" style={{ background: "linear-gradient(45deg, #111, #333)" }}>
                <div className="container">
                    <div className="row text-center">
                        <div className="col-md-3 border-right border-secondary">
                            <h2 className="display-4 font-weight-bold mb-0">150k</h2>
                            <p className="text-info x-small font-weight-bold uppercase letter-spacing-2">Units Sold</p>
                        </div>
                        <div className="col-md-3 border-right border-secondary">
                            <h2 className="display-4 font-weight-bold mb-0">22+</h2>
                            <p className="text-info x-small font-weight-bold uppercase letter-spacing-2">Countries</p>
                        </div>
                        <div className="col-md-3 border-right border-secondary">
                            <h2 className="display-4 font-weight-bold mb-0">98%</h2>
                            <p className="text-info x-small font-weight-bold uppercase letter-spacing-2">Client Sat</p>
                        </div>
                        <div className="col-md-3">
                            <h2 className="display-4 font-weight-bold mb-0">500+</h2>
                            <p className="text-info x-small font-weight-bold uppercase letter-spacing-2">Styles</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 5. PREMIUM GALLERY SECTION --- */}
            <section className="py-5 my-5">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-4 font-weight-bold">Production Excellence</h2>
                        <div className="divider-p mx-auto"></div>
                    </div>
                    <div className="row g-0 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="col-md-4 gallery-item overflow-hidden">
                            <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover transition-img" alt="1" style={{ minHeight: "450px" }} />
                        </div>
                        <div className="col-md-4 gallery-item overflow-hidden">
                            <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover transition-img" alt="2" style={{ minHeight: "450px" }} />
                        </div>
                        <div className="col-md-4 gallery-item overflow-hidden">
                            <img src="/assets/productimages/kid.jpg" className="w-100 h-100 object-fit-cover transition-img" alt="3" style={{ minHeight: "450px" }} />
                        </div>
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- PREMIUM CSS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-3xl { border-radius: 50px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .letter-spacing-5 { letter-spacing: 5px; }
                .letter-spacing-2 { letter-spacing: 2px; }
                .uppercase { text-transform: uppercase; }
                .x-small { font-size: 0.75rem; }
                
                .text-outline {
                    color: transparent;
                    -webkit-text-stroke: 1.5px #17a2b8;
                }

                .z-index-10 { z-index: 10; }
                
                .hero-decor-circle {
                    position: absolute; top: -10%; right: -5%;
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(23,162,184,0.2) 0%, transparent 70%);
                    z-index: 1;
                }

                .floating-experience-card {
                    position: absolute; bottom: 30px; left: -30px;
                    width: 250px; z-index: 20;
                }

                .icon-box-p {
                    width: 70px; height: 70px; border-radius: 20px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(23, 162, 184, 0.1);
                }

                .value-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .value-card:hover { transform: translateY(-15px); box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important; }

                .transition-img { transition: transform 1s ease; }
                .gallery-item:hover .transition-img { transform: scale(1.1); }
                
                .divider-p { width: 80px; height: 4px; background: #17a2b8; margin-top: 15px; border-radius: 10px; }

                @media (max-width: 768px) {
                    .floating-experience-card { left: 20px; }
                    .display-2 { font-size: 3rem; }
                    .border-right { border: none !important; margin-bottom: 20px; }
                }
            `}} />
        </div>
    )
}