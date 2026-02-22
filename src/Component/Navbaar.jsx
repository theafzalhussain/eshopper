import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, X, Phone, Mail } from 'lucide-react'

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")
    const isLoggedIn = localStorage.getItem("login")

    // Handle Navbar transparency & height on scroll
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop/All/" },
        { name: "About", path: "/about" },
        { name: "Contact", path: "/contact" },
    ]

    const closeMobileMenu = () => setIsMobileOpen(false)

    return (
        <>
            {/* --- 1. LUXURY TOP RIBBON (Responsive stacking) --- */}
            <div className="top-luxury-bar">
                <div className="container h-100 d-flex justify-content-between align-items-center">
                    <span className="ribbon-text font-weight-bold">
                        ESHOPPER CONCIERGE: COMPLIMENTARY SHIPPING
                    </span>
                    <div className="ribbon-contact d-none d-md-flex align-items-center opacity-75">
                        <span className="small mr-3"><Phone size={12} className="mr-1" /> +91 8447859784</span>
                        <span className="small"><Mail size={12} className="mr-1" /> SUPPORT@ESHOPPER.COM</span>
                    </div>
                </div>
            </div>

            {/* --- 2. MASTER NAVBAR (Glassmorphism + Responsive Design) --- */}
            <header className={`nav-master ${isScrolled ? 'nav-scrolled' : ''}`}>
                <div className="container h-100 d-flex align-items-center justify-content-between">
                    
                    {/* Hamburger Button (Mobile Only - Left Side) */}
                    <button className="d-lg-none menu-trigger btn p-0 border-0" onClick={() => setIsMobileOpen(true)}>
                        <Menu size={26} strokeWidth={1.5} />
                    </button>

                    {/* --- DESIGNER LOGO (Centered on mobile, Left on desktop) --- */}
                    <Link to="/" className="brand-box text-center text-lg-left">
                        <div className="logo-concept">
                            <span className="logo-e shadow-sm">E</span>
                            <span className="logo-text d-none d-sm-inline">SHOPPER<span className="logo-dot-teal">.</span></span>
                        </div>
                    </Link>

                    {/* --- DESKTOP MENU (Hidden on Mobile) --- */}
                    <nav className="d-none d-lg-block">
                        <ul className="premium-list-links mb-0 p-0 d-flex">
                            {navLinks.map((link) => (
                                <li key={link.name} className="nav-item-lux mx-3">
                                    <Link to={link.path} className={`nav-link-premium ${location.pathname === link.path ? 'is-active' : ''}`}>
                                        {link.name}
                                        {location.pathname === link.path && (
                                            <motion.div layoutId="navline" className="active-indicator" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                            {role === "Admin" && (
                                <li className="nav-item-lux">
                                    <Link to="/admin-home" className="admin-pill-badge">ADMIN</Link>
                                </li>
                            )}
                        </ul>
                    </nav>

                    {/* --- ACTION HUBS (Icons stay together) --- */}
                    <div className="action-hub d-flex align-items-center justify-content-end">
                        <Link to="/cart" className="action-link-premium position-relative mr-3 mr-md-4">
                            <ShoppingCart size={22} strokeWidth={1.5} />
                            <span className="cart-dot-indicator"></span>
                        </Link>

                        <div className="auth-profile-hub">
                            {isLoggedIn ? (
                                <div className="dropdown">
                                    <button className="user-access-btn rounded-pill border shadow-sm" data-toggle="dropdown">
                                        <User size={16} className="mr-md-2" />
                                        <span className="d-none d-md-inline">{name?.split(' ')[0]}</span>
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-right lux-popover-shadow border-0 rounded-2xl p-2 mt-3">
                                        <Link className="dropdown-item py-2 rounded-lg" to="/profile"><User size={14} className="mr-2"/> Profile</Link>
                                        <Link className="dropdown-item py-2 rounded-lg" to="/cart"><ShoppingCart size={14} className="mr-2"/> My Bag</Link>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item text-danger py-2 rounded-lg" onClick={() => { localStorage.clear(); navigate("/login"); }}><LogOut size={14} className="mr-2"/> Logout</button>
                                    </div>
                                </div>
                            ) : (
                                <Link to="/login">
                                    <button className="premium-login-pill shadow transition">SIGN IN</button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* --- 3. RESPONSIVE SIDEBAR MENU (Framer Motion Drawer) --- */}
            <AnimatePresence>
                {isMobileOpen && (
                    <div className="mobile-overlay-fixed" onClick={closeMobileMenu}>
                        <motion.div 
                            initial={{ x: "-100%" }} 
                            animate={{ x: 0 }} 
                            exit={{ x: "-100%" }} 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="mobile-drawer shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // Stop menu from closing when clicking inside
                        >
                            <div className="drawer-header p-4 d-flex justify-content-between align-items-center border-bottom bg-light">
                                <h4 className="mb-0 ls-2 font-weight-bold">ESHOPPER.</h4>
                                <button className="btn p-1" onClick={closeMobileMenu}><X size={28}/></button>
                            </div>
                            <div className="drawer-body p-4">
                                {navLinks.map((link) => (
                                    <Link key={link.name} onClick={closeMobileMenu} to={link.path} className={`drawer-link ${location.pathname === link.path ? 'text-info' : 'text-dark'}`}>
                                        {link.name}
                                    </Link>
                                ))}
                                <hr />
                                {role === "Admin" && (
                                    <Link onClick={closeMobileMenu} to="/admin-home" className="drawer-link text-danger font-weight-bold">Admin Dashboard</Link>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- PREMIUM RESPONSIVE CSS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
                
                body { padding-top: 100px; font-family: 'Inter', sans-serif; }

                /* HEADER SETTINGS */
                .top-luxury-bar { 
                    position: fixed; top: 0; left: 0; width: 100%; height: 40px;
                    background: #111; color: white; z-index: 2005; 
                    display: flex; font-size: 11px; letter-spacing: 1px;
                }
                .nav-master {
                    position: fixed; top: 40px; left: 0; width: 100%; height: 75px;
                    background: #fff; z-index: 2000; transition: all 0.3s ease;
                    border-bottom: 1px solid #f1f1f1;
                }
                .nav-scrolled {
                    top: 0; height: 70px;
                    background: rgba(255,255,255,0.9) !important;
                    backdrop-filter: blur(15px); box-shadow: 0 10px 30px rgba(0,0,0,0.04);
                }

                /* LOGO STYLING */
                .logo-concept { display: flex; align-items: center; cursor: pointer; }
                .logo-e { background: #000; color: #fff; font-family: serif; padding: 2px 8px; border-radius: 4px; font-size: 24px; font-weight: bold; margin-right: 8px; }
                .logo-text { font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 4px; color: #000; }
                .logo-dot-teal { color: #17a2b8; font-size: 30px; }

                /* LINKS DESKTOP */
                .nav-link-premium {
                    color: #555 !important; font-size: 12px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 2px; text-decoration: none !important;
                    transition: 0.3s ease; position: relative;
                }
                .nav-link-premium:hover { color: #17a2b8 !important; }
                .nav-link-premium.is-active { color: #000 !important; }
                .active-indicator { height: 2px; background: #17a2b8; width: 100%; position: absolute; bottom: -5px; }

                /* MOBILE RESPONSIVITY */
                @media (max-width: 991px) {
                    .nav-master { top: 40px; height: 65px; }
                    .brand-box { position: absolute; left: 50%; transform: translateX(-50%); }
                    body { padding-top: 105px; }
                }

                /* BUTTONS */
                .premium-login-pill {
                    background: #000; color: #fff; border: none; padding: 8px 24px;
                    border-radius: 50px; font-size: 10px; font-weight: 800; letter-spacing: 2px;
                }
                .user-access-btn { background: #fff; padding: 6px 14px; font-weight: 700; display: flex; align-items: center; transition: 0.3s; }
                
                /* ICONS */
                .cart-dot-indicator { position: absolute; top: -5px; right: -5px; height: 8px; width: 8px; background: #17a2b8; border-radius: 50%; border: 1.5px solid white; }

                /* MOBILE DRAWER SYSTEM */
                .mobile-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 5000; }
                .mobile-drawer { position: absolute; top: 0; left: 0; width: 300px; height: 100%; background: #fff; display: flex; flex-direction: column; }
                .drawer-link { display: block; padding: 18px 0; font-size: 22px; font-weight: 800; border-bottom: 1px solid #f9f9f9; text-transform: uppercase; text-decoration: none !important; }
                
                .lux-popover-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2); }
                .ls-2 { letter-spacing: 2px; }
                .admin-pill-badge { background: #ff4757; color: white !important; font-size: 9px; padding: 3px 10px; border-radius: 50px; font-weight: 800; }
            `}} />
        </>
    )
}