import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)

    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")

    // Scroll handler to manage sticky look
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 40) setIsScrolled(true)
            else setIsScrolled(false)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function logout() {
        if (window.confirm("Do you want to logout?")) {
            localStorage.clear()
            navigate("/login")
        }
    }

    const isActive = (path) => location.pathname === path

    return (
        <header className={`header-main ${isScrolled ? 'header-fixed shadow-sm' : ''}`}>
            {/* --- 1. TOP BAR (FIXED HEIGHT) --- */}
            <div className={`top-bar bg-black text-white d-none d-lg-block transition-all ${isScrolled ? 'top-bar-hidden' : ''}`}>
                <div className="container h-100">
                    <div className="row h-100 align-items-center">
                        <div className="col-md-6">
                            <span className="small font-weight-bold opacity-75" style={{ letterSpacing: '1px' }}>
                                ✨ LUXURY FASHION EXPERIENCE
                            </span>
                        </div>
                        <div className="col-md-6 text-right">
                            <span className="small opacity-75 mr-4"><i className="icon-phone mr-1"></i> +91 8447859784</span>
                            <span className="small opacity-75"><i className="icon-envelope mr-1"></i> info@eshopper.com</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 2. MAIN NAVBAR --- */}
            <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
                <div className="container">
                    {/* PREMIUM LOGO */}
                    <Link className="navbar-brand" to="/">
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="font-weight-bold"
                            style={{ fontSize: '24px', letterSpacing: '3px', color: '#000' }}
                        >
                            ESHOPPER<span className="text-info">.</span>
                        </motion.div>
                    </Link>

                    <button className="navbar-toggler border-0 shadow-none" type="button" data-toggle="collapse" data-target="#eshopNav">
                        <span className="icon-menu h4 mb-0"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="eshopNav">
                        <ul className="navbar-nav mx-auto">
                            {[
                                { name: "Home", path: "/" },
                                { name: "Shop", path: "/shop/All/" },
                                { name: "About", path: "/about" },
                                { name: "Contact", path: "/contact" }
                            ].map((link) => (
                                <li className="nav-item mx-lg-3" key={link.name}>
                                    <Link to={link.path} className={`nav-link premium-nav-link ${isActive(link.path) ? 'active' : ''}`}>
                                        {link.name}
                                        {isActive(link.path) && (
                                            <motion.div layoutId="nav-line" className="nav-active-line" />
                                        )}
                                    </Link>
                                </li>
                            ))}

                            {role === "Admin" && (
                                <li className="nav-item mx-lg-2">
                                    <Link to="/admin-home" className="nav-link">
                                        <span className="admin-pill shadow-sm">ADMIN</span>
                                    </Link>
                                </li>
                            )}
                        </ul>

                        {/* --- 3. RIGHT ICONS & USER --- */}
                        <div className="navbar-right d-flex align-items-center">
                            {/* CART ICON */}
                            <Link to="/cart" className="text-dark position-relative mr-4 nav-icon-link">
                                <i className="icon-shopping_cart h5 mb-0"></i>
                                <span className="badge-dot bg-info"></span>
                            </Link>

                            {/* USER ACCOUNT (UPDATED) */}
                            {localStorage.getItem("login") ? (
                                <div className="dropdown ml-2">
                                    {/* NEW DROPDOWN TOGGLE LINK */}
                                    <Link className="nav-link dropdown-toggle user-name-btn rounded-pill px-3" to="#" id="userDropdown" data-toggle="dropdown">
                                        <i className="icon-user-o mr-2"></i>
                                        {localStorage.getItem("name") ? localStorage.getItem("name").split(' ')[0] : "Account"}
                                    </Link>
                                    
                                    <div className="dropdown-menu dropdown-menu-right border-0 shadow-xl rounded-xl mt-2">
                                        <Link className="dropdown-item py-2" to="/profile"><i className="icon-vcard-o mr-2"></i> Profile</Link>
                                        <Link className="dropdown-item py-2" to="/cart"><i className="icon-shopping_basket mr-2"></i> My Orders</Link>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item py-2 text-danger" onClick={logout}>
                                            <i className="icon-power-off mr-2"></i> Sign Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <Link to="/login" className="btn btn-info btn-login rounded-pill px-4 font-weight-bold">
                                    LOGIN
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- CUSTOM CSS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .header-main {
                    width: 100%;
                    z-index: 1100;
                    position: relative;
                    background: white;
                }
                
                .header-fixed {
                    position: fixed;
                    top: 0;
                    left: 0;
                    animation: slideDown 0.4s ease-out;
                }

                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }

                .top-bar { height: 40px; transition: 0.3s all ease; }
                .top-bar-hidden { height: 0; overflow: hidden; opacity: 0; }

                .navbar { padding: 1rem 0; background: white !important; }
                .header-fixed .navbar { padding: 0.6rem 0; }

                .premium-nav-link {
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: #555 !important;
                    position: relative;
                }

                .premium-nav-link.active { color: #17a2b8 !important; }

                .nav-active-line {
                    height: 2px;
                    background: #17a2b8;
                    width: 100%;
                    position: absolute;
                    bottom: -5px;
                    left: 0;
                }

                .admin-pill {
                    background: #ff4757;
                    color: white !important;
                    padding: 4px 12px;
                    border-radius: 50px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                }

                .badge-dot {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .user-name-btn { 
                    font-size: 14px; 
                    font-weight: 700; 
                    color: #333 !important;
                    background: #f8f9fa;
                }
                
                .rounded-xl { border-radius: 15px !important; }
                .shadow-xl { box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important; }
                
                .dropdown-item { font-size: 14px; font-weight: 600; padding: 10px 20px; }
                .dropdown-item:hover { background: #f8f9fa; color: #17a2b8; transform: translateX(5px); transition: 0.2s; }

                .transition-all { transition: all 0.3s ease; }

                @media (max-width: 991px) {
                    .navbar-collapse { background: white; padding: 20px; border-radius: 15px; margin-top: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
                    .header-fixed { position: fixed; }
                }
            `}} />
        </header>
    )
}