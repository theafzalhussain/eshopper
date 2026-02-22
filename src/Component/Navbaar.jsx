import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")

    useEffect(() => {
        const handleScroll = () => { setIsScrolled(window.scrollY > 40) }
        window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const logout = () => { localStorage.clear(); navigate("/login") }
    const isActive = (path) => location.pathname === path

    return (
        <header className={`header-main ${isScrolled ? 'header-fixed' : ''}`}>
            {/* --- 🌟 TOP RIBBON (Optimized Spacing) --- */}
            <div className="top-premium-ribbon text-white d-none d-lg-block">
                <div className="container h-100 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <span className="dot-blink mr-2"></span>
                        <span className="ribbon-text font-weight-bold">
                            Welcome to Eshopper Luxury Concierge • Edition 2024
                        </span>
                    </div>
                    <div className="d-flex align-items-center">
                        <span className="ribbon-text opacity-75 mr-4"><i className="icon-phone mr-1 text-info"></i> +91 8447859784</span>
                        <span className="ribbon-text opacity-75"><i className="icon-envelope mr-1 text-info"></i> info@eshopper.com</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN NAVBAR --- */}
            <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom py-2 shadow-sm">
                <div className="container">
                    {/* --- 🔥 NEW PREMIUM LOGO --- */}
                    <Link className="navbar-brand d-flex align-items-center" to="/">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="logo-wrapper"
                        >
                            <span className="logo-e">E</span>
                            <div className="logo-text-box">
                                <span className="logo-brand-name">SHOPPER</span>
                                <span className="logo-tagline">BOUTIQUE LUXE</span>
                            </div>
                        </motion.div>
                    </Link>

                    <button className="navbar-toggler border-0 shadow-none" type="button" data-toggle="collapse" data-target="#eshopNav" aria-controls="eshopNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="icon-menu text-dark" style={{fontSize: "24px"}}></span>
                    </button>

                    <div className="collapse navbar-collapse" id="eshopNav">
                        <ul className="navbar-nav mx-auto">
                            <li className="nav-item mx-1"><Link to="/" className={`nav-link premium-nav-link ${isActive('/')?'active-link':''}`}>Home</Link></li>
                            <li className="nav-item mx-1"><Link to="/shop/All/" className={`nav-link premium-nav-link ${isActive('/shop/All/')?'active-link':''}`}>Shop</Link></li>
                            <li className="nav-item mx-1"><Link to="/about" className={`nav-link premium-nav-link ${isActive('/about')?'active-link':''}`}>About</Link></li>
                            <li className="nav-item mx-1"><Link to="/contact" className={`nav-link premium-nav-link ${isActive('/contact')?'active-link':''}`}>Contact</Link></li>
                            {role === "Admin" && (
                                <li className="nav-item">
                                    <Link to="/admin-home" className="badge-admin-pill" style={{margin: " 10px"}}>ADMIN</Link>
                                </li>
                            )}
                        </ul>
                        <div className="navbar-right-box d-flex align-items-center justify-content-center mt-3 mt-lg-0">
                            <Link to="/cart" className="text-dark mr-4 h5 position-relative">
                                <i className="icon-shopping_cart"></i>
                                <span className="cart-badge bg-info"></span>
                            </Link>
                            {localStorage.getItem("login") ? (
                                <div className="dropdown d-inline">
                                    <button className="btn-user" data-toggle="dropdown">
                                        <i className="icon-user mr-2 text-info"></i> {name?.split(' ')[0]}
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-right border-0 shadow-lg rounded-xl animate-up">
                                        <Link className="dropdown-item py-2" to="/profile"><i className="icon-vcard mr-2"></i> Profile</Link>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item py-2 text-danger font-weight-bold" onClick={logout}><i className="icon-sign-out mr-2"></i>Logout</button>
                                    </div>
                                </div>
                            ) : <Link to="/login" className="btn btn-dark rounded-pill px-4 btn-sm font-weight-bold shadow-sm">LOGIN</Link>}
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- CUSTOM CSS FOR LUXURY & RESPONSIVENESS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .header-main { position: relative; z-index: 1050; width: 100%; background: #fff; }
                .top-premium-ribbon { 
                    height: 40px; 
                    background: linear-gradient(90deg, #0a0a0a 0%, #1a1025 40%, #301035 70%, #000 100%);
                    font-size: 11px;
                }
                .dot-blink { width: 6px; height: 6px; background: #28a745; border-radius: 50%; animation: blink 2s infinite; }
                @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                
                .header-fixed { position: fixed; top: 0; left: 0; width: 100%; animation: slideInNav 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                @keyframes slideInNav { from {transform:translateY(-100%)} to {transform:translateY(0)} }

                /* 🔥 LOGO STYLING */
                .logo-wrapper { display: flex; align-items: center; gap: 8px; }
                .logo-e {
                    background: #111; color: #fff; width: 38px; height: 38px;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 800;
                    border-radius: 4px; border-right: 3px solid #17a2b8;
                }
                .logo-text-box { display: flex; flex-direction: column; line-height: 1; }
                .logo-brand-name { font-weight: 800; letter-spacing: 3px; font-size: 20px; color: #111; }
                .logo-tagline { font-size: 8px; letter-spacing: 2px; color: #17a2b8; font-weight: 700; margin-top: 2px; }

                /* 📱 RESPONSIVE ADJUSTMENTS */
                .premium-nav-link { font-size: 13px !important; font-weight: 700 !important; text-transform: uppercase; color: #333 !important; }
                .active-link { color: #17a2b8 !important; border-bottom: 2px solid #17a2b8; }
                .badge-admin-pill { background: #ff4757; color: #fff !important; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 50px; }
                .btn-user { background: #f8f9fa; border: 1px solid #eee; border-radius: 50px; padding: 6px 18px; font-weight: 700; font-size: 12px; color: #333; }
                
                @media (max-width: 991px) {
                    .navbar-collapse { background: white; padding: 20px; border-radius: 12px; margin-top: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
                    .nav-link { padding: 12px 0 !important; border-bottom: 1px solid #f8f9fa; }
                    .navbar-right-box { border-top: 1px solid #eee; padding-top: 15px; width: 100%; justify-content: space-between; }
                }

                .cart-badge { position: absolute; top: -5px; right: -8px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid #fff; }
                .animate-up { animation: fadeUpNav 0.3s ease forwards; }
                @keyframes fadeUpNav { from {opacity:0; transform:translateY(10px)} to {opacity:1; transform:translateY(0)} }
            `}} />
        </header>
    )
}