import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion' // Animations ke liye

export default function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isSticky, setIsSticky] = useState(false)

    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")

    // Sticky Navbar Logic
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) setIsSticky(true)
            else setIsSticky(false)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function logout() {
        if (window.confirm("Are you sure you want to logout?")) {
            localStorage.clear()
            navigate("/login")
        }
    }

    // Active Link Style
    const activeClass = (path) => location.pathname === path ? "nav-link active-premium" : "nav-link"

    return (
        <>
            {/* --- TOP ELEGANT BAR --- */}
            <div className="py-2 bg-black d-none d-lg-block">
                <div className="container">
                    <div className="row no-gutters d-flex align-items-center">
                        <div className="col-md-6">
                            <span className="text-white-50 small mr-3">
                                <i className="icon-phone mr-1 text-info"></i> +91 8447859784
                            </span>
                            <span className="text-white-50 small">
                                <i className="icon-paper-plane mr-1 text-info"></i> theafzalhussain786@gmail.com
                            </span>
                        </div>
                        <div className="col-md-6 text-right">
                            <span className="text-white-50 small text-uppercase" style={{ letterSpacing: '2px' }}>
                                Luxury Fashion • Worldwide Shipping
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN PREMIUM NAVBAR --- */}
            <nav className={`navbar navbar-expand-lg navbar-dark ftco_navbar bg-dark ftco-navbar-light ${isSticky ? 'scrolled awake shadow-sm' : ''}`} id="ftco-navbar">
                <div className="container">
                    <Link className="navbar-brand font-weight-bold" to="/">
                        <motion.span 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            style={{ letterSpacing: '2px', fontSize: '28px' }}
                        >
                            ESHOPPER<span className="text-info">.</span>
                        </motion.span>
                    </Link>
                    
                    <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#ftco-nav">
                        <span className="oi oi-menu"></span> Menu
                    </button>

                    <div className="collapse navbar-collapse" id="ftco-nav">
                        <ul className="navbar-nav ml-auto align-items-center">
                            <li className="nav-item">
                                <Link to="/" className={activeClass("/")}>Home</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/shop/All/" className={activeClass("/shop/All/")}>Shop</Link>
                            </li>
                            {/* ADDED ABOUT TAB */}
                            <li className="nav-item">
                                <Link to="/about" className={activeClass("/about")}>About</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/contact" className={activeClass("/contact")}>Contact</Link>
                            </li>

                            {/* ADMIN PANEL: Dynamic Styling */}
                            {role === "Admin" && (
                                <li className="nav-item">
                                    <Link to="/admin-home" className="nav-link admin-badge">Admin</Link>
                                </li>
                            )}

                            {/* CART & WISHLIST ICONS */}
                            <li className="nav-item d-flex align-items-center ml-lg-3">
                                <Link to="/wishlist" className="nav-link icon-link" title="Wishlist">
                                    <motion.span whileHover={{ scale: 1.2 }} className="icon-heart text-danger"></motion.span>
                                </Link>
                                <Link to="/cart" className="nav-link icon-link position-relative" title="Cart">
                                    <motion.span whileHover={{ scale: 1.2 }} className="icon-shopping_cart text-info"></motion.span>
                                </Link>
                            </li>

                            {/* USER DROPDOWN */}
                            {localStorage.getItem("login") ? (
                                <li className="nav-item dropdown ml-lg-3">
                                    <Link className="nav-link dropdown-toggle user-name-btn rounded-pill px-3" to="#" id="userDropdown" data-toggle="dropdown">
                                        <i className="icon-user-o mr-2"></i>{name?.split(' ')[0]}
                                    </Link>
                                    <div className="dropdown-menu dropdown-menu-right shadow-lg border-0 rounded-lg">
                                        <Link className="dropdown-item py-2" to="/profile"><i className="icon-vcard-o mr-2"></i> My Profile</Link>
                                        <Link className="dropdown-item py-2" to="/wishlist"><i className="icon-heart-o mr-2"></i> My Wishlist</Link>
                                        <Link className="dropdown-item py-2" to="/cart"><i className="icon-shopping_basket mr-2"></i> My Cart</Link>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item py-2 text-danger" onClick={logout}><i className="icon-power-off mr-2"></i> Logout</button>
                                    </div>
                                </li>
                            ) : (
                                <li className="nav-item ml-lg-3">
                                    <Link to="/login" className="btn btn-info rounded-pill px-4 py-2 small shadow-sm">LOGIN</Link>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>

            {/* --- CUSTOM CSS FOR PREMIUM FEEL --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .ftco-navbar-light { background: #fff !important; top: 0; }
                .ftco-navbar-light.scrolled { position: fixed; background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(10px); }
                
                .nav-link { 
                    font-weight: 600 !important; 
                    text-transform: uppercase !important; 
                    letter-spacing: 1px !important; 
                    font-size: 13px !important;
                    transition: 0.3s all ease;
                }
                
                .active-premium { color: #17a2b8 !important; }
                
                .admin-badge {
                    background: #ff4757;
                    color: white !important;
                    border-radius: 5px;
                    padding: 5px 12px !important;
                    margin: 0 10px;
                    font-size: 11px !important;
                    box-shadow: 0 4px 10px rgba(255,71,87,0.3);
                }

                .icon-link { font-size: 20px !important; padding: 10px !important; }
                
                .user-name-btn {
                    background: #f8f9fa;
                    color: #333 !important;
                    border: 1px solid #eee;
                    font-weight: 700 !important;
                }

                .dropdown-menu { margin-top: 15px; border-radius: 12px; overflow: hidden; }
                .dropdown-item { font-size: 13px; font-weight: 600; }
                .dropdown-item:hover { background-color: #f0faff; color: #17a2b8; }
                
                .active-premium::after {
                    content: '';
                    display: block;
                    width: 100%;
                    height: 2px;
                    background: #17a2b8;
                    margin-top: 2px;
                }
            `}} />
        </>
    )
}