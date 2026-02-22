import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, X, Info, Phone, Mail } from 'lucide-react'

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")
    const isLoggedIn = localStorage.getItem("login")

    // Handle scroll for glassmorphism
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const logout = () => {
        if (window.confirm("Disconnect from luxury portal?")) {
            localStorage.clear()
            navigate("/login")
        }
    }

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop/All/" },
        { name: "About", path: "/about" },
        { name: "Contact", path: "/contact" },
    ]

    return (
        <>
            {/* --- 1. THE EXCLUSIVE GRADIENT RIBBON --- */}
            <div className="luxury-top-ribbon d-none d-lg-flex">
                <div className="container d-flex justify-content-between align-items-center">
                    <div className="small-info font-weight-bold">
                        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 3 }}>
                            ✨ ENJOY FREE CONCIERGE SHIPPING ON ORDERS OVER ₹1999
                        </motion.span>
                    </div>
                    <div className="top-contacts d-flex gap-4">
                        <span className="mr-3 small"><Phone size={12} className="text-info mr-1" /> +91 8447859784</span>
                        <span className="small"><Mail size={12} className="text-info mr-1" /> support@eshopper.com</span>
                    </div>
                </div>
            </div>

            {/* --- 2. THE MAIN LUXURY BAR --- */}
            <nav className={`navbar-wrapper ${isScrolled ? 'nav-scrolled' : ''}`}>
                <div className="container d-flex align-items-center justify-content-between">
                    
                    {/* --- THE ATTRACTIVE LOGO --- */}
                    <Link to="/" className="luxury-logo-link">
                        <motion.div whileHover={{ scale: 1.05 }} className="premium-logo">
                            <span className="brand-e">E</span>
                            <span className="brand-text">SHOPPER<span className="logo-dot">.</span></span>
                            <div className="logo-underline"></div>
                        </motion.div>
                    </Link>

                    {/* --- DESKTOP NAVIGATION --- */}
                    <div className="d-none d-lg-block">
                        <ul className="nav-menu-premium d-flex align-items-center mb-0">
                            {navLinks.map((link) => (
                                <li key={link.name} className="nav-item">
                                    <Link to={link.path} className={`lux-nav-link ${location.pathname === link.path ? 'active' : ''}`}>
                                        {link.name}
                                        {location.pathname === link.path && (
                                            <motion.div layoutId="nav-line" className="nav-active-bar" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                            {/* ADMIN PILL - Only for admins */}
                            {role === "Admin" && (
                                <li className="nav-item ml-3">
                                    <Link to="/admin-home" className="admin-access-badge">
                                        <LayoutDashboard size={14} className="mr-1" /> ADMIN PORTAL
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* --- ACTION GROUP (Cart/Profile) --- */}
                    <div className="action-hub d-flex align-items-center">
                        <Link to="/cart" className="cart-icon-luxury position-relative mr-4">
                            <ShoppingCart size={22} strokeWidth={1.5} />
                            <span className="premium-cart-dot shadow-sm"></span>
                        </Link>

                        {isLoggedIn ? (
                            <div className="dropdown user-auth-area">
                                <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    className="btn btn-profile-premium rounded-pill shadow-sm"
                                    data-toggle="dropdown"
                                >
                                    <User size={18} className="mr-2" />
                                    <span>{name?.split(' ')[0]}</span>
                                </motion.button>
                                <div className="dropdown-menu dropdown-menu-right premium-dropdown shadow-2xl border-0">
                                    <div className="dropdown-header border-bottom mb-2 pb-2">
                                        <p className="mb-0 font-weight-bold text-dark">{name}</p>
                                        <small className="text-muted">Personal Membership ID</small>
                                    </div>
                                    <Link className="dropdown-item" to="/profile">
                                        <div className="d-flex align-items-center"><User size={14} className="mr-2"/> Dashboard Profile</div>
                                    </Link>
                                    <Link className="dropdown-item" to="/cart">
                                        <div className="d-flex align-items-center"><ShoppingCart size={14} className="mr-2"/> Bag Settings</div>
                                    </Link>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item text-danger font-weight-bold" onClick={logout}>
                                        <div className="d-flex align-items-center"><LogOut size={14} className="mr-2"/> End Session</div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link to="/login">
                                <motion.button whileHover={{ y: -2 }} className="btn btn-login-luxury">
                                    MEMBERSHIP
                                </motion.button>
                            </Link>
                        )}

                        {/* Mobile Toggle */}
                        <button className="btn d-lg-none ml-3" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            <Menu />
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- 3. MOBILE MENU OVERLAY --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 100, damping: 20 }} className="mobile-overlay-menu bg-white p-4">
                        <div className="d-flex justify-content-between align-items-center mb-5">
                             <h2 className="font-weight-bold">ESHOPPER</h2>
                             <button className="btn" onClick={() => setIsMobileMenuOpen(false)}><X /></button>
                        </div>
                        <ul className="list-unstyled">
                            {navLinks.map((link) => (
                                <li key={link.name} className="mb-4">
                                    <Link onClick={() => setIsMobileMenuOpen(false)} className="display-4 font-weight-bold text-dark h2" to={link.path}>{link.name}</Link>
                                </li>
                            ))}
                            {role === "Admin" && <li><Link onClick={() => setIsMobileMenuOpen(false)} className="text-danger h3" to="/admin-home">Admin Access</Link></li>}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- PREMIUM GLOBAL CSS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Inter:wght@400;600;800&display=swap');

                .navbar-wrapper {
                    position: fixed; top: 45px; left: 0; width: 100%; z-index: 1000;
                    background: transparent; padding: 25px 0; transition: 0.4s all cubic-bezier(0.25, 1, 0.5, 1);
                }
                .luxury-top-ribbon {
                    height: 45px; background: linear-gradient(90deg, #0a0a0a, #1a1a1a, #0a0a0a);
                    color: rgba(255,255,255,0.7); position: fixed; top: 0; width: 100%; z-index: 1001;
                    font-size: 11px; letter-spacing: 2px;
                }
                .nav-scrolled {
                    top: 0; padding: 12px 0;
                    background: rgba(255,255,255,0.85) !important;
                    backdrop-filter: blur(20px) saturate(160%);
                    box-shadow: 0 4px 30px rgba(0,0,0,0.05);
                }

                /* LOGO STYLING */
                .premium-logo { position: relative; font-family: 'Cinzel', serif; letter-spacing: 5px; color: #000; font-weight: 800; display: flex; align-items: center; }
                .brand-e { font-size: 32px; background: #000; color: #fff; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; margin-right: 5px; }
                .brand-text { font-size: 22px; }
                .logo-dot { color: #17a2b8; font-size: 35px; line-height: 0; }
                .logo-underline { height: 2px; width: 0%; background: #000; position: absolute; bottom: -5px; transition: 0.3s; }
                .premium-logo:hover .logo-underline { width: 100%; }

                /* NAVIGATION LINKS */
                .lux-nav-link { 
                    position: relative; padding: 10px 0; color: #555 !important; font-weight: 700;
                    font-size: 13px; text-transform: uppercase; letter-spacing: 2px; transition: 0.3s;
                }
                .lux-nav-link:hover { color: #000 !important; }
                .lux-nav-link.active { color: #17a2b8 !important; }
                .nav-active-bar { height: 2px; background: #17a2b8; width: 100%; position: absolute; bottom: 0; border-radius: 20px; }
                .nav-item { margin: 0 15px; }

                /* ADMIN PILL */
                .admin-access-badge {
                    background: #ff4757; color: white !important; font-size: 10px; font-weight: 800;
                    padding: 6px 15px; border-radius: 50px; text-decoration: none !important;
                    box-shadow: 0 5px 15px rgba(255,71,87,0.3);
                }

                /* ICONS & BUTTONS */
                .btn-login-luxury {
                    background: #000; color: #fff; padding: 12px 30px; border-radius: 50px;
                    font-size: 11px; font-weight: 800; letter-spacing: 2px; border: none; shadow: 0 10px 20px rgba(0,0,0,0.15);
                }
                .btn-profile-premium { background: #f4f4f4; border: 1px solid #ddd; font-weight: 700; font-size: 13px; padding: 10px 20px; }
                .cart-icon-luxury { color: #222; }
                .premium-cart-dot {
                    position: absolute; top: -5px; right: -5px; width: 10px; height: 10px;
                    background: #17a2b8; border-radius: 50%; border: 2px solid #fff;
                }

                .premium-dropdown { margin-top: 15px; padding: 10px; border-radius: 20px; min-width: 220px; }
                .dropdown-item { font-size: 13px; font-weight: 600; padding: 10px 15px; transition: 0.2s; border-radius: 10px; }
                .dropdown-item:hover { background: #f0faff !important; color: #17a2b8; transform: translateX(5px); }

                /* MOBILE MENU */
                .mobile-overlay-menu { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2000; }
            `}} />
        </>
    )
}