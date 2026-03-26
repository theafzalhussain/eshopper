import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Home, Users, Layers, Grid, Tag,
    ShoppingBag, MessageSquare, Send, CheckSquare, Package,
    Menu, X, ChevronRight, LayoutDashboard
} from 'lucide-react'

export default function LefNav() {
    const location = useLocation()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [hoveredItem, setHoveredItem] = useState(null)

    const isActive = (path) => location.pathname === path

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false)
    }, [location.pathname])

    // Handle responsive behavior
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMobileOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const menuItems = [
        { name: "Dashboard", path: "/admin-home", icon: Home, gradient: "from-blue-500 to-cyan-500" },
        { name: "Users", path: "/admin-user", icon: Users, gradient: "from-purple-500 to-pink-500" },
        { name: "Orders", path: "/admin-orders", icon: Package, gradient: "from-orange-500 to-red-500" },
        { name: "Main Categories", path: "/admin-maincategory", icon: Layers, gradient: "from-green-500 to-teal-500" },
        { name: "Sub Categories", path: "/admin-subcategory", icon: Grid, gradient: "from-indigo-500 to-purple-500" },
        { name: "Brands", path: "/admin-brand", icon: Tag, gradient: "from-pink-500 to-rose-500" },
        { name: "Products", path: "/admin-product", icon: ShoppingBag, gradient: "from-yellow-500 to-orange-500" },
        { name: "Contact", path: "/admin-contact", icon: MessageSquare, gradient: "from-cyan-500 to-blue-500" },
        { name: "Newsletters", path: "/admin-newsletter", icon: Send, gradient: "from-violet-500 to-purple-500" },
        { name: "Checkouts", path: "/admin-checkout", icon: CheckSquare, gradient: "from-emerald-500 to-green-500" },
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

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="premium-sidebar-overlay"
                    />
                )}
            </AnimatePresence>

            {/* Premium Sidebar */}
            <motion.div
                variants={sidebarVariants}
                initial="closed"
                animate={isMobileOpen ? "open" : "closed"}
                className={`premium-admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}
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
                                onHoverStart={() => setHoveredItem(index)}
                                onHoverEnd={() => setHoveredItem(null)}
                            >
                                <Link
                                    to={item.path}
                                    className={`premium-nav-item ${active ? 'active' : ''}`}
                                >
                                    {/* Icon Container with Gradient */}
                                    <motion.div
                                        className={`premium-icon-wrapper ${active ? 'active-icon' : ''}`}
                                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <div className={`premium-icon-gradient bg-gradient-to-br ${item.gradient}`}>
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

                                    {/* Hover Arrow */}
                                    {!isCollapsed && hoveredItem === index && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="premium-hover-arrow"
                                        >
                                            <ChevronRight size={18} />
                                        </motion.div>
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
                /* Mobile Toggle Button */
                .premium-mobile-toggle {
                    position: fixed;
                    top: 20px;
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

                @media (min-width: 769px) {
                    .premium-mobile-toggle {
                        display: none;
                    }
                }

                /* Sidebar Overlay */
                .premium-sidebar-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 1040;
                }

                @media (min-width: 769px) {
                    .premium-sidebar-overlay {
                        display: none;
                    }
                }

                /* Premium Sidebar Container */
                .premium-admin-sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    width: 280px;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    border-right: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06);
                    display: flex;
                    flex-direction: column;
                    z-index: 1050;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                /* Custom Scrollbar */
                .premium-admin-sidebar::-webkit-scrollbar {
                    width: 6px;
                }

                .premium-admin-sidebar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .premium-admin-sidebar::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #667eea, #764ba2);
                    border-radius: 10px;
                }

                /* Mobile Styles */
                @media (max-width: 768px) {
                    .premium-admin-sidebar {
                        position: fixed;
                        z-index: 1050;
                    }
                }

                /* Desktop - Always Show */
                @media (min-width: 769px) {
                    .premium-admin-sidebar {
                        position: relative;
                        transform: translateX(0) !important;
                    }
                }

                /* Sidebar Header */
                .premium-sidebar-header {
                    padding: 24px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                }

                .premium-logo-container {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .premium-logo-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .premium-logo-text h3 {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
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
                    color: #475569;
                    font-weight: 500;
                    font-size: 14px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .premium-nav-item:hover {
                    background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
                    color: #667eea;
                    transform: translateX(4px);
                }

                .premium-nav-item.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
                }

                .premium-nav-item.active:hover {
                    transform: translateX(4px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                /* Icon Wrapper */
                .premium-icon-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .premium-icon-gradient {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    transition: all 0.3s ease;
                    opacity: 0.85;
                }

                .premium-nav-item:hover .premium-icon-gradient {
                    opacity: 1;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .premium-nav-item.active .premium-icon-gradient {
                    background: rgba(255, 255, 255, 0.2) !important;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
                    background: white;
                    border-radius: 0 4px 4px 0;
                    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.5);
                }

                /* Hover Arrow */
                .premium-hover-arrow {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    color: currentColor;
                }

                /* Sidebar Footer */
                .premium-sidebar-footer {
                    padding: 20px;
                    border-top: 1px solid rgba(226, 232, 240, 0.6);
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
                }

                .premium-footer-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .premium-footer-accent {
                    width: 4px;
                    height: 40px;
                    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
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
                @media (max-width: 768px) {
                    .premium-admin-sidebar {
                        width: 280px;
                    }
                }

                @media (max-width: 480px) {
                    .premium-admin-sidebar {
                        width: 85vw;
                        max-width: 320px;
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