import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion' // Advanced animations

export default function Navbaar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)

    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")

    // Scroll effect logic
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) setIsScrolled(true)
            else setIsScrolled(false)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function logout() {
        if (window.confirm("Logout from your session?")) {
            localStorage.clear()
            navigate("/login")
        }
    }

    // Active link highlighting logic
    const isActive = (path) => location.pathname === path

    return (
        <>
            {/* --- 1. MINIMAL TOP NOTIFICATION BAR --- */}
            <div className="py-2 bg-black text-white overflow-hidden d-none d-lg-block">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <motion.span 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="small opacity-75 font-weight-bold"
                                style={{ letterSpacing: '2px' }}
                            >
                                FREE SHIPPING ON ALL ORDERS OVER ₹1999
                            </motion.span>
                        </div>
                        <div className="col-md-6 text-right">
                            <div className="d-inline-flex gap-4 small opacity-75">
                                <span className="mr-3"><i className="icon-phone mr-1"></i> +91 8447859784</span>
                                <span><i className="icon-envelope mr-1"></i> theafzalhussain786@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 2. LUXURY STICKY NAVBAR --- */}
            <nav className={`navbar navbar-expand-lg navbar-light main-navbar transition-all ${isScrolled ? 'navbar-glass shadow-lg py-2' : 'py-4'}`}>
                <div className="container">
                    {/* LOGO ANIMATION */}
                    <Link className="navbar-brand" to="/">
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="font-weight-bold d-flex align-items-center"
                            style={{ fontSize: '26px', letterSpacing: '4px', color: '#111' }}
                        >
                            ESHOPPER<span className="text-info">.</span>
                        </motion.div>
                    </Link>

                    <button className="navbar-toggler border-0" type="button" data-toggle="collapse" data-target="#eshopNav">
                        <span className="icon-menu h4 mb-0"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="eshopNav">
                        <ul className="navbar-nav mx-auto align-items-center">
                            {[
                                { name: "Home", path: "/" },
                                { name: "Shop", path: "/shop/All/" },
                                { name: "About", path: "/about" }, // About Tab Added
                                { name: "Contact", path: "/contact" }
                            ].map((link) => (
                                <li className="nav-item mx-lg-3" key={link.name}>
                                    <Link to={link.path} className={`nav-link premium-link ${isActive(link.path) ? 'active' : ''}`}>
                                        {link.name}
                                        {isActive(link.path) && (
                                            <motion.div layoutId="underline" className="active-dot" />
                                        )}
                                    </Link>
                                </li>
                            ))}

                            {/* ADMIN PORTAL ACCESS */}
                            {role === "Admin" && (
                                <li className="nav-item mx-lg-2">
                                    <Link to="/admin-home" className="nav-link">
                                        <span className="badge badge-info px-3 py-2 rounded-pill font-weight-bold">ADMIN PANEL</span>
                                    </Link>
                                </li>
                            )}
                        </ul>

                        {/* --- 3. ACTION ICONS & USER SECTION --- */}
                        <div className="d-flex align-items-center">
                            {/* CART ICON WITH BREATHING EFFECT */}
                            <motion.div whileHover={{ scale: 1.1 }} className="position-relative mr-4">
                                <Link to="/cart" className="text-dark h5 mb-0">
                                    <i className="icon-shopping_cart"></i>
                                    <span className="cart-badge bg-info"></span>
                                </Link>
                            </motion.div>

                            {/* USER LOGIN / DROPDOWN */}
                            <AnimatePresence mode="wait">
                                {localStorage.getItem("login") ? (
                                    <div className="dropdown ml-2">
                                        <motion.button 
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="btn btn-dark rounded-pill px-4 py-2 d-flex align-items-center shadow-sm"
                                            data-toggle="dropdown"
                                        >
                                            <i className="icon-user-circle-o mr-2"></i>
                                            <span className="small font-weight-bold">{name?.split(' ')[0]}</span>
                                        </motion.button>
                                        <div className="dropdown-menu dropdown-menu-right border-0 shadow-xl rounded-2xl mt-3 p-2">
                                            <Link className="dropdown-item rounded-lg py-2" to="/profile">
                                                <i className="icon-vcard-o mr-2"></i> My Profile
                                            </Link>
                                            <Link className="dropdown-item rounded-lg py-2" to="/cart">
                                                <i className="icon-shopping_basket mr-2"></i> My Cart
                                            </Link>
                                            <div className="dropdown-divider mx-2"></div>
                                            <button className="dropdown-item rounded-lg py-2 text-danger font-weight-bold" onClick={logout}>
                                                <i className="icon-power-off mr-2"></i> Logout
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <Link to="/login">
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="btn btn-info rounded-pill px-5 py-2 font-weight-bold shadow-lg"
                                        >
                                            LOGIN
                                        </motion.button>
                                    </Link>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- CUSTOM CSS FOR HIGH-END UI --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .main-navbar {
                    position: fixed;
                    width: 100%;
                    top: 0;
                    z-index: 1000;
                    background: transparent;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .navbar-glass {
                    background: rgba(255, 255, 255, 0.85) !important;
                    backdrop-filter: blur(15px) saturate(180%);
                    -webkit-backdrop-filter: blur(15px);
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                }

                .premium-link {
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: #444 !important;
                    position: relative;
                    padding: 10px 0 !important;
                }

                .premium-link.active { color: #17a2b8 !important; }

                .active-dot {
                    width: 5px;
                    height: 5px;
                    background: #17a2b8;
                    border-radius: 50%;
                    margin: 2px auto 0;
                }

                .cart-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .rounded-2xl { border-radius: 18px !important; }
                .rounded-lg { border-radius: 10px !important; }
                
                .shadow-xl {
                    box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important;
                }

                .dropdown-item {
                    transition: 0.2s all ease;
                    font-size: 14px;
                }
                
                .dropdown-item:hover {
                    background-color: #f0faff !important;
                    color: #17a2b8 !important;
                    transform: translateX(5px);
                }

                /* Fixed padding for content below sticky nav */
                body { padding-top: 0px; } 

                @media (max-width: 991px) {
                    .main-navbar { background: white !important; padding: 15px 0 !important; }
                    .navbar-collapse { padding-top: 20px; }
                }
            `}} />
        </>
    )
}