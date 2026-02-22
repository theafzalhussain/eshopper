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
        <header className={`header-main ${isScrolled ? 'header-fixed shadow-lg' : ''}`}>
            {/* --- 🌟 PREMIUM GRADIENT TOP RIBBON (Matches your Image) --- */}
            <div className="top-premium-ribbon text-white d-none d-lg-block overflow-hidden">
                <div className="container h-100 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <span className="dot-blink mr-2"></span>
                        <span className="small-text font-weight-bold">
                            Welcome to Eshopper Luxury Concierge • Summer Edition 2024
                        </span>
                    </div>
                    <div className="d-flex align-items-center gap-4">
                        <span className="small-text opacity-75 mr-4"><i className="icon-phone mr-1"></i> +91 8447859784</span>
                        <span className="small-text opacity-75"><i className="icon-envelope mr-1"></i> support@eshopper.com</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN NAVBAR --- */}
            <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom py-3">
                <div className="container">
                    <Link className="navbar-brand font-weight-bold" style={{letterSpacing:'4px'}} to="/">
                        ESHOPPER<span className="text-info">.</span>
                    </Link>
                    <div className="collapse navbar-collapse" id="eshopNav">
                        <ul className="navbar-nav mx-auto">
                            <li className="nav-item mx-2"><Link to="/" className={`nav-link premium-nav-link ${isActive('/')?'active-link':''}`}>Home</Link></li>
                            <li className="nav-item mx-2"><Link to="/shop/All/" className={`nav-link premium-nav-link ${isActive('/shop/All/')?'active-link':''}`}>Shop</Link></li>
                            <li className="nav-item mx-2"><Link to="/about" className={`nav-link premium-nav-link ${isActive('/about')?'active-link':''}`}>About</Link></li>
                            <li className="nav-item mx-2"><Link to="/contact" className={`nav-link premium-nav-link ${isActive('/contact')?'active-link':''}`}>Contact</Link></li>
                            {role === "Admin" && (
                                <li className="nav-item ml-2">
                                    <Link to="/admin-home" className="badge-admin-pill">ADMIN PANEL</Link>
                                </li>
                            )}
                        </ul>
                        <div className="navbar-right-box">
                            <Link to="/cart" className="text-dark mr-4 h5 position-relative">
                                <i className="icon-shopping_cart"></i>
                                <span className="cart-badge bg-info"></span>
                            </Link>
                            {localStorage.getItem("login") ? (
                                <div className="dropdown d-inline">
                                    <button className="btn-user shadow-sm" data-toggle="dropdown">
                                        <i className="icon-user mr-1"></i> {name?.split(' ')[0]}
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-right border-0 shadow-xl rounded-xl">
                                        <Link className="dropdown-item p-2" to="/profile">Profile Settings</Link>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item p-2 text-danger" onClick={logout}>Sign Out</button>
                                    </div>
                                </div>
                            ) : <Link to="/login" className="btn btn-info rounded-pill px-4 btn-sm font-weight-bold">LOGIN</Link>}
                        </div>
                    </div>
                </div>
            </nav>

            <style dangerouslySetInnerHTML={{ __html: `
                .header-main { position: relative; z-index: 1000; width: 100%; background: #fff; }
                .top-premium-ribbon { 
                    height: 45px; 
                    /* Premium Dark Gradient logic */
                    background: linear-gradient(90deg, #111 0%, #1c0f2a 35%, #4c1143 70%, #0c001c 100%);
                    font-size: 11px;
                    letter-spacing: 1px;
                }
                .dot-blink { width: 6px; height: 6px; background: #28a745; border-radius: 50%; box-shadow: 0 0 10px #28a745; animation: blink 2s infinite; }
                @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                
                .header-fixed { position: fixed; top: 0; left: 0; width: 100%; animation: slideD 0.4s ease; }
                @keyframes slideD { from {transform:translateY(-100%)} to {transform:translateY(0)} }
                
                .badge-admin-pill { background: #ff4757; color: #fff !important; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 50px; text-decoration: none !important; margin-left: 10px; }
                .btn-user { background: #f8f9fa; border: 1px solid #eee; border-radius: 50px; padding: 5px 20px; font-weight: 700; font-size: 12px; color: #333; }
                .active-link { color: #17a2b8 !important; font-weight: 800 !important; }
                .cart-badge { position: absolute; top: -5px; right: -8px; width: 8px; height: 8px; border-radius: 50%; border: 1px solid white; }
                .rounded-xl { border-radius: 15px !important; }
            `}} />
        </header>
    )
}