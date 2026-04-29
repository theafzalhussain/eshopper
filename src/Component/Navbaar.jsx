import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingCart, User, Sparkles, Phone, Mail } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { BASE_URL } from '../constants'
import { getCart } from '../Store/ActionCreaters/CartActionCreators'

export default function Navbaar() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const location = useLocation()
    const desktopProfileDropdownRef = useRef(null)
    const mobileProfileDropdownRef = useRef(null)
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const [profilePic, setProfilePic] = useState(localStorage.getItem('pic') || '')
    const [cartAnimation, setCartAnimation] = useState(false)
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("name")
    
    // Redux cart selector with animation trigger (use items array)
    const cartState = useSelector(state => state.CartStateData)
    const cartItems = cartState && cartState.items ? cartState.items : [];
    const userId = localStorage.getItem('userid')
    const userCartItems = cartItems.filter((item) => String(item.userid || '') === String(userId || ''))
    const cartCount = userCartItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
    const prevCartCount = useRef(cartCount)

    // 🎯 Trigger animation when product is added to cart
    useEffect(() => {
        if (cartCount > prevCartCount.current) {
            // Product added - trigger premium animation!
            setCartAnimation(true)
            setTimeout(() => setCartAnimation(false), 800)
        }
        prevCartCount.current = cartCount
    }, [cartCount])

    useEffect(() => {
        if (localStorage.getItem('login')) dispatch(getCart())
    }, [dispatch, location.pathname])

    useEffect(() => {
        const handleScroll = () => { setIsScrolled(window.scrollY > 40) }
        window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false)
        setIsProfileMenuOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target
            const insideDesktop = desktopProfileDropdownRef.current && desktopProfileDropdownRef.current.contains(target)
            const insideMobile = mobileProfileDropdownRef.current && mobileProfileDropdownRef.current.contains(target)

            if (!insideDesktop && !insideMobile) {
                setIsProfileMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [])

    // Prevent body scroll when menu is open
    useEffect(() => {
        const mobileViewport = typeof window !== 'undefined' ? window.innerWidth < 992 : false
        const shouldLock = isMobileMenuOpen || (isProfileMenuOpen && mobileViewport)

        if (shouldLock) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isMobileMenuOpen, isProfileMenuOpen])

    useEffect(() => {
        const loadUserProfilePic = async () => {
            try {
                const userId = localStorage.getItem('userid')
                const isLoggedIn = localStorage.getItem('login')

                if (!userId || !isLoggedIn) return

                const res = await fetch(`${BASE_URL}/user/${userId}`)
                if (!res.ok) return

                const user = await res.json()
                const pic = user?.pic || ''
                if (pic) {
                    setProfilePic(pic)
                    localStorage.setItem('pic', pic)
                } else {
                    setProfilePic(localStorage.getItem('pic') || '')
                }
            } catch (_) {
                // fallback: keep localStorage image if present
                setProfilePic(localStorage.getItem('pic') || '')
            }
        }

        loadUserProfilePic()

        const onProfileUpdated = () => {
            setProfilePic(localStorage.getItem('pic') || '')
            loadUserProfilePic()
        }

        window.addEventListener('profile-updated', onProfileUpdated)
        return () => window.removeEventListener('profile-updated', onProfileUpdated)
    }, [location.pathname])

    const handleTransitionNavigate = (path) => {
        navigate(path);
        window.scrollTo(0, 0);
    };

    const logout = () => { localStorage.clear(); handleTransitionNavigate("/login") }
    const isActive = (path) => location.pathname === path
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen((prev) => {
            const next = !prev
            if (next) setIsProfileMenuOpen(false)
            return next
        })
    }
    const toggleProfileMenu = () => {
        setIsProfileMenuOpen((prev) => {
            const next = !prev
            if (next) setIsMobileMenuOpen(false)
            return next
        })
    }

    return (
        <header className={`header-main ${isScrolled ? 'header-fixed' : ''}`}>

            {/* --- 🌟 ULTRA PREMIUM TOP RIBBON --- */}
            <div className="top-premium-ribbon d-none d-lg-block">
                <div className="container h-100 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <Sparkles size={13} className="text-gold mr-2 pulse-gold" />
                        <span className="ribbon-text">
                            Welcome to Eshopper Luxury Concierge <span className="ribbon-divider">|</span> Exclusive 2025-2026 Collection
                        </span>
                    </div>
                    <div className="d-flex align-items-center">
                        <a href="tel:+918447859784" className="ribbon-link mr-4">
                            <Phone size={12} className="text-gold mr-2" /> +91 8447859784
                        </a>
                        <a href="mailto:support@eshopperr.me" className="ribbon-link">
                            <Mail size={12} className="text-gold mr-2" /> support@eshopperr.me
                        </a>
                    </div>
                </div>
            </div>

            {/* --- MAIN NAVBAR --- */}
            <nav className="navbar navbar-light bg-white border-bottom py-2 shadow-sm">
                <div className="container">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        {/* --- ORIGINAL LOGO --- */}
                        <Link className="navbar-brand d-flex align-items-center mb-0" to="/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/'); }}>
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
                                <li className="nav-item mx-2"><Link to="/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/'); }} className={`nav-link premium-nav-link ${isActive('/')?'active-link':''}`}>Home</Link></li>
                                <li className="nav-item mx-2"><Link to="/shop/All/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All/'); }} className={`nav-link premium-nav-link ${isActive('/shop/All/')?'active-link':''}`}>Shop</Link></li>
                                <li className="nav-item mx-2"><Link to="/about" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/about'); }} className={`nav-link premium-nav-link ${isActive('/about')?'active-link':''}`}>About</Link></li>
                                <li className="nav-item mx-2"><Link to="/contact" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/contact'); }} className={`nav-link premium-nav-link ${isActive('/contact')?'active-link':''}`}>Contact</Link></li>
                                {role === "Admin" && (
                                    <li className="nav-item mx-2">
                                        <Link to="/admin-home" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/admin-home'); }} className="badge-admin-pill">ADMIN</Link>
                                    </li>
                                )}
                            </ul>
                            <div className="navbar-right-box d-flex align-items-center ml-4">
                                <Link to="/cart" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/cart'); }} className="text-dark mr-4 h5 position-relative mb-0" title="Shopping Cart">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ 
                                            scale: cartAnimation ? [1, 1.2, 0.95, 1.05, 1] : 1, 
                                            rotate: cartAnimation ? [0, -10, 10, -10, 0] : 0,
                                            opacity: 1 
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{
                                            scale: { duration: 0.6, ease: "easeInOut" },
                                            rotate: { duration: 0.5, ease: "easeInOut" }
                                        }}
                                    >
                                        <ShoppingCart size={22} />
                                    </motion.div>
                                    
                                    {/* Premium Cart Badge - Compact & Glowing */}
                                    <AnimatePresence mode="wait">
                                        {cartCount > 0 && (
                                            <motion.div
                                                key={cartCount}
                                                initial={{ scale: 0, y: -10 }}
                                                animate={{ 
                                                    scale: cartAnimation ? [0, 1.35, 0.88, 1.08, 1] : 1, 
                                                    y: 0 
                                                }}
                                                exit={{ scale: 0, y: -10 }}
                                                transition={{ 
                                                    type: 'spring', 
                                                    stiffness: 450, 
                                                    damping: 12,
                                                    duration: 0.5
                                                }}
                                                className={`cart-badge-premium ${cartAnimation ? 'cart-badge-added' : ''}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '-10px',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    boxShadow: '0 0 12px rgba(16,185,129,0.6), 0 4px 12px rgba(16,185,129,0.3), inset 0 1px 3px rgba(255,255,255,0.4)',
                                                    border: '2px solid rgba(255,255,255,0.95)',
                                                    letterSpacing: '0.2px',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                {cartCount > 99 ? '99+' : cartCount}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Link>
                                {localStorage.getItem("login") ? (
                                    <div className="premium-dropdown-wrapper" ref={desktopProfileDropdownRef}>
                                        <button
                                            type="button"
                                            className="btn-user premium-user-btn"
                                            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                                            aria-expanded={isProfileMenuOpen}
                                        >
                                            <div className="user-avatar">
                                                {profilePic ? (
                                                    <img src={profilePic} alt={name || 'User'} className="nav-user-img" />
                                                ) : (
                                                    <User size={18} className="text-info" />
                                                )}
                                            </div>
                                            <span className="user-name">{name?.split(' ')[0]}</span>
                                            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>

                                        <AnimatePresence>
                                            {isProfileMenuOpen && (
                                                <motion.div
                                                    className="dropdown-menu dropdown-menu-right premium-dropdown-menu show"
                                                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                                    transition={{ duration: 0.18 }}
                                                >
                                                    <div className="dropdown-header-custom">
                                                        <div className="user-info-header">
                                                            <div className="user-avatar-large">
                                                                {profilePic ? (
                                                                    <img src={profilePic} alt={name || 'User'} className="nav-user-img" />
                                                                ) : (
                                                                    <User size={24} className="text-info" />
                                                                )}
                                                            </div>
                                                            <div className="user-details">
                                                                <h6 className="mb-0">{name}</h6>
                                                                <small className="text-muted">Premium Member</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="dropdown-divider"></div>
                                                    <Link className="dropdown-item premium-dropdown-item" to="/profile" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/profile'); }}>
                                                        <i className="icon-vcard mr-2"></i>
                                                        <span>My Profile</span>
                                                    </Link>
                                                    <Link className="dropdown-item premium-dropdown-item" to="/my-orders" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/my-orders'); }}>
                                                        <ShoppingCart size={14} className="mr-2" style={{display:'inline'}} />
                                                        <span>My Orders</span>
                                                    </Link>
                                                    <Link className="dropdown-item premium-dropdown-item" to="/wishlist" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/wishlist'); }}>
                                                        <i className="icon-heart mr-2"></i>
                                                        <span>Wishlist</span>
                                                    </Link>
                                                    <Link className="dropdown-item premium-dropdown-item" to="/update-profile" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/update-profile'); }}>
                                                        <i className="icon-settings mr-2"></i>
                                                        <span>Settings</span>
                                                    </Link>
                                                    <div className="dropdown-divider"></div>
                                                    <button className="dropdown-item premium-dropdown-item logout-item" onClick={logout}>
                                                        <i className="icon-sign-out mr-2"></i>
                                                        <span>Logout</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : <Link to="/login" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/login'); }} className="btn btn-dark rounded-pill px-4 btn-sm font-weight-bold shadow-sm">LOGIN</Link>}
                            </div>
                        </div>

                        {/* --- MOBILE MENU TOGGLE (Visible on Mobile Only) --- */}
                        <div className="mobile-menu-toggle d-lg-none d-flex align-items-center">
                            {localStorage.getItem("login") && (
                                <div className="premium-dropdown-wrapper mobile-profile-wrapper mr-3" ref={mobileProfileDropdownRef}>
                                    <button
                                        type="button"
                                        className="btn-user premium-user-btn mobile-profile-btn"
                                        onClick={toggleProfileMenu}
                                        aria-expanded={isProfileMenuOpen}
                                    >
                                        <div className="user-avatar mobile-avatar">
                                            {profilePic ? (
                                                <img src={profilePic} alt={name || 'User'} className="nav-user-img" />
                                            ) : (
                                                <User size={16} className="text-info" />
                                            )}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isProfileMenuOpen && (
                                            <>
                                            <motion.button
                                                type="button"
                                                aria-label="Close profile menu"
                                                className="mobile-profile-backdrop"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                            />
                                            <motion.div
                                                className="dropdown-menu premium-dropdown-menu mobile-profile-menu show"
                                                initial={{ opacity: 0, y: 22, scale: 0.99 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 18, scale: 0.99 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="dropdown-header-custom">
                                                    <div className="user-info-header">
                                                        <div className="user-avatar-large">
                                                            {profilePic ? (
                                                                <img src={profilePic} alt={name || 'User'} className="nav-user-img" />
                                                            ) : (
                                                                <User size={24} className="text-info" />
                                                            )}
                                                        </div>
                                                        <div className="user-details">
                                                            <h6 className="mb-0">{name}</h6>
                                                            <small className="text-muted">Premium Member</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="dropdown-divider"></div>
                                                <Link className="dropdown-item premium-dropdown-item" to="/profile" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/profile'); }}>
                                                    <i className="icon-vcard mr-2"></i>
                                                    <span>My Profile</span>
                                                </Link>
                                                <Link className="dropdown-item premium-dropdown-item" to="/my-orders" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/my-orders'); }}>
                                                    <ShoppingCart size={14} className="mr-2" style={{display:'inline'}} />
                                                    <span>My Orders</span>
                                                </Link>
                                                <Link className="dropdown-item premium-dropdown-item" to="/wishlist" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/wishlist'); }}>
                                                    <i className="icon-heart mr-2"></i>
                                                    <span>Wishlist</span>
                                                </Link>
                                                <Link className="dropdown-item premium-dropdown-item" to="/update-profile" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleTransitionNavigate('/update-profile'); }}>
                                                    <i className="icon-settings mr-2"></i>
                                                    <span>Settings</span>
                                                </Link>
                                                <div className="dropdown-divider"></div>
                                                <button className="dropdown-item premium-dropdown-item logout-item" onClick={logout}>
                                                    <i className="icon-sign-out mr-2"></i>
                                                    <span>Logout</span>
                                                </button>
                                            </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <Link to="/cart" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/cart'); }} className="mobile-cart-link position-relative" title="Shopping Cart">
                                <motion.div
                                    className="mobile-cart-btn"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <ShoppingCart size={22} />
                                </motion.div>
                                
                                {/* Premium Cart Badge - Mobile */}
                                <AnimatePresence mode="wait">
                                    {cartCount > 0 && (
                                        <motion.div
                                            key={`mobile-${cartCount}`}
                                            initial={{ scale: 0, y: -10 }}
                                            animate={{ scale: 1, y: 0 }}
                                            exit={{ scale: 0, y: -10 }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 15 }}
                                            style={{
                                                position: 'absolute',
                                                top: '-4px',
                                                right: '-6px',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '9px',
                                                fontWeight: '800',
                                                boxShadow: '0 0 10px rgba(16,185,129,0.6), 0 3px 10px rgba(16,185,129,0.3), inset 0 1px 2px rgba(255,255,255,0.4)',
                                                border: '2px solid rgba(255,255,255,0.95)',
                                                letterSpacing: '0.1px',
                                                backdropFilter: 'blur(4px)'
                                            }}
                                        >
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Link>
                            <button 
                                className="hamburger-btn" 
                                onClick={toggleMobileMenu}
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
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    className="mobile-menu-content"
                                    initial={{ y: 24, opacity: 0.96 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 24, opacity: 0.96 }}
                                    transition={{ duration: 0.22 }}
                                >
                                    <button
                                        type="button"
                                        className="mobile-menu-close-btn"
                                        onClick={toggleMobileMenu}
                                        aria-label="Close menu"
                                    >
                                        <X size={22} />
                                    </button>
                                    <div className="mobile-sheet-top" aria-hidden="true">
                                        <span className="mobile-sheet-handle" />
                                    </div>
                                    <nav className="mobile-nav">
                                        <Link to="/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/'); }} className={`mobile-nav-link ${isActive('/')?'active':''}`}>
                                            <span>Home</span>
                                        </Link>
                                        <Link to="/shop/All/" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/shop/All/'); }} className={`mobile-nav-link ${isActive('/shop/All/')?'active':''}`}>
                                            <span>Shop</span>
                                        </Link>
                                        <Link to="/about" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/about'); }} className={`mobile-nav-link ${isActive('/about')?'active':''}`}>
                                            <span>About</span>
                                        </Link>
                                        <Link to="/contact" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/contact'); }} className={`mobile-nav-link ${isActive('/contact')?'active':''}`}>
                                            <span>Contact</span>
                                        </Link>
                                        {role === "Admin" && (
                                            <Link to="/admin-home" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/admin-home'); }} className="mobile-nav-link">
                                                <span className="badge-admin-pill">ADMIN</span>
                                            </Link>
                                        )}
                                    </nav>

                                    <div className="mobile-menu-footer">
                                        {localStorage.getItem("login") ? (
                                            <>
                                                <Link to="/profile" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/profile'); }} className="mobile-footer-btn mobile-footer-btn-profile">
                                                    {profilePic ? (
                                                        <img src={profilePic} alt={name || 'User'} className="mobile-user-img mr-2" />
                                                    ) : (
                                                        <User size={18} className="mr-2" style={{display:'inline'}} />
                                                    )}
                                                    {name}
                                                </Link>
                                                <Link to="/my-orders" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/my-orders'); }} className="mobile-footer-btn mobile-footer-btn-orders">
                                                    <ShoppingCart size={18} className="mr-2" style={{display:'inline'}} />
                                                    My Orders
                                                </Link>
                                                <button onClick={logout} className="mobile-footer-btn mobile-footer-btn-logout">
                                                    LOGOUT
                                                </button>
                                            </>
                                        ) : (
                                            <Link to="/login" onClick={(e) => { e.preventDefault(); handleTransitionNavigate('/login'); }} className="mobile-footer-btn mobile-footer-btn-login">
                                                LOGIN
                                            </Link>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </nav>

            {/* --- CUSTOM CSS FOR LUXURY & RESPONSIVENESS --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .header-main {
                    position: relative;
                    z-index: 1050;
                    width: 100%;
                    background: #fff;
                    overflow: visible;
                    isolation: isolate;
                    transition: box-shadow 0.25s ease, background 0.25s ease;
                }
                .header-main::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(15,23,42,0), rgba(212,175,55,0.7), rgba(15,23,42,0));
                    pointer-events: none;
                }
                body { overflow-x: hidden; }
                .top-premium-ribbon { 
                    height: 40px;
                    background: linear-gradient(90deg, #06080c 0%, #111827 35%, #35220b 68%, #080a0f 100%);
                    font-size: 11px;
                }
                .navbar {
                    width: 100%;
                    padding: 10px 0 !important;
                    background: linear-gradient(120deg, rgba(255,255,255,0.95), rgba(255,250,240,0.93)) !important;
                    backdrop-filter: saturate(190%) blur(16px);
                    transition: padding 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
                    overflow: visible;
                }
                .navbar .container {
                    width: min(1320px, 100%);
                    max-width: 1320px;
                    padding-left: clamp(12px, 2.2vw, 28px);
                    padding-right: clamp(12px, 2.2vw, 28px);
                    overflow: visible;
                }
                .dot-blink { width: 6px; height: 6px; background: #28a745; border-radius: 50%; animation: blink 2s infinite; }
                @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                
                .header-fixed {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    animation: slideInNav 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
                    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.09);
                }
                .header-fixed .navbar {
                    padding: 7px 0 !important;
                    background: linear-gradient(120deg, rgba(255,255,255,0.98), rgba(255,252,246,0.96)) !important;
                    box-shadow: 0 10px 26px rgba(15,23,42,0.08);
                }
                @keyframes slideInNav { from {opacity:0} to {opacity:1} }

                /* 🔥 LOGO STYLING */
                .logo-wrapper { display: flex; align-items: center; gap: 8px; }
                .logo-e {
                    background: linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
                    color: #fff; width: 38px; height: 38px;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 800;
                    border-radius: 4px;
                    border-right: 3px solid #d4af37;
                    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22);
                    transition: width 0.25s ease, height 0.25s ease, font-size 0.25s ease;
                }
                .logo-text-box { display: flex; flex-direction: column; line-height: 1; }
                .logo-brand-name { font-weight: 800; letter-spacing: 3px; font-size: 20px; color: #111; transition: font-size 0.25s ease, letter-spacing 0.25s ease; }
                .logo-tagline { font-size: 8px; letter-spacing: 2px; color: #9a7b1f; font-weight: 700; margin-top: 2px; transition: font-size 0.25s ease, letter-spacing 0.25s ease; }

                .header-fixed .logo-e {
                    width: 34px;
                    height: 34px;
                    font-size: 20px;
                }
                .header-fixed .logo-brand-name {
                    font-size: 18px;
                    letter-spacing: 2.2px;
                }
                .header-fixed .logo-tagline {
                    font-size: 7px;
                    letter-spacing: 1.7px;
                }

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
                    font-size: 12px !important; font-weight: 700 !important;
                    text-transform: uppercase; color: #333 !important; 
                    letter-spacing: 0.45px;
                    text-decoration: none; padding: 8px 12px;
                    position: relative;
                    transition: all 0.3s ease;
                    display: inline-block;
                    white-space: nowrap;
                }
                .premium-nav-link:hover {
                    color: #8b6a12 !important;
                    transform: translateY(-1px);
                }
                .premium-nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #d4af37, #f4d16c);
                    transition: width 0.3s ease;
                }
                .premium-nav-link:hover::after,
                .active-link::after { width: 100%; }
                .active-link { color: #8b6a12 !important; }
                .badge-admin-pill { background: #ff4757; color: #fff !important; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 50px; text-decoration: none; }
                
                /* === ULTRA PREMIUM DROPDOWN === */
                .premium-dropdown-wrapper { position: relative; overflow: visible; }
                .mobile-profile-wrapper { position: relative; z-index: 10001; }
                .premium-user-btn {
                    background: linear-gradient(135deg, #ffffff 0%, #fff9ec 100%);
                    border: 1px solid rgba(212, 175, 55, 0.28);
                    border-radius: 50px;
                    padding: 7px 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    font-size: 12px;
                    color: #111;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                    box-shadow: 0 4px 16px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.75);
                }
                .premium-user-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px rgba(124, 90, 16, 0.2);
                    border-color: rgba(212, 175, 55, 0.55);
                }
                .header-fixed .premium-user-btn {
                    padding: 6px 12px;
                }
                .user-avatar {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 70%, #7c5a10 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white !important;
                    overflow: hidden;
                    box-shadow: 0 3px 8px rgba(15,23,42,0.28);
                }
                .nav-user-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
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
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    left: auto;
                    border: none !important;
                    border-radius: 20px !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.12) !important;
                    padding: 0 !important;
                    min-width: 280px;
                    max-width: min(360px, calc(100vw - 32px));
                    margin-top: 12px !important;
                    background: linear-gradient(160deg, rgba(255,255,255,0.99), rgba(255,251,241,0.97));
                    backdrop-filter: blur(20px);
                    animation: slideDownFade 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                    overflow: hidden;
                    z-index: 10002;
                    transform-origin: top right;
                    max-height: min(520px, 70dvh);
                    overflow-y: auto;
                }
                .premium-dropdown-menu.show {
                    display: block !important;
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
                    background: linear-gradient(135deg, #1f2937 0%, #111827 58%, #7c5a10 100%);
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
                    overflow: hidden;
                }
                .mobile-user-img {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    object-fit: cover;
                    display: inline-block;
                    vertical-align: middle;
                    border: 1px solid rgba(23, 162, 184, 0.35);
                }
                .user-details h6 {
                    font-weight: 800;
                    color: #fff;
                    font-size: 14px;
                }
                .user-details small {
                    font-size: 11px;
                    font-weight: 600;
                    color: #f4d16c;
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
                    background: linear-gradient(90deg, rgba(212,175,55,0.12), rgba(212,175,55,0.02)) !important;
                    color: #7c5a10 !important;
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
                    background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,247,228,0.95)); border: 1px solid rgba(212,175,55,0.34); cursor: pointer; padding: 8px;
                    display: flex; align-items: center; justify-content: center;
                    color: #1f2937; transition: 0.3s;
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    box-shadow: 0 8px 18px rgba(15,23,42,0.14);
                }
                .hamburger-btn:hover {
                    color: #7c5a10;
                    transform: translateY(-1px);
                    box-shadow: 0 12px 26px rgba(15,23,42,0.2);
                }
                .hamburger-btn:active { transform: scale(0.96); }
                .mobile-menu-toggle {
                    gap: 4px;
                    min-height: 40px;
                }

                .mobile-cart-link {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 10px;
                    color: #1f2937;
                    text-decoration: none !important;
                    flex-shrink: 0;
                }
                .mobile-cart-btn {
                    width: 42px;
                    height: 42px;
                    border-radius: 50px;
                    border: 1px solid rgba(212,175,55,0.34);
                    background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,247,228,0.95));
                    box-shadow: 0 8px 18px rgba(15,23,42,0.14);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #1f2937;
                    transition: transform 0.3s, box-shadow 0.3s, color 0.3s;
                }
                .mobile-cart-link:hover .mobile-cart-btn {
                    color: #7c5a10;
                    transform: translateY(-1px);
                    box-shadow: 0 12px 26px rgba(15,23,42,0.2);
                }

                /* 📱 MOBILE MENU OVERLAY */
                .mobile-menu-overlay {
                    position: fixed !important;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    width: 100vw;
                    height: 100dvh;
                    min-height: 100dvh;
                    background: radial-gradient(circle at 15% 10%, rgba(212,175,55,0.2), rgba(0,0,0,0.96) 45%), linear-gradient(120deg, rgba(0,0,0,0.95), rgba(10,10,10,0.98));
                    z-index: 10030;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: stretch;
                }
                .mobile-profile-backdrop {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    border: 0;
                    margin: 0;
                    padding: 0;
                    background: rgba(15, 23, 42, 0.42);
                    backdrop-filter: blur(2px);
                    z-index: 10018;
                }
                .mobile-menu-content {
                    width: 100%;
                    height: 100dvh;
                    min-height: 100dvh;
                    padding: calc(68px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: touch;
                    position: relative;
                }
                .mobile-menu-close-btn {
                    position: absolute;
                    top: calc(10px + env(safe-area-inset-top));
                    right: 16px;
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.16);
                    background: rgba(17, 24, 39, 0.88);
                    color: #fff;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
                    z-index: 3;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }
                .mobile-menu-close-btn:hover {
                    transform: translateY(-1px);
                    background: rgba(31, 41, 55, 0.94);
                    box-shadow: 0 14px 28px rgba(0,0,0,0.34);
                }
                .mobile-menu-content::before {
                    content: '';
                    position: absolute;
                    top: 4px;
                    right: -28px;
                    width: 150px;
                    height: 150px;
                    border-radius: 999px;
                    background: radial-gradient(circle, rgba(212,175,55,0.22), rgba(212,175,55,0));
                    pointer-events: none;
                }
                .mobile-sheet-top {
                    position: sticky;
                    top: calc(-56px - env(safe-area-inset-top));
                    display: flex;
                    justify-content: center;
                    padding: calc(10px + env(safe-area-inset-top)) 0 8px;
                    margin: 0 -24px 8px;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0));
                    z-index: 2;
                    pointer-events: none;
                }
                .mobile-sheet-handle {
                    width: 46px;
                    height: 5px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.7);
                    box-shadow: 0 1px 0 rgba(255,255,255,0.35) inset;
                }
                .mobile-nav { display: flex; flex-direction: column; gap: 0; }
                .mobile-nav-link {
                    color: #fff; font-size: clamp(18px, 5vw, 28px); font-weight: 800;
                    text-transform: uppercase; padding: 20px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.14);
                    transition: 0.3s; text-decoration: none; display: block;
                    animation: mobileLinkIn 0.42s ease both;
                }
                .mobile-nav-link:hover, .mobile-nav-link.active {
                    color: #f4d16c; padding-left: 15px;
                }
                .mobile-nav .mobile-nav-link:nth-child(1) { animation-delay: 0.06s; }
                .mobile-nav .mobile-nav-link:nth-child(2) { animation-delay: 0.11s; }
                .mobile-nav .mobile-nav-link:nth-child(3) { animation-delay: 0.16s; }
                .mobile-nav .mobile-nav-link:nth-child(4) { animation-delay: 0.21s; }
                .mobile-nav .mobile-nav-link:nth-child(5) { animation-delay: 0.26s; }
                @keyframes mobileLinkIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .mobile-menu-footer { padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); }
                .mobile-footer-btn {
                    width: 100%;
                    min-height: 52px;
                    border-radius: 999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.55px;
                    text-decoration: none !important;
                    border: 1px solid transparent;
                    margin-bottom: 12px;
                    transition: transform 0.22s ease, box-shadow 0.24s ease, filter 0.24s ease, border-color 0.22s ease;
                    animation: footerCtaIn 0.38s ease both;
                    backdrop-filter: blur(7px);
                }
                .mobile-footer-btn:last-child {
                    margin-bottom: 0;
                }
                .mobile-footer-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.02);
                    text-decoration: none !important;
                }
                .mobile-footer-btn:active {
                    transform: scale(0.985);
                }
                .mobile-footer-btn-profile {
                    color: #eef5ff !important;
                    background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(30,41,59,0.9));
                    border-color: rgba(255,255,255,0.2);
                    box-shadow: 0 10px 24px rgba(2,6,23,0.34), inset 0 1px 0 rgba(255,255,255,0.16);
                }
                .mobile-footer-btn-profile:hover {
                    color: #ffffff !important;
                    border-color: rgba(244,209,108,0.45);
                    box-shadow: 0 12px 28px rgba(2,6,23,0.38), 0 0 0 1px rgba(244,209,108,0.2) inset;
                }
                .mobile-footer-btn-orders {
                    color: #0d2533 !important;
                    background: linear-gradient(135deg, #f8eebf, #f4d16c 55%, #e5b93f);
                    border-color: rgba(255, 222, 120, 0.6);
                    box-shadow: 0 12px 30px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.6);
                }
                .mobile-footer-btn-orders:hover {
                    color: #072938 !important;
                    box-shadow: 0 15px 34px rgba(212,175,55,0.4), 0 0 0 1px rgba(255,255,255,0.45) inset;
                }
                .mobile-footer-btn-logout {
                    color: #fff !important;
                    background: linear-gradient(135deg, #ff5a6a 0%, #f43f5e 55%, #dc2626 100%);
                    border-color: rgba(255,170,178,0.48);
                    box-shadow: 0 10px 26px rgba(244,63,94,0.36), inset 0 1px 0 rgba(255,255,255,0.4);
                }
                .mobile-footer-btn-logout:hover {
                    color: #fff !important;
                    box-shadow: 0 14px 30px rgba(244,63,94,0.46);
                }
                .mobile-footer-btn-login {
                    color: #fff !important;
                    background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
                    border-color: rgba(255,255,255,0.2);
                    box-shadow: 0 10px 24px rgba(2,6,23,0.35);
                }
                .mobile-footer-btn-login:hover {
                    color: #fff !important;
                    box-shadow: 0 14px 30px rgba(2,6,23,0.46);
                }
                .mobile-menu-footer .mobile-footer-btn:nth-child(1) { animation-delay: 0.08s; }
                .mobile-menu-footer .mobile-footer-btn:nth-child(2) { animation-delay: 0.13s; }
                .mobile-menu-footer .mobile-footer-btn:nth-child(3) { animation-delay: 0.18s; }
                @keyframes footerCtaIn {
                    from { opacity: 0; transform: translateY(9px) scale(0.99); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .cart-badge { position: absolute; top: -5px; right: -8px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid #fff; }
                
                /* 🎁 PREMIUM CART BADGE */
                .cart-badge-premium {
                    animation: badgePulse 0.6s ease-in-out infinite;
                }
                
                @keyframes badgePulse {
                    0%, 100% {
                        box-shadow: 0 4px 16px rgba(16,185,129,0.35), 0 0 0 0 rgba(16,185,129,0.5);
                    }
                    50% {
                        box-shadow: 0 4px 16px rgba(16,185,129,0.25), 0 0 0 8px rgba(16,185,129,0.2);
                    }
                }
                
                @keyframes cartBounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                
                .navbar-right-box {
                    position: relative;
                    overflow: visible;
                }
                
                .navbar-right-box a:hover .cart-badge-premium {
                    animation: cartBounce 0.4s ease-in-out;
                }
                
                .animate-up { animation: fadeUpNav 0.3s ease forwards; }
                @keyframes fadeUpNav { from {opacity:0; transform:translateY(10px)} to {opacity:1; transform:translateY(0)} }

                /* 📱 MOBILE RESPONSIVE */
                @media (max-width: 991px) {
                    .navbar .container {
                        max-width: 100%;
                        padding-left: 12px;
                        padding-right: 12px;
                    }
                    .logo-brand-name { font-size: 16px; letter-spacing: 2px; }
                    .logo-e { width: 32px; height: 32px; font-size: 18px; }
                    .logo-tagline { font-size: 6px; }
                    .ribbon-text { font-size: 9px !important; }
                    .top-premium-ribbon { height: 35px; }
                    .mobile-profile-btn {
                        padding: 6px 10px;
                        min-width: 40px;
                        border-radius: 50px;
                    }
                    .mobile-avatar {
                        width: 30px;
                        height: 30px;
                    }
                    .mobile-profile-wrapper {
                        position: static;
                        flex-shrink: 0;
                    }
                    .mobile-cart-link {
                        margin-right: 8px;
                    }
                    .mobile-cart-btn {
                        width: 40px;
                        height: 40px;
                    }
                    .mobile-profile-menu {
                        position: fixed !important;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        transform: none;
                        top: calc(56px + env(safe-area-inset-top));
                        width: 100vw !important;
                        min-width: 0 !important;
                        max-width: 100vw !important;
                        height: calc(100dvh - 56px - env(safe-area-inset-top));
                        max-height: none;
                        overflow-y: auto;
                        margin-top: 0 !important;
                        z-index: 10021;
                        -webkit-overflow-scrolling: touch;
                        border-radius: 16px 16px 0 0 !important;
                        background: rgba(255,255,255,0.995);
                        box-shadow: 0 -6px 24px rgba(15, 23, 42, 0.18) !important;
                        padding-bottom: calc(16px + env(safe-area-inset-bottom));
                    }
                    .mobile-profile-menu .dropdown-header-custom {
                        position: sticky;
                        top: 0;
                        z-index: 1;
                        backdrop-filter: blur(10px);
                    }
                }

                @media (min-width: 992px) and (max-width: 1199px) {
                    .premium-dropdown-wrapper .premium-dropdown-menu:not(.mobile-profile-menu) {
                        position: fixed !important;
                        top: calc(64px + env(safe-area-inset-top));
                        left: max(10px, env(safe-area-inset-left));
                        right: max(10px, env(safe-area-inset-right));
                        width: auto;
                        min-width: 0;
                        max-width: 360px;
                        margin-left: auto;
                        max-height: calc(100dvh - 84px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
                        overflow-y: auto;
                        margin-top: 0 !important;
                    }
                }
                
                @media (max-width: 575px) {
                    .mobile-nav-link { font-size: 20px; padding: 15px 0; }
                    .mobile-menu-content { padding: calc(62px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom)); }
                    .mobile-sheet-top {
                        margin: 0 -16px 8px;
                    }
                    .mobile-menu-close-btn {
                        right: 12px;
                        width: 40px;
                        height: 40px;
                    }
                    .logo-brand-name { font-size: 14px; letter-spacing: 1.5px; }
                    .logo-e { width: 28px; height: 28px; font-size: 16px; }
                    .logo-tagline { font-size: 5px; }
                    .navbar { padding: 8px 0 !important; }
                    .mobile-cart-btn {
                        width: 40px;
                        height: 40px;
                        border-radius: 50px;
                    }
                    .premium-dropdown-menu {
                        min-width: 0;
                        max-width: none;
                    }
                    .mobile-profile-menu {
                        top: calc(52px + env(safe-area-inset-top));
                        height: calc(100dvh - 52px - env(safe-area-inset-top));
                        border-radius: 14px 14px 0 0 !important;
                    }
                    .mobile-footer-btn {
                        min-height: 48px;
                        font-size: 12px;
                        letter-spacing: 0.45px;
                    }
                }

                @media (max-width: 375px) {
                    .mobile-nav-link { font-size: 18px; }
                    .logo-brand-name { font-size: 13px; letter-spacing: 1px; }
                }
            `}} />
        </header>
    )
}