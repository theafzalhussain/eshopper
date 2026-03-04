import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { getCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'
import { motion, AnimatePresence } from 'framer-motion'
import { BASE_URL } from '../constants'
import { ArrowRight, ExternalLink, ShoppingBag, Clock3, Heart, ShoppingCart, Package, Lock, Shield } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export default function Profile() {
    var users = useSelector((state) => state.UserStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)
    var orders = useSelector((state) => state.CheckoutStateData)
    
    var [user, setuser] = useState({})
    const [recentOrders, setRecentOrders] = useState([])
    const [loadingRecent, setLoadingRecent] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const socketRef = useRef(null)
    const [socketConnected, setSocketConnected] = useState(false)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getWishlist())
        dispatch(getCheckout())
        
        const userId = localStorage.getItem("userid")
        var data = users.find((item) => item.id === userId)
        if (data) {
            setuser(data)
            setIsLoading(false)
        }
    }

    useEffect(() => {
        getAPIData()
    }, [users.length, wishlist.length, orders.length])

    useEffect(() => {
        const fetchRecentOrders = async () => {
            const userId = localStorage.getItem("userid")
            if (!userId) return
            try {
                setLoadingRecent(true)
                const { data } = await axios.get(`${BASE_URL}/api/orders/recent/${userId}?limit=4`, { timeout: 10000 })
                setRecentOrders(Array.isArray(data?.orders) ? data.orders : [])
            } catch (e) {
                setRecentOrders([])
            } finally {
                setLoadingRecent(false)
            }
        }

        fetchRecentOrders()
    }, [orders.length])

    // 🔴 INITIALIZE SOCKET.IO FOR REAL-TIME STATUS UPDATES IN RECENT STATUS
    useEffect(() => {
        const userId = localStorage.getItem("userid")
        if (!userId) return

        let mounted = true
        const socket = io(BASE_URL, {
            auth: { userId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        })

        socketRef.current = socket

        socket.on('connect', () => {
            if (mounted) {
                setSocketConnected(true)
                console.log('✅ Profile Socket connected for real-time updates')
            }
        })

        socket.on('disconnect', () => {
            if (mounted) {
                setSocketConnected(false)
                console.log('❌ Profile Socket disconnected')
            }
        })

        // 🔴 LISTEN FOR STATUS UPDATES AND UPDATE RECENT ORDERS IN REAL-TIME
        socket.on('statusUpdate', (payload) => {
            if (payload?.orderId && payload?.status && mounted) {
                console.log('🔄 Real-time status update in Recent Status:', payload)
                setRecentOrders((prevOrders) => {
                    return prevOrders.map((order) => {
                        if (order.orderId === payload.orderId) {
                            return {
                                ...order,
                                orderStatus: payload.status,
                                updatedAt: payload.updatedAt || new Date().toISOString()
                            }
                        }
                        return order
                    })
                })
            }
        })

        return () => {
            mounted = false
            if (socket) {
                socket.disconnect()
            }
        }
    }, [])


    const normalizeStatus = (value = '') => {
        const raw = String(value).trim().toLowerCase()
        if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
        if (raw === 'packed') return 'Packed'
        if (raw === 'shipped') return 'Shipped'
        if (raw === 'delivered') return 'Delivered'
        return 'Ordered'
    }

    const getStatusStyles = (status) => {
        const s = normalizeStatus(status)
        if (s === 'Ordered') return { bg: '#e0f2fe', color: '#0ea5e9' }
        if (s === 'Packed') return { bg: '#fef3c7', color: '#f59e0b' }
        if (s === 'Shipped') return { bg: '#fef9c3', color: '#ca8a04' }
        return { bg: '#dcfce7', color: '#16a34a' }
    }

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    }

    return (
        <div className="profile-page-luxury" style={{ backgroundColor: "#fafaf8", minHeight: "100vh", paddingBottom: "60px" }}>
            {/* --- PREMIUM LUXURY HEADER --- */}
            <div className="profile-header-luxury py-5 mb-5" style={{ 
                background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 50%, #2a2a2a 100%)',
                color: "white",
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div className="container text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="font-weight-bold mb-2" style={{ fontSize: '36px', letterSpacing: '0.5px', color: '#D4AF37' }}>
                            ✨ Welcome Back
                        </h1>
                        <p className="mb-0" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                            Manage your luxury account & exclusive member benefits
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="container">
                <div className="row">
                    {/* --- LEFT SIDE: PREMIUM PROFILE CARD --- */}
                    <motion.div 
                        className="col-lg-4 mb-4" 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="card border-0 shadow-lg rounded-3xl overflow-hidden text-center p-5" style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(212,175,55,0.1)'
                        }}>
                            {/* Premium Profile Picture with Animated Gold Border */}
                            {isLoading ? (
                                <Skeleton circle={true} height={180} width={180} style={{ margin: '0 auto 20px' }} />
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className="position-relative d-inline-block mx-auto mb-4"
                                >
                                    <div style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        width: '160px',
                                        height: '160px'
                                    }}>
                                        {/* Animated Gold Border */}
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                            style={{
                                                position: 'absolute',
                                                inset: '-4px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #D4AF37, #b8860b, #D4AF37)',
                                                padding: '2px',
                                                zIndex: 1
                                            }}
                                        />
                                        
                                        {/* Profile Image */}
                                        <img 
                                            src={user.pic || "/assets/images/noimage.png"} 
                                            className="rounded-circle"
                                            style={{
                                                width: "160px", 
                                                height: "160px", 
                                                objectFit: "cover",
                                                position: 'relative',
                                                zIndex: 2,
                                                border: '4px solid #fff',
                                                boxShadow: '0 10px 40px rgba(212,175,55,0.3)'
                                            }}
                                            alt="User" 
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* User Name with Status Badge */}
                            {isLoading ? (
                                <Skeleton count={2} style={{ marginTop: '16px' }} />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                >
                                    <h4 className="font-weight-bold mb-2" style={{ color: '#0A0A0A', fontSize: '24px', letterSpacing: '0.2px' }}>
                                        {user.name?.split(' ')[0]}
                                    </h4>
                                    
                                    {/* Elite Member Badge */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                                        style={{
                                            display: 'inline-block',
                                            padding: '6px 16px',
                                            background: 'linear-gradient(135deg, #D4AF37, #b8860b)',
                                            color: '#fff',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            letterSpacing: '0.8px',
                                            textTransform: 'uppercase',
                                            boxShadow: '0 6px 16px rgba(212,175,55,0.3)',
                                            marginBottom: '16px'
                                        }}
                                    >
                                        👑 Elite Member
                                    </motion.div>
                                </motion.div>
                            )}

                            <hr style={{ margin: '24px 0', border: '1px solid rgba(212,175,55,0.2)' }} />

                            {/* Stats Grid */}
                            {isLoading ? (
                                <Skeleton count={1} height={60} />
                            ) : (
                                <motion.div 
                                    className="d-flex justify-content-around text-center mt-3 mb-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <motion.div whileHover={{ scale: 1.05 }}>
                                        <h5 className="font-weight-bold mb-1" style={{ color: '#D4AF37', fontSize: '20px' }}>
                                            {wishlist.filter(x => x.userid === localStorage.getItem("userid")).length}
                                        </h5>
                                        <small className="text-muted" style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>❤️ Wishlist</small>
                                    </motion.div>
                                    <div style={{  width: '1px', background: 'rgba(212,175,55,0.2)' }}></div>
                                    <motion.div whileHover={{ scale: 1.05 }}>
                                        <h5 className="font-weight-bold mb-1" style={{ color: '#D4AF37', fontSize: '20px' }}>
                                            {orders.filter(x => x.userid === localStorage.getItem("userid")).length}
                                        </h5>
                                        <small className="text-muted" style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>📦 Orders</small>
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Premium Navigation Buttons */}
                            <motion.div
                                className="d-grid gap-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Link to="/update-profile" style={{ textDecoration: 'none',marginBottom: '12px' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 24px',
                                            background: 'linear-gradient(135deg, #17a2b8, #138496)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            letterSpacing: '0.4px',
                                            boxShadow: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        ✏️ EDIT PROFILE
                                    </motion.button>
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* --- RIGHT SIDE: ACCOUNT DETAILS & QUICK LINKS --- */}
                    <motion.div 
                        className="col-lg-8" 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Account Details Section */}
                        <motion.div 
                            className="card border-0 shadow-lg rounded-3xl p-5 bg-white mb-4"
                            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.06)', border: '1px solid rgba(212,175,55,0.08)' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h5 className="font-weight-bold mb-4" style={{ color: '#0A0A0A', fontSize: '18px', letterSpacing: '0.3px' }}>
                                📋 Your Profile Information
                            </h5>
                            {isLoading ? (
                                <div>
                                    <Skeleton count={5} style={{ marginBottom: '16px', height: '60px' }} />
                                </div>
                            ) : (
                                <BuyerProfile user={user} />
                            )}
                        </motion.div>

                        {/* PREMIUM NAVIGATION CARDS GRID */}
                        <motion.div 
                            className="row mb-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, staggerChildren: 0.1 }}
                        >
                            {/* Wishlist Card */}
                            <motion.div 
                                className="col-md-6 mb-3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                            >
                                <motion.button
                                    onClick={() => navigate("/wishlist")}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="p-5 w-100 rounded-3xl border-0 text-left"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
                                        border: '2px solid #D4AF37',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        boxShadow: 'none'
                                    }}
                                >
                                    <Heart size={28} style={{ color: '#D4AF37', marginBottom: '12px' }} />
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0A0A0A', marginBottom: '4px' }}>
                                        My Wishlist
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', letterSpacing: '0.2px' }}>
                                        {wishlist.filter(x => x.userid === localStorage.getItem("userid")).length} saved items
                                    </div>
                                </motion.button>
                            </motion.div>

                            {/* Cart Card */}
                            <motion.div 
                                className="col-md-6 mb-3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.40 }}
                            >
                                <motion.button
                                    onClick={() => navigate("/cart")}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="p-5 w-100 rounded-3xl border-0 text-left"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                                        border: '2px solid #10b981',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        boxShadow: 'none'
                                    }}
                                >
                                    <ShoppingCart size={28} style={{ color: '#10b981', marginBottom: '12px' }} />
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0A0A0A', marginBottom: '4px' }}>
                                        My Cart
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', letterSpacing: '0.2px' }}>
                                        Ready for checkout
                                    </div>
                                </motion.button>
                            </motion.div>

                            {/* Orders Card - Full Row on Mobile */}
                            <motion.div 
                                className="col-12"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45 }}
                            >
                                <motion.button
                                    onClick={() => navigate("/my-orders")}
                                    whileHover={{ y: -4, scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="p-5 w-100 rounded-3xl border-0 text-left"
                                    style={{
                                        background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                                        border: '2px solid rgba(212,175,55,0.3)',
                                        color: '#fff',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        boxShadow: 'none'
                                    }}
                                >
                                    <Package size={28} style={{ color: '#D4AF37', marginBottom: '12px' }} />
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                                        All Orders
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.2px' }}>
                                        {orders.filter(x => x.userid === localStorage.getItem("userid")).length} total purchases
                                    </div>
                                </motion.button>
                            </motion.div>
                        </motion.div>

                        {/* Recent Orders Section */}
                        <motion.div 
                            className="card border-0 shadow-lg rounded-3xl p-5 bg-white"
                            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.06)', border: '1px solid rgba(212,175,55,0.08)' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                                <h5 className="font-weight-bold mb-0" style={{ color: '#0A0A0A', fontSize: '18px', letterSpacing: '0.3px' }}>
                                    🚀 Recent Orders
                                </h5>
                                <Link to="/my-orders" className="btn btn-sm rounded-pill px-4" style={{
                                    background: 'linear-gradient(135deg, #D4AF37, #b8860b)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: '700',
                                    fontSize: '12px',
                                    letterSpacing: '0.3px'
                                }}>
                                    VIEW ALL <ArrowRight size={12} className="ml-1" />
                                </Link>
                            </div>

                            {loadingRecent || isLoading ? (
                                <div>
                                    <Skeleton count={3} height={80} style={{ marginBottom: '12px' }} />
                                </div>
                            ) : recentOrders.length ? (
                                <AnimatePresence mode="wait">
                                    <motion.div>
                                        {recentOrders.map((item, idx) => {
                                            const statusStyle = getStatusStyles(item.orderStatus)
                                            const label = normalizeStatus(item.orderStatus)
                                            return (
                                                <motion.div
                                                    key={item.orderId}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(212,175,55,0.15)' }}
                                                    onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                                                    className="p-4 mb-3 rounded-2xl cursor-pointer"
                                                    style={{
                                                        border: '1.5px solid rgba(212,175,55,0.1)',
                                                        background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
                                                        boxShadow: '0 6px 16px rgba(0,0,0,0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                >
                                                    <div className="d-flex flex-wrap align-items-center justify-content-between">
                                                        <div>
                                                            <div className="font-weight-bold" style={{ color: '#0A0A0A', fontSize: '15px', letterSpacing: '0.2px' }}>
                                                                Order #{item.orderId}
                                                            </div>
                                                            <div className="small text-muted mt-2 d-flex align-items-center" style={{ fontSize: '12px' }}>
                                                                <Clock3 size={13} className="mr-2" style={{ color: '#D4AF37' }} />
                                                                {new Date(item.updatedAt).toLocaleString('en-IN', { 
                                                                    day: 'numeric', 
                                                                    month: 'short', 
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center mt-2 mt-md-0" style={{ gap: '12px' }}>
                                                            <motion.span
                                                                initial={{ scale: 0.8 }}
                                                                animate={{ scale: 1 }}
                                                                className="px-4 py-2 rounded-pill font-weight-bold"
                                                                style={{
                                                                    background: statusStyle.bg,
                                                                    color: statusStyle.color,
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.4px',
                                                                    boxShadow: `0 4px 12px ${statusStyle.color}20`
                                                                }}
                                                            >
                                                                {label}
                                                            </motion.span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex flex-wrap align-items-center justify-content-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                                                        <div className="small">
                                                            <div style={{ fontSize: '11px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Amount</div>
                                                            <div className="font-weight-bold mt-1" style={{ fontSize: '17px', color: '#D4AF37' }}>
                                                                ₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                        <motion.button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/order-tracking/${item.orderId}`)
                                                            }}
                                                            whileHover={{ scale: 1.04, y: -1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="btn btn-sm rounded-pill px-4"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #0A0A0A, #2a2a2a)',
                                                                color: '#D4AF37',
                                                                border: '1.5px solid #D4AF37',
                                                                fontWeight: '700',
                                                                fontSize: '11px',
                                                                letterSpacing: '0.3px',
                                                                boxShadow: 'none',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                            }}
                                                        >
                                                            TRACK <ArrowRight size={12} className="ml-1" />
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="p-5 text-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                                    <ShoppingBag size={40} className="text-muted opacity-50" style={{ marginBottom: '12px' }} />
                                    <p className="mt-2 text-muted mb-3" style={{ fontSize: '14px' }}>No recent orders yet</p>
                                    <Link to="/shop/All" className="btn btn-sm rounded-pill px-4" style={{
                                        background: 'linear-gradient(135deg, #D4AF37, #b8860b)',
                                        color: '#fff',
                                        border: 'none',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        letterSpacing: '0.3px'
                                    }}>
                                        START SHOPPING
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </div>

                {/* TRUST ELEMENTS FOOTER */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 p-4 rounded-2xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04))',
                        border: '1.5px solid rgba(212,175,55,0.2)',
                        marginTop: '60px'
                    }}
                >
                    <div className="d-flex align-items-center justify-content-center" style={{ gap: '12px' }}>
                        <Shield size={20} style={{ color: '#D4AF37' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0A0A0A', letterSpacing: '0.3px' }}>
                                🔐 ENCRYPTED & SECURE
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                Your personal data is encrypted and protected with enterprise-grade security protocols
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* --- PREMIUM STYLING --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .profile-page-luxury {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
                }
                
                .rounded-3xl { border-radius: 24px !important; }
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-1xl { border-radius: 15px !important; }
                
                .cursor-pointer { cursor: pointer; }
                
                /* Skeleton Loading Shimmer */
                .react-loading-skeleton {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s infinite;
                }
                
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                /* Gold Accent Animations */
                @keyframes gold-glow {
                    0%, 100% {
                        box-shadow: 0 8px 20px rgba(212,175,55,0.2);
                    }
                    50% {
                        box-shadow: 0 8px 40px rgba(212,175,55,0.4);
                    }
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .profile-header-luxury { padding-top: 2rem !important; padding-bottom: 2rem !important; }
                    h1 { font-size: 28px !important; }
                }
            `}} />
        </div>
    )
}