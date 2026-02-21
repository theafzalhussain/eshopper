import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Newslatter from './Newslatter'

export default function About() {
    // Animation Variants
    const fadeIn = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    }

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: "hidden" }}>
            
            {/* --- 1. MINIMALIST HERO SECTION (Same as your about) --- */}
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

            {/* --- 2. PREMIUM STATS --- */}
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

            {/* --- 3. PREMIUM "WHY CHOOSE US" (Redesigned with Layered Layout) --- */}
            <section className="py-5 my-5">
                <div className="container py-lg-5">
                    <div className="row align-items-center">
                        <div className="col-lg-6 order-2 order-lg-1">
                            <div className="position-relative p-4">
                                {/* Decorative elements to make it look premium */}
                                <div className="decor-box-behind"></div>
                                <motion.div 
                                    className="overflow-hidden rounded-3xl shadow-2xl border-white border-8"
                                    initial="hidden" whileInView="visible" variants={fadeIn}
                                >
                                    <img 
                                        src="assets/images/choose-2.jpg" 
                                        className="img-fluid w-100" 
                                        style={{ height: "580px", objectFit: "cover", display: "block" }}
                                        alt="Why Choose Us"
                                    />
                                </motion.div>
                                <div className="floating-badge-about">
                                    <span className="font-weight-bold">Premium Labels</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-5 offset-lg-1 order-1 order-lg-2 mb-5 mb-lg-0">
                            <span className="text-info font-weight-bold text-uppercase small letter-spacing-5 d-block mb-3">Our Mastery</span>
                            <h2 className="display-4 font-weight-bold text-dark mb-4">Uncompromising Quality & Style</h2>
                            <p className="text-muted lead mb-5">
                                We believe fashion should be timeless. Our commitment to excellence ensures that every stitch is perfect and every fabric is ethically sourced for the modern individual.
                            </p>
                            
                            <div className="premium-feature-grid">
                                {[
                                    { icon: "fa-leaf", title: "Eco-Friendly", desc: "100% Sustainable materials." },
                                    { icon: "fa-globe", title: "Global Design", desc: "Created by world-class designers." },
                                    { icon: "fa-tag", title: "Fair Pricing", desc: "Luxury quality at honest prices." }
                                ].map((item, idx) => (
                                    <div key={idx} className="d-flex mb-4 align-items-start">
                                        <div className="icon-p-circle mr-3"><i className={`fas ${item.icon} text-info`}></i></div>
                                        <div>
                                            <h6 className="font-weight-bold mb-1">{item.title}</h6>
                                            <p className="small text-muted mb-0">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 4. PRODUCTION EXCELLENCE (Interactive Step-Based Gallery) --- */}
            <section className="py-5" style={{ backgroundColor: "#fdfdfd" }}>
                <div className="container py-5">
                    <div className="row justify-content-center text-center mb-5">
                        <div className="col-lg-8">
                            <h2 className="display-4 font-weight-bold mb-3">Production Excellence</h2>
                            <div className="premium-line mx-auto mb-4"></div>
                            <p className="text-muted">Explore our meticulous process of creating the garments you love.</p>
                        </div>
                    </div>

                    <div className="row g-4">
                        {[
                            { img: "assets/images/choose-1.jpg", step: "01", title: "Selection", text: "Curating the world's finest fabrics." },
                            { img: "assets/images/choose-2.jpg", step: "02", title: "Precision", text: "Laser-sharp cutting and stitching." },
                            { img: "/assets/productimages/kid.jpg", step: "03", title: "Testing", text: "24-point quality inspection." }
                        ].map((item, i) => (
                            <div key={i} className="col-md-4">
                                <motion.div 
                                    className="p-card rounded-2xl bg-white shadow-sm overflow-hidden" 
                                    whileHover={{ y: -15 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="position-relative">
                                        <img src={item.img} className="w-100 object-fit-cover" style={{ height: "400px" }} alt={item.title} />
                                        <div className="step-tag">{item.step}</div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <h5 className="font-weight-bold mb-2">{item.title}</h5>
                                        <p className="small text-muted mb-0">{item.text}</p>
                                    </div>
                                </motion.div>
                            </div>
                        ))}
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
                .letter-spacing-5 { letter-spacing: 5px; }
                
                .main-hero-img { height: 550px; width: 100%; object-fit: cover; }
                
                .experience-tag {
                    position: absolute; bottom: 30px; left: -20px;
                    background: #17a2b8; color: white;
                    padding: 20px 35px; border-radius: 20px;
                    text-align: center;
                }

                .decor-box-behind {
                    position: absolute; top: -20px; right: -20px;
                    width: 100%; height: 100%; border: 3px solid #17a2b8;
                    border-radius: 40px; z-index: -1;
                }

                .floating-badge-about {
                    position: absolute; top: 40px; right: -20px;
                    background: #ffffff; color: #17a2b8;
                    padding: 10px 25px; border-radius: 50px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .icon-p-circle {
                    width: 50px; height: 50px; border-radius: 15px;
                    background: rgba(23, 162, 184, 0.1);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.2rem;
                }

                .premium-line { width: 70px; height: 5px; background: #17a2b8; border-radius: 10px; }

                .step-tag {
                    position: absolute; top: 20px; left: 20px;
                    background: #17a2b8; color: white;
                    padding: 5px 15px; border-radius: 8px; font-weight: bold;
                }

                .p-card { transition: all 0.4s; border: 1px solid #f0f0f0; }
                .p-card:hover { border-color: #17a2b8; }

                .icon-circle {
                    width: 80px; height: 80px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                }

                .shadow-hover { transition: 0.3s; border: 1px solid #eee !important; }
                .shadow-hover:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.08) !important; }

                @media (max-width: 768px) {
                    .border-right { border-right: none !important; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                    .main-hero-img { height: 400px; }
                    .experience-tag { left: 20px; }
                    .decor-box-behind { display: none; }
                }
            `}} />
        </div>
    )
}