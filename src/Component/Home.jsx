import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import Newslatter from './Newslatter';
import { motion } from 'framer-motion';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [welcomeUser, setWelcomeUser] = useState("")

    const displayProducts = useMemo(() => {
        return [...product].reverse().slice(0, 8);
    }, [product]);

    useEffect(() => {
        dispatch(getProduct())
        dispatch(getUser())
        const storedName = localStorage.getItem("name")
        if(storedName) setWelcomeUser(storedName)
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#ffffff", overflowX: 'hidden' }}>
            
            {/* --- 1. PREMIUM HERO SECTION (FIXED OVERLAP) --- */}
            <section className="luxury-hero" style={{ 
                minHeight: '80vh', 
                background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
                paddingTop: '100px', // FIX: Header se space dene ke liye
                paddingBottom: '50px' 
            }}>
                <div className="container">
                    <div className="row align-items-center">
                        <motion.div 
                            className="col-lg-6 order-2 order-lg-1 text-center text-lg-left mt-5 mt-lg-0"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="text-info font-weight-bold ls-4 mb-3 d-inline-block px-3 py-1 bg-white rounded-pill small shadow-sm">
                                {welcomeUser ? `WELCOME, ${welcomeUser.toUpperCase()}` : 'NEW ARRIVALS 2024'}
                            </span>
                            <h1 className="display-3 font-weight-bold text-dark mb-4 hero-text" style={{ lineHeight: '1.1' }}>
                                Timeless <span className="text-info font-italic">Sophist</span>
                            </h1>
                            <div className="mt-4">
                                <Link to="/shop/All" className="btn btn-info btn-lg px-5 py-3 rounded-pill shadow-lg mr-lg-4 mb-3 mb-lg-0">EXPLORE NOW</Link>
                                <Link to="/about" className="d-block d-lg-inline text-dark font-weight-bold border-bottom border-dark pb-1 text-decoration-none mt-2">Our Story</Link>
                            </div>
                        </motion.div>
                        
                        <div className="col-lg-6 order-1 order-lg-2 text-center">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1 }}>
                                {/* IMAGE PATH FIXED */}
                                <img 
                                    src="/assets/images/bg_1.png" 
                                    className="img-fluid floating-anim" 
                                    alt="Elite Wear" 
                                    style={{ maxHeight: '60vh', width: 'auto', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))' }} 
                                    onError={(e) => { e.target.src="https://res.cloudinary.com/dtfvoxw1p/image/upload/v1740150247/eshoper_products/temp_banner.png" }}
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 2. TRENDING SECTION --- */}
            <section className="py-5 bg-white">
                <div className="container py-5">
                    <h2 className="display-4 font-weight-bold text-center mb-5">Trending Items</h2>
                    <div className="row">
                        {displayProducts.map((item, index) => (
                            <motion.div 
                                key={item.id} className="col-6 col-lg-3 mb-4"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="product-premium shadow-sm border-0 bg-white rounded-lg h-100 overflow-hidden text-center transition-all">
                                    <Link to={`/single-product/${item.id}`} className="d-block position-relative overflow-hidden" style={{height:'250px'}}>
                                        <img src={item.pic1} className="w-100 h-100" style={{objectFit:'cover'}} alt={item.name}/>
                                    </Link>
                                    <div className="p-3">
                                        <h3 className="h6 font-weight-bold mb-1 text-truncate"><Link to={`/single-product/${item.id}`} className="text-dark">{item.name}</Link></h3>
                                        <div className="font-weight-bold text-info">₹{item.finalprice}</div>
                                        <button onClick={() => navigate(`/single-product/${item.id}`)} className="btn btn-sm btn-outline-info rounded-pill mt-2 px-3">View Detail</button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Newslatter />

            <style dangerouslySetInnerHTML={{ __html: `
                .ls-4 { letter-spacing: 4px; }
                .hero-text { font-size: calc(2rem + 2.5vw); }
                .rounded-lg { border-radius: 15px !important; }
                .transition-all { transition: 0.3s ease all; }
                .product-premium:hover { transform: translateY(-8px); box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; }
                .floating-anim { animation: float-up-down 4s ease-in-out infinite; }
                @keyframes float-up-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
            `}} />
        </div>
    )
}