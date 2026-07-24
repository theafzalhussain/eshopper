import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Home, Users, Layers, Grid, Tag,
    ShoppingBag, MessageSquare, Send, CheckSquare, Package, TicketPercent,
    Menu, X, LayoutDashboard, Moon, Sun, Activity
} from 'lucide-react'
import './SystemControlCenter.css'

export default function LefNav() {
    const location = useLocation()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [sidebarTheme, setSidebarTheme] = useState(() => localStorage.getItem('admin_sidebar_theme') || 'light')

    const isActive = (path) => location.pathname === path

    // Check screen size on mount
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 992)
        }
        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false)
    }, [location.pathname])

    // Handle responsive behavior
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 992) {
                setIsMobileOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        localStorage.setItem('admin_sidebar_theme', sidebarTheme)
    }, [sidebarTheme])

    const menuItems = [
        { name: "Dashboard", path: "/admin-home", icon: Home },
        { name: "Users", path: "/admin-user", icon: Users },
        { name: "Order Lifecycle", path: "/admin-orders", icon: Package },
        { name: "Activity Log", path: "/admin-activities", icon: Activity },
        { name: "Deploy Checks", path: "/admin-deploy-checks", icon: CheckSquare },
        { name: "Main Categories", path: "/admin-maincategory", icon: Layers },
        { name: "Sub Categories", path: "/admin-subcategory", icon: Grid },
        { name: "Brands", path: "/admin-brand", icon: Tag },
        { name: "Products", path: "/admin-product", icon: ShoppingBag },
        { name: "Coupons", path: "/admin-coupon", icon: TicketPercent },
        { name: "Contact", path: "/admin-contact", icon: MessageSquare },
        { name: "Newsletters", path: "/admin-newsletter", icon: Send },
        // { name: "Checkouts", path: "/admin-checkout", icon: CheckSquare },
    ]

    const sidebarVariants = {
        open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
        closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: { delay: i * 0.05, duration: 0.3 }
        })
    }

    return (
        <>
            {/* Mobile Menu Toggle Button */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="premium-mobile-toggle"
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>

            {/* Mobile Overlay - Only show on mobile when sidebar is open */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className={`premium-sidebar-overlay ${isMobileOpen ? 'show' : ''}`}
                    />
                )}
            </AnimatePresence>

            {/* Premium Sidebar */}
            <motion.div
                variants={sidebarVariants}
                initial={isMobile ? "closed" : "open"}
                animate={isMobile ? (isMobileOpen ? "open" : "closed") : "open"}
                className={`premium-admin-sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''} ${sidebarTheme === 'dark' ? 'theme-dark' : ''}`}
            >
                {/* Sidebar Header */}
                <div className="premium-sidebar-header">
                    <motion.div
                        className="premium-logo-container"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="premium-logo-icon">
                            <LayoutDashboard size={28} />
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="premium-logo-text"
                            >
                                <h3>ESHOPPER</h3>
                                <span>Admin Panel</span>
                            </motion.div>
                        )}
                    </motion.div>
                    <button
                        type="button"
                        className="premium-theme-toggle"
                        onClick={() => setSidebarTheme((prev) => prev === 'dark' ? 'light' : 'dark')}
                    >
                        {sidebarTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        <span>{sidebarTheme === 'dark' ? 'Light' : 'Dark'}</span>
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="premium-nav-items">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon
                        const active = isActive(item.path)

                        return (
                            <motion.div
                                key={item.path}
                                custom={index}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <Link
                                    to={item.path}
                                    className={`premium-nav-item ${active ? 'active' : ''}`}
                                >
                                    {/* Icon Container with Gradient */}
                                    <motion.div
                                        className={`premium-icon-wrapper ${active ? 'active-icon' : ''}`}
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="premium-icon-chip">
                                            <Icon size={20} strokeWidth={2.5} />
                                        </div>
                                    </motion.div>

                                    {/* Text Label */}
                                    {!isCollapsed && (
                                        <motion.span
                                            className="premium-nav-text"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}

                                    {/* Active Indicator */}
                                    {active && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="premium-active-indicator"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            </motion.div>
                        )
                    })}
                </nav>

                {/* Footer Section */}
                <div className="premium-sidebar-footer">
                    <div className="premium-footer-content">
                        <div className="premium-footer-accent"></div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="premium-footer-text"
                            >
                                <p>© 2026 Eshopper</p>
                                <span>Admin Dashboard</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                /* Mobile Toggle Button - Always Visible on Mobile */
                .premium-mobile-toggle {
                    position: fixed;
                    top: 85px;
                    left: 20px;
                    z-index: 1100;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 12px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .premium-mobile-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }

                @media (min-width: 992px) {
                    .premium-mobile-toggle {
                        display: none !important;
                    }
                }

                @media (max-width: 991px) {
                    .premium-mobile-toggle {
                        display: flex !important;
                    }
                }

                /* Sidebar Overlay - Show on Mobile When Sidebar is Open */
                .premium-sidebar-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    z-index: 1040;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Show overlay when mobile sidebar is open */
                .premium-sidebar-overlay.show {
                    opacity: 1;
                    visibility: visible;
                }

                @media (min-width: 992px) {
                    .premium-sidebar-overlay {
                        display: none !important;
                    }
                }

                /* Premium Sidebar Container */
                .premium-admin-sidebar {
                    position: fixed;
                    top: 110px;
                    bottom: 0;
                    left: 0;
                    height: auto;
                    min-height: calc(100vh - 110px);
                    width: 260px;
                    background: rgba(248, 250, 252, 0.96);
                    border-right: 1px solid rgba(203, 213, 225, 0.6);
                    box-shadow: 2px 0 18px rgba(15, 23, 42, 0.08);
                    display: flex;
                    flex-direction: column;
                    z-index: 1040; /* Below header z-index of 1050 */
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .premium-sidebar-header,
                .premium-nav-items,
                .premium-sidebar-footer {
                    width: 100%;
                    box-sizing: border-box;
                }

                .premium-nav-items {
                    min-height: 0;
                    overflow-y: auto;
                }

                /* Custom Scrollbar - Hidden but functional */
                .premium-admin-sidebar::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                }

                .premium-admin-sidebar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .premium-admin-sidebar::-webkit-scrollbar-thumb {
                    background: transparent;
                    border-radius: 10px;
                }

                .premium-admin-sidebar {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE/Edge */
                }

                /* Mobile & Tablet Styles - Hide Sidebar by Default (max-width: 991px) */
                @media (max-width: 991px) {
                    .premium-admin-sidebar {
                        position: fixed;
                        top: 75px;
                        bottom: 0;
                        height: auto;
                        min-height: calc(100vh - 75px); /* Full height minus mobile header */
                        z-index: 1040;
                        transform: translateX(-100%) !important; /* Override framer-motion */
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    /* Show sidebar when mobile menu is open */
                    .premium-admin-sidebar.mobile-open {
                        transform: translateX(0) !important; /* Override framer-motion */
                    }
                }

                /* Desktop - Always Show - Keep Fixed (min-width: 992px) */
                @media (min-width: 992px) {
                    .premium-admin-sidebar {
                        position: fixed;
                        transform: translateX(0) !important; /* Override framer-motion */
                    }

                    .premium-admin-sidebar {
                        top: 110px;
                        bottom: 0;
                        height: auto;
                    }

                    /* Hide mobile toggle on desktop */
                    .premium-mobile-toggle {
                        display: none !important;
                    }
                }

                /* Sidebar Header */
                .premium-sidebar-header {
                    padding: 24px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    background: rgba(248, 250, 252, 0.7);
                }

                .premium-theme-toggle {
                    margin-top: 12px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    background: rgba(241, 245, 249, 0.9);
                    color: #0f172a;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 6px 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }

                .premium-theme-toggle:hover {
                    border-color: rgba(20, 184, 166, 0.55);
                    transform: translateY(-1px);
                }

                .premium-logo-container {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .premium-logo-icon {
                    width: 48px;
                    height: 48px;
                    background: #0f172a;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
                }

                .premium-logo-text h3 {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0;
                    color: #0f172a;
                    letter-spacing: 0.5px;
                }

                .premium-logo-text span {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                /* Navigation Items */
                .premium-nav-items {
                    flex: 1;
                    padding: 20px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .premium-nav-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 16px;
                    border-radius: 12px;
                    text-decoration: none;
                    color: #334155;
                    font-weight: 500;
                    font-size: 14px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .premium-nav-item:hover {
                    background: rgba(15, 23, 42, 0.06);
                    color: #0f172a;
                    transform: translateX(2px);
                }

                .premium-nav-item.active {
                    background: rgba(15, 23, 42, 0.1);
                    color: #0f172a;
                    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
                    transform: translateX(0);
                }

                .premium-nav-item.active:hover {
                    transform: translateX(2px);
                    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.15);
                }

                /* Icon Wrapper */
                .premium-icon-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .premium-icon-chip {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #0f172a;
                    background: rgba(15, 23, 42, 0.08);
                    transition: all 0.3s ease;
                }

                .premium-nav-item:hover .premium-icon-chip {
                    background: rgba(15, 23, 42, 0.12);
                }

                .premium-nav-item.active .premium-icon-chip {
                    background: #0f172a;
                    color: #ffffff;
                }

                /* Nav Text */
                .premium-nav-text {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                    letter-spacing: 0.2px;
                }

                /* Active Indicator */
                .premium-active-indicator {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 4px;
                    height: 70%;
                    background: #14b8a6;
                    border-radius: 0 4px 4px 0;
                    box-shadow: 0 0 10px rgba(20, 184, 166, 0.45);
                }

                /* Sidebar Footer */
                .premium-sidebar-footer {
                    padding: 20px;
                    border-top: 1px solid rgba(226, 232, 240, 0.6);
                    background: rgba(248, 250, 252, 0.65);
                }

                .premium-footer-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .premium-footer-accent {
                    width: 4px;
                    height: 40px;
                    background: linear-gradient(180deg, #0f172a 0%, #14b8a6 100%);
                    border-radius: 2px;
                }

                .premium-footer-text p {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                }

                .premium-footer-text span {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                }

                /* Responsive Adjustments */
                @media (max-width: 991px) {
                    .premium-admin-sidebar {
                        width: 260px;
                    }
                }

                @media (max-width: 480px) {
                    .premium-admin-sidebar {
                        width: 85vw;
                        max-width: 300px;
                    }
                }

                /* Collapsed State (for future enhancement) */
                .premium-admin-sidebar.collapsed {
                    width: 80px;
                }

                .premium-admin-sidebar.collapsed .premium-logo-text,
                .premium-admin-sidebar.collapsed .premium-nav-text,
                .premium-admin-sidebar.collapsed .premium-hover-arrow,
                .premium-admin-sidebar.collapsed .premium-footer-text {
                    display: none;
                }

                .premium-admin-sidebar.theme-dark {
                    background: rgba(15, 23, 42, 0.96);
                    border-right: 1px solid rgba(51, 65, 85, 0.85);
                    box-shadow: 2px 0 22px rgba(2, 6, 23, 0.45);
                }

                .premium-admin-sidebar.theme-dark .premium-sidebar-header,
                .premium-admin-sidebar.theme-dark .premium-sidebar-footer {
                    background: rgba(15, 23, 42, 0.72);
                    border-color: rgba(51, 65, 85, 0.75);
                }

                .premium-admin-sidebar.theme-dark .premium-logo-text h3,
                .premium-admin-sidebar.theme-dark .premium-nav-item,
                .premium-admin-sidebar.theme-dark .premium-footer-text p {
                    color: #e2e8f0;
                }

                .premium-admin-sidebar.theme-dark .premium-logo-text span,
                .premium-admin-sidebar.theme-dark .premium-footer-text span {
                    color: #94a3b8;
                }

                .premium-admin-sidebar.theme-dark .premium-nav-item:hover {
                    background: rgba(148, 163, 184, 0.14);
                    color: #f8fafc;
                }

                .premium-admin-sidebar.theme-dark .premium-nav-item.active {
                    background: rgba(20, 184, 166, 0.18);
                    box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.3);
                }

                .premium-admin-sidebar.theme-dark .premium-icon-chip {
                    background: rgba(148, 163, 184, 0.2);
                    color: #e2e8f0;
                }

                .premium-admin-sidebar.theme-dark .premium-nav-item.active .premium-icon-chip {
                    background: #14b8a6;
                    color: #042f2e;
                }

                .premium-admin-sidebar.theme-dark .premium-theme-toggle {
                    background: rgba(15, 23, 42, 0.8);
                    border-color: rgba(71, 85, 105, 0.8);
                    color: #e2e8f0;
                }

                /* Smooth Transitions */
                * {
                    -webkit-tap-highlight-color: transparent;
                }

                /* Print Styles */
                @media print {
                    .premium-admin-sidebar,
                    .premium-mobile-toggle {
                        display: none !important;
                    }
                }
            `}} />
        </>
        
    )
}

