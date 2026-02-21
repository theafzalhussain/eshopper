import React from 'react'
import { motion } from 'framer-motion'
import Newslatter from './Newslatter'

export default function About() {
    return (
        <div style={{ backgroundColor: "#ffffff" }}>
            {/* --- HERO SECTION --- */}
            <section className="py-5" style={{ background: "#111", color: "white" }}>
                <div className="container py-5">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-md-6"
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                        >
                            <h1 className="display-3 font-weight-bold mb-4">Our Story of <span className="text-info">Elegance</span></h1>
                            <p className="lead opacity-75 mb-5">Since 2024, Eshopper has been defining the future of premium fashion, bringing global trends directly to your doorstep with uncompromised quality.</p>
                        </motion.div>
                        <div className="col-md-6 text-center">
                            <motion.img 
                                initial={{ scale: 0.8, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                src="/assets/images/about.jpg" 
                                className="img-fluid rounded-2xl shadow-2xl border border-secondary"
                                alt="About Us"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CORE VALUES (Kept similar to image but Premium) --- */}
            <section className="py-5 mt-5">
                <div className="container">
                    <div className="row text-center">
                        {[
                            { icon: "flaticon-bag", title: "Global Reach", bg: "#f8f9fa" },
                            { icon: "flaticon-heart-box", title: "Handcrafted", bg: "#f0faff" },
                            { icon: "flaticon-payment-security", title: "Total Privacy", bg: "#fffaf0" },
                            { icon: "flaticon-customer-service", title: "Expert Care", bg: "#f5f0ff" }
                        ].map((item, i) => (
                            <motion.div key={i} className="col-lg-3 col-md-6 mb-4" whileHover={{ y: -15 }}>
                                <div className="p-5 rounded-2xl shadow-sm h-100" style={{ backgroundColor: item.bg }}>
                                    <span className={`${item.icon} display-4 text-info mb-3 d-block`}></span>
                                    <h5 className="font-weight-bold">{item.title}</h5>
                                    <p className="small text-muted">Excellence in every stitch and every service we provide.</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- PREMIUM STATS SECTION --- */}
            <section className="py-5 bg-info text-white text-center">
                <div className="container">
                    <div className="row">
                        <div className="col-md-3">
                            <h2 className="font-weight-bold">10K+</h2>
                            <p className="small uppercase font-weight-bold">Happy Customers</p>
                        </div>
                        <div className="col-md-3">
                            <h2 className="font-weight-bold">50+</h2>
                            <p className="small uppercase font-weight-bold">Global Brands</p>
                        </div>
                        <div className="col-md-3">
                            <h2 className="font-weight-bold">24H</h2>
                            <p className="small uppercase font-weight-bold">Response Time</p>
                        </div>
                        <div className="col-md-3">
                            <h2 className="font-weight-bold">100%</h2>
                            <p className="small uppercase font-weight-bold">Original Quality</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- IMAGES SECTION (Same as your request but attractive) --- */}
            <section className="py-5 bg-light">
                <div className="container text-center mb-5">
                    <h2 className="font-weight-bold display-4">Crafting the Future</h2>
                    <p className="text-muted">Behind the scenes of our premium production line</p>
                </div>
                <div className="container-fluid px-lg-5">
                    <div className="row no-gutters overflow-hidden rounded-2xl shadow-lg">
                        <div className="col-md-4"><img src="assets/images/choose-1.jpg" className="w-100 img-zoom" alt="" /></div>
                        <div className="col-md-4"><img src="assets/images/choose-2.jpg" className="w-100 img-zoom" alt="" /></div>
                        <div className="col-md-4"><img src="/assets/productimages/kid.jpg" className="w-100 img-zoom" alt="" /></div>
                    </div>
                </div>
            </section>

            <Newslatter />

            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 30px !important; }
                .img-zoom { transition: 0.8s all ease; height: 400px; object-fit: cover; }
                .img-zoom:hover { transform: scale(1.1); }
                .shadow-2xl { box-shadow: 0 40px 80px rgba(0,0,0,0.3) !important; }
                .uppercase { text-transform: uppercase; letter-spacing: 2px; }
                .btn-white { background: white; color: black; font-weight: bold; border-radius: 50px; }
            `}} />
        </div>
    )
}