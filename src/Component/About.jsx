import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Newslatter from './Newslatter'

export default function About() {
    // Animation Variants
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: "hidden" }}>
            
            {/* --- 1. MINIMALIST HERO SECTION --- */}
            <section className="about-hero-new py-5" style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", minHeight: "70vh", display: "flex", alignItems: "center" }}>
                <div className="container">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-lg-6"
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <span className="badge badge-info px-3 py-2 rounded-pill mb-3 shadow-sm text-uppercase" style={{ letterSpacing: "2px" }}>Our Journey</span>
                            <h1 className="display-3 font-weight-bold text-dark mb-4" style={{ lineHeight: "1.1" }}>
                                Crafting a <span className="text-info">New Standard</span> in Fashion.
                            </h1>
                            <p className="lead text-muted mb-5">
                                Since our inception in 2024, Eshopper has been dedicated to bridging the gap between high-end luxury and everyday comfort. We believe fashion is an expression of the soul.
                            </p>
                            <Link to="/shop/All" className="btn btn-dark btn-lg px-5 rounded-pill shadow hover-up">Explore Collection</Link>
                        </motion.div>
                        <div className="col-lg-6 mt-5 mt-lg-0">
                            <motion.div 
                                className="hero-img-container"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                            >
                                <img src="/assets/images/choose-1.jpg" className="img-fluid rounded-3xl shadow-2xl main-hero-img" alt="Fashion" />
                                <div className="experience-tag shadow-lg">
                                    <h2 className="mb-0 font-weight-bold">24/7</h2>
                                    <p className="mb-0 small">Global Support</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. PREMIUM STATS (No Black, Soft & Clean) --- */}
            <section className="py-5" style={{ marginTop: "-50px" }}>
                <div className="container">
                    <div className="row bg-white shadow-xl rounded-2xl py-5 text-center border">
                        <div className="col-md-3 border-right">
                            <h2 className="display-4 font-weight-bold text-info">15k+</h2>
                            <p className="text-muted text-uppercase small font-weight-bold">Happy Clients</p>
                        </div>
                        <div className="col-md-3 border-right">
                            <h2 className="display-4 font-weight-bold text-info">500+</h2>
                            <p className="text-muted text-uppercase small font-weight-bold">Unique Styles</p>
                        </div>
                        <div className="col-md-3 border-right">
                            <h2 className="display-4 font-weight-bold text-info">32</h2>
                            <p className="text-muted text-uppercase small font-weight-bold">Countries Served</p>
                        </div>
                        <div className="col-md-3">
                            <h2 className="display-4 font-weight-bold text-info">100%</h2>
                            <p className="text-muted text-uppercase small font-weight-bold">Pure Quality</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 3. OUR CORE PHILOSOPHY --- */}
            <section className="py-5 my-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 order-2 order-md-1">
                            <motion.img 
                                src="assets/images/choose-2.jpg" 
                                className="img-fluid rounded-2xl shadow-lg" 
                                style={{ height: "500px", width: "100%", objectFit: "cover" }}
                                initial="hidden" whileInView="visible" variants={fadeIn}
                            />
                        </div>
                        <div className="col-md-5 offset-md-1 order-1 order-md-2 mb-5 mb-md-0">
                            <h6 className="text-info font-weight-bold text-uppercase mb-3">Why Choose Us</h6>
                            <h2 className="display-4 font-weight-bold mb-4">Uncompromising Quality & Style</h2>
                            <p className="text-muted">We don't just sell clothes; we curate pieces that tell a story. From the selection of the finest threads to the final stitch, our quality control process is world-class.</p>
                            
                            <ul className="list-unstyled mt-4">
                                <li className="mb-3 d-flex align-items-center"><i className="fa fa-check-circle text-info mr-3 h5"></i> <span>Eco-Friendly Production Materials</span></li>
                                <li className="mb-3 d-flex align-items-center"><i className="fa fa-check-circle text-info mr-3 h5"></i> <span>Global Designer Collaborations</span></li>
                                <li className="mb-3 d-flex align-items-center"><i className="fa fa-check-circle text-info mr-3 h5"></i> <span>Direct-to-Consumer Fair Pricing</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 4. PRODUCTION EXCELLENCE (FIXED IMAGES & LAYOUT) --- */}
            <section className="py-5 bg-light">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-4 font-weight-bold">Production Excellence</h2>
                        <div className="luxury-divider mx-auto"></div>
                        <p className="text-muted mt-3">Take a glimpse inside our world-class manufacturing process</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4">
                            <motion.div className="gallery-card rounded-2xl shadow-sm overflow-hidden" whileHover={{ y: -10 }}>
                                <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "450px" }} alt="P1" />
                                <div className="gallery-overlay">
                                    <h5 className="text-white mb-0 font-weight-bold">Material Selection</h5>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-4">
                            <motion.div className="gallery-card rounded-2xl shadow-sm overflow-hidden" whileHover={{ y: -10 }}>
                                <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "450px" }} alt="P2" />
                                <div className="gallery-overlay">
                                    <h5 className="text-white mb-0 font-weight-bold">Precision Stitching</h5>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-md-4">
                            <motion.div className="gallery-card rounded-2xl shadow-sm overflow-hidden" whileHover={{ y: -10 }}>
                                <img src="/assets/productimages/kid.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "450px" }} alt="P3" />
                                <div className="gallery-overlay">
                                    <h5 className="text-white mb-0 font-weight-bold">Final Quality Check</h5>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 5. INTERACTIVE VALUE CARDS --- */}
            <section className="py-5 my-5">
                <div className="container py-5">
                    <div className="row text-center">
                        {[
                            { icon: "fa-shipping-fast", title: "Fast Delivery", color: "#e3f2fd" },
                            { icon: "fa-lock", title: "Secure Payment", color: "#f1f8e9" },
                            { icon: "fa-sync", title: "Easy Returns", color: "#fff3e0" },
                            { icon: "fa-medal", title: "Authentic Gear", color: "#f3e5f5" }
                        ].map((item, i) => (
                            <div key={i} className="col-lg-3 col-md-6 mb-4">
                                <motion.div 
                                    className="p-5 rounded-2xl h-100 shadow-hover border-0" 
                                    style={{ backgroundColor: "white" }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="icon-circle mb-4 mx-auto" style={{ backgroundColor: item.color }}>
                                        <i className={`fas ${item.icon} h3 text-info`}></i>
                                    </div>
                                    <h5 className="font-weight-bold">{item.title}</h5>
                                    <p className="small text-muted mb-0">Experience world-class service with every purchase.</p>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Newslatter />

            {/* --- PREMIUM STYLING --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-3xl { border-radius: 40px !important; }
                .shadow-xl { box-shadow: 0 20px 40px rgba(0,0,0,0.05) !important; }
                .shadow-2xl { box-shadow: 0 30px 60px rgba(0,0,0,0.1) !important; }
                
                .hero-img-container { position: relative; }
                .main-hero-img { height: 550px; width: 100%; object-fit: cover; }
                
                .experience-tag {
                    position: absolute; bottom: 30px; left: -20px;
                    background: #17a2b8; color: white;
                    padding: 20px 35px; border-radius: 20px;
                    text-align: center;
                }

                .luxury-divider { width: 60px; height: 4px; background: #17a2b8; border-radius: 10px; }

                .gallery-card { position: relative; cursor: pointer; }
                .gallery-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(transparent, rgba(0,0,0,0.7));
                    display: flex; align-items: flex-end; padding: 30px;
                    opacity: 0; transition: 0.4s ease;
                }
                .gallery-card:hover .gallery-overlay { opacity: 1; }

                .icon-circle {
                    width: 80px; height: 80px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                }

                .shadow-hover { transition: 0.3s; border: 1px solid #eee !important; }
                .shadow-hover:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.08) !important; }

                .hover-up:hover { transform: translateY(-5px); }

                @media (max-width: 768px) {
                    .border-right { border-right: none !important; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                    .main-hero-img { height: 400px; }
                    .experience-tag { left: 20px; }
                }
            `}} />
        </div>
    )
}