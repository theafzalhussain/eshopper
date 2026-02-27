import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingCart, User } from 'lucide-react'

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")

    useEffect(() => {
        const handleScroll = () => { setIsScrolled(window.scrollY > 40) }
        window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isMobileMenuOpen])

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
            <nav className="navbar navbar-light bg-white border-bottom py-2 shadow-sm">
                <div className="container">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        {/* --- 🔥 PREMIUM LOGO --- */}
                        <Link className="navbar-brand d-flex align-items-center mb-0" to="/">
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

                        {/* --- DESKTOP NAV (Hidden on Mobile) --- */}
                        <div className="desktop-nav d-none d-lg-flex align-items-center">
                            <ul className="navbar-nav d-flex align-items-center">
                                <li className="nav-item mx-2"><Link to="/" className={`nav-link premium-nav-link ${isActive('/')?'active-link':''}`}>Home</Link></li>
                                <li className="nav-item mx-2"><Link to="/shop/All/" className={`nav-link premium-nav-link ${isActive('/shop/All/')?'active-link':''}`}>Shop</Link></li>
                                <li className="nav-item mx-2"><Link to="/about" className={`nav-link premium-nav-link ${isActive('/about')?'active-link':''}`}>About</Link></li>
                                <li className="nav-item mx-2"><Link to="/contact" className={`nav-link premium-nav-link ${isActive('/contact')?'active-link':''}`}>Contact</Link></li>
                                {role === "Admin" && (
                                    <li className="nav-item mx-2">
                                        <Link to="/admin-home" className="badge-admin-pill">ADMIN</Link>
                                    </li>
                                )}
                            </ul>
                            <div className="navbar-right-box d-flex align-items-center ml-4">
                                <Link to="/cart" className="text-dark mr-4 h5 position-relative mb-0">
                                    <ShoppingCart size={22} />
                                    <span className="cart-badge bg-info"></span>
                                </Link>
                                {localStorage.getItem("login") ? (
                                    <div className="dropdown d-inline premium-dropdown-wrapper">
                                        <button className="btn-user premium-user-btn" data-toggle="dropdown">
                                            <div className="user-avatar">
                                                <User size={18} className="text-info" />
                                            </div>
                                            <span className="user-name">{name?.split(' ')[0]}</span>
                                            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        <div className="dropdown-menu dropdown-menu-right premium-dropdown-menu">
                                            <div className="dropdown-header-custom">
                                                <div className="user-info-header">
                                                    <div className="user-avatar-large">
                                                        <User size={24} className="text-info" />
                                                    </div>
                                                    <div className="user-details">
                                                        <h6 className="mb-0">{name}</h6>
                                                        <small className="text-muted">Premium Member</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="dropdown-divider"></div>
                                            <Link className="dropdown-item premium-dropdown-item" to="/profile">
                                                <i className="icon-vcard mr-2"></i> 
                                                <span>My Profile</span>
                                            </Link>
                                            <Link className="dropdown-item premium-dropdown-item" to="/cart">
                                                <ShoppingCart size={14} className="mr-2" style={{display:'inline'}} /> 
                                                <span>My Orders</span>
                                            </Link>
                                            <div className="dropdown-divider"></div>
                                            <button className="dropdown-item premium-dropdown-item logout-item" onClick={logout}>
                                                <i className="icon-sign-out mr-2"></i>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : <Link to="/login" className="btn btn-dark rounded-pill px-4 btn-sm font-weight-bold shadow-sm">LOGIN</Link>}
                            </div>
                        </div>

                        {/* --- MOBILE MENU TOGGLE (Visible on Mobile Only) --- */}
                        <div className="mobile-menu-toggle d-lg-none d-flex align-items-center">
                            <Link to="/cart" className="text-dark mr-3 position-relative">
                                <ShoppingCart size={20} />
                                <span className="cart-badge bg-info"></span>
                            </Link>
                            <button 
                                className="hamburger-btn" 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label="Toggle Menu"
                            >
                                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>

                    {/* --- MOBILE MENU (Full Screen Overlay) --- */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div 
                                className="mobile-menu-overlay"
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                            >
                                <div className="mobile-menu-content">
                                    <nav className="mobile-nav">
                                        <Link to="/" className={`mobile-nav-link ${isActive('/')?'active':''}`}>
                                            <span>Home</span>
                                        </Link>
                                        <Link to="/shop/All/" className={`mobile-nav-link ${isActive('/shop/All/')?'active':''}`}>
                                            <span>Shop</span>
                                        </Link>
                                        <Link to="/about" className={`mobile-nav-link ${isActive('/about')?'active':''}`}>
                                            <span>About</span>
                                        </Link>
                                        <Link to="/contact" className={`mobile-nav-link ${isActive('/contact')?'active':''}`}>
                                            <span>Contact</span>
                                        </Link>
                                        {role === "Admin" && (
                                            <Link to="/admin-home" className="mobile-nav-link">
                                                <span className="badge-admin-pill">ADMIN</span>
                                            </Link>
                                        )}
                                    </nav>

                                    <div className="mobile-menu-footer">
                                        {localStorage.getItem("login") ? (
                                            <>
                                                <Link to="/profile" className="btn btn-outline-dark btn-block mb-3 py-3 font-weight-bold">
                                                    <User size={18} className="mr-2" style={{display:'inline'}} /> {name}
                                                </Link>
                                                <button onClick={logout} className="btn btn-danger btn-block py-3 font-weight-bold">
                                                    LOGOUT
                                                </button>
                                            </>
                                        ) : (
                                            <Link to="/login" className="btn btn-dark btn-block py-3 font-weight-bold">
                                                LOGIN
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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

                /* DESKTOP NAV */
                .navbar-nav {
                    flex-direction: row !important;
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                .nav-item {
                    display: inline-block;
                }
                .premium-nav-link { 
                    font-size: 13px !important; font-weight: 700 !important; 
                    text-transform: uppercase; color: #333 !important; 
                    text-decoration: none; padding: 8px 16px;
                    position: relative;
                    transition: all 0.3s ease;
                    display: inline-block;
                    white-space: nowrap;
                }
                .premium-nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: #17a2b8;
                    transition: width 0.3s ease;
                }
                .premium-nav-link:hover::after,
                .active-link::after { width: 100%; }
                .active-link { color: #17a2b8 !important; }
                .badge-admin-pill { background: #ff4757; color: #fff !important; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 50px; text-decoration: none; }
                
                /* === ULTRA PREMIUM DROPDOWN === */
                .premium-dropdown-wrapper { position: relative; }
                .premium-user-btn {
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    border: 1px solid #e9ecef;
                    border-radius: 50px;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                    font-size: 13px;
                    color: #111;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .premium-user-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(23, 162, 184, 0.15);
                    border-color: #17a2b8;
                }
                .user-avatar {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white !important;
                }
                .user-name { font-weight: 700; color: #111; }
                .dropdown-arrow {
                    transition: transform 0.3s ease;
                    color: #666;
                }
                .premium-user-btn[aria-expanded="true"] .dropdown-arrow {
                    transform: rotate(180deg);
                }

                /* DROPDOWN MENU */
                .premium-dropdown-menu {
                    border: none !important;
                    border-radius: 20px !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.12) !important;
                    padding: 0 !important;
                    min-width: 280px;
                    margin-top: 12px !important;
                    background: rgba(255,255,255,0.98);
                    backdrop-filter: blur(20px);
                    animation: slideDownFade 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                    overflow: hidden;
                }
                @keyframes slideDownFade {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .dropdown-header-custom {
                    padding: 20px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                }
                .user-info-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .user-avatar-large {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white !important;
                    box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
                }
                .user-details h6 {
                    font-weight: 800;
                    color: #111;
                    font-size: 14px;
                }
                .user-details small {
                    font-size: 11px;
                    font-weight: 600;
                    color: #17a2b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .premium-dropdown-item {
                    padding: 12px 20px !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #333 !important;
                    transition: all 0.2s ease !important;
                    display: flex;
                    align-items: center;
                    border: none !important;
                    background: transparent !important;
                    text-decoration: none !important;
                }
                .premium-dropdown-item:hover {
                    background: #f8f9fa !important;
                    color: #17a2b8 !important;
                    padding-left: 24px !important;
                }
                .premium-dropdown-item i,
                .premium-dropdown-item svg {
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                .premium-dropdown-item:hover i,
                .premium-dropdown-item:hover svg {
                    opacity: 1;
                }
                .logout-item {
                    color: #dc3545 !important;
                    font-weight: 700 !important;
                }
                .logout-item:hover {
                    background: #fff5f5 !important;
                    color: #c82333 !important;
                }
                
                /* 🍔 HAMBURGER BUTTON */
                .hamburger-btn {
                    background: none; border: none; cursor: pointer; padding: 8px;
                    display: flex; align-items: center; justify-content: center;
                    color: #111; transition: 0.3s;
                }
                .hamburger-btn:hover { color: #17a2b8; }

                /* 📱 MOBILE MENU OVERLAY */
                .mobile-menu-overlay {
                    position: fixed; top: 0; right: 0; bottom: 0; left: 0;
                    background: rgba(0,0,0,0.95); z-index: 9999;
                    overflow-y: auto; backdrop-filter: blur(10px);
                }
                .mobile-menu-content {
                    padding: 80px 30px 30px; min-height: 100vh;
                    display: flex; flex-direction: column; justify-content: space-between;
                }
                .mobile-nav { display: flex; flex-direction: column; gap: 0; }
                .mobile-nav-link {
                    color: #fff; font-size: 28px; font-weight: 800;
                    text-transform: uppercase; padding: 20px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    transition: 0.3s; text-decoration: none; display: block;
                }
                .mobile-nav-link:hover, .mobile-nav-link.active {
                    color: #17a2b8; padding-left: 15px;
                }
                .mobile-menu-footer { padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); }

                .cart-badge { position: absolute; top: -5px; right: -8px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid #fff; }
                .animate-up { animation: fadeUpNav 0.3s ease forwards; }
                @keyframes fadeUpNav { from {opacity:0; transform:translateY(10px)} to {opacity:1; transform:translateY(0)} }

                /* 📱 MOBILE RESPONSIVE */
                @media (max-width: 991px) {
                    .logo-brand-name { font-size: 16px; letter-spacing: 2px; }
                    .logo-e { width: 32px; height: 32px; font-size: 18px; }
                    .logo-tagline { font-size: 6px; }
                    .ribbon-text { font-size: 9px !important; }
                    .top-premium-ribbon { height: 35px; }
                }
                
                @media (max-width: 575px) {
                    .mobile-nav-link { font-size: 20px; padding: 15px 0; }
                    .mobile-menu-content { padding: 60px 20px 20px; }
                    .logo-brand-name { font-size: 14px; letter-spacing: 1.5px; }
                    .logo-e { width: 28px; height: 28px; font-size: 16px; }
                    .logo-tagline { font-size: 5px; }
                    .navbar { padding: 8px 0 !important; }
                }

                @media (max-width: 375px) {
                    .mobile-nav-link { font-size: 18px; }
                    .logo-brand-name { font-size: 13px; letter-spacing: 1px; }
                }
            `}} />
        </header>
    )
}