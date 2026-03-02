import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { getCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'
import { motion } from 'framer-motion'
import { BASE_URL } from '../constants'
import { ArrowRight, ExternalLink, ShoppingBag, Clock3 } from 'lucide-react'

export default function Profile() {
    var users = useSelector((state) => state.UserStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)
    var orders = useSelector((state) => state.CheckoutStateData)
    
    var [user, setuser] = useState({})
    const [recentOrders, setRecentOrders] = useState([])
    const [loadingRecent, setLoadingRecent] = useState(false)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getWishlist())
        dispatch(getCheckout())
        
        const userId = localStorage.getItem("userid")
        var data = users.find((item) => item.id === userId)
        if (data) setuser(data)
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
        <div className="profile-page" style={{ backgroundColor: "#f4f7f6", minHeight: "100vh", paddingBottom: "50px" }}>
            {/* --- PREMIUM HEADER --- */}
            <div className="profile-header py-5 mb-5" style={{ background: "linear-gradient(45deg, #1a1a1a, #4a4a4a)", color: "white" }}>
                <div className="container text-center">
                    <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-weight-bold">
                        Welcome Back, {user.name?.split(' ')[0]}!
                    </motion.h1>
                    <p className="text-white-50">Manage your account, orders, and wishlist in one place.</p>
                </div>
            </div>

            <div className="container">
                <div className="row">
                    {/* --- LEFT SIDE: PROFILE CARD --- */}
                    <motion.div className="col-lg-4 mb-4" variants={containerVariants} initial="hidden" animate="visible">
                        <div className="card border-0 shadow-sm rounded-2xl overflow-hidden text-center p-4 bg-white">
                            <div className="position-relative d-inline-block mx-auto mb-4">
                                <img 
                                    src={user.pic || "/assets/images/noimage.png"} 
                                    className="rounded-circle shadow-lg border-info" 
                                    style={{ width: "150px", height: "150px", objectFit: "cover", border: "4px solid" }} 
                                    alt="User" 
                                />
                                <Link to="/update-profile" className="btn btn-info btn-sm rounded-circle position-absolute" style={{ bottom: "5px", right: "5px" }}>
                                    <i className="icon-edit"></i>
                                </Link>
                            </div>
                            <h4 className="font-weight-bold mb-1">{user.name}</h4>
                            <p className="text-muted small">@{user.username}</p>
                            <hr />
                            <div className="d-flex justify-content-around text-center mt-3">
                                <div>
                                    <h5 className="font-weight-bold mb-0">{wishlist.filter(x => x.userid === localStorage.getItem("userid")).length}</h5>
                                    <small className="text-muted uppercase" style={{ fontSize: '10px' }}>Wishlist</small>
                                </div>
                                <div className="border-left h-100"></div>
                                <div>
                                    <h5 className="font-weight-bold mb-0">{orders.filter(x => x.userid === localStorage.getItem("userid")).length}</h5>
                                    <small className="text-muted uppercase" style={{ fontSize: '10px' }}>Orders</small>
                                </div>
                            </div>
                            <button onClick={() => navigate("/update-profile")} className="btn btn-outline-info btn-block mt-4 rounded-pill font-weight-bold">
                                EDIT SETTINGS
                            </button>
                        </div>
                    </motion.div>

                    {/* --- RIGHT SIDE: DETAILS & ACTIVITY --- */}
                    <motion.div className="col-lg-8" variants={containerVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
                        {/* 1. Account Details Section */}
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white mb-4">
                            <h5 className="font-weight-bold text-info mb-4 border-bottom pb-2">Account Overview</h5>
                            <BuyerProfile user={user} />
                        </div>

                        {/* 2. Quick Links Grid */}
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <motion.div whileHover={{ scale: 1.02 }} className="p-4 bg-info text-white rounded-2xl shadow-sm h-100 cursor-pointer" onClick={() => navigate("/wishlist")}>
                                    <div className="d-flex align-items-center">
                                        <span className="icon-heart h2 mr-3 mb-0"></span>
                                        <div>
                                            <h5 className="mb-0 font-weight-bold text-white">My Wishlist</h5>
                                            <small className="opacity-75">View items you loved</small>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                            <div className="col-md-6 mb-4">
                                <motion.div whileHover={{ scale: 1.02 }} className="p-4 bg-dark text-white rounded-2xl shadow-sm h-100 cursor-pointer" onClick={() => navigate("/cart")}>
                                    <div className="d-flex align-items-center">
                                        <span className="icon-shopping_cart h2 mr-3 mb-0"></span>
                                        <div>
                                            <h5 className="mb-0 font-weight-bold text-white">My Cart</h5>
                                            <small className="opacity-75">Ready for checkout</small>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* 3. Recent Activity / Orders Preview */}
                        <div className="card border-0 shadow-sm rounded-2xl p-4 bg-white">
                            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                                <h5 className="font-weight-bold text-dark mb-0">Recent Status</h5>
                                <Link to="/my-orders" className="btn btn-outline-dark btn-sm rounded-pill px-3 mt-2 mt-md-0">
                                    View All Orders <ArrowRight size={13} className="ml-1" />
                                </Link>
                            </div>
                            {loadingRecent ? (
                                <div className="p-4 text-center bg-light rounded-xl text-muted">Loading recent orders...</div>
                            ) : recentOrders.length ? (
                                <div>
                                    {recentOrders.map((item) => {
                                        const statusStyle = getStatusStyles(item.orderStatus)
                                        const label = normalizeStatus(item.orderStatus)
                                        return (
                                            <motion.div
                                                key={item.orderId}
                                                whileHover={{ y: -2 }}
                                                className="p-3 mb-3 rounded-xl"
                                                style={{ border: '1px solid #ececec', background: '#fff' }}
                                            >
                                                <div className="d-flex flex-wrap align-items-center justify-content-between">
                                                    <div>
                                                        <div className="font-weight-bold" style={{ color: '#111' }}>{item.orderId}</div>
                                                        <div className="small text-muted mt-1 d-flex align-items-center">
                                                            <Clock3 size={13} className="mr-1" />
                                                            {new Date(item.updatedAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center mt-2 mt-md-0">
                                                        <span
                                                            className="px-3 py-2 rounded-pill font-weight-bold small"
                                                            style={{ background: statusStyle.bg, color: statusStyle.color }}
                                                        >
                                                            {label}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px dashed #eee' }}>
                                                    <div className="small text-muted">
                                                        Amount: <span className="font-weight-bold text-dark">₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="d-flex mt-2 mt-md-0">
                                                        <button
                                                            onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                                                            className="btn btn-dark btn-sm rounded-pill px-3 mr-2"
                                                        >
                                                            Track Now <ArrowRight size={14} className="ml-1" />
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(`/order-tracking/${item.orderId}`, '_blank')}
                                                            className="btn btn-outline-dark btn-sm rounded-pill px-3"
                                                        >
                                                            Full Screen <ExternalLink size={13} className="ml-1" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}

                                    <div className="text-center mt-2">
                                        <Link to="/my-orders" className="btn btn-dark btn-sm px-4 rounded-pill mr-2 mb-2">
                                            My Orders
                                        </Link>
                                        <Link to="/shop/All" className="btn btn-info btn-sm px-4 rounded-pill">
                                            Continue Shopping
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center bg-light rounded-xl">
                                    <ShoppingBag size={34} className="text-muted opacity-50" />
                                    <p className="mt-3 text-muted mb-2">No recent orders found yet.</p>
                                    <Link to="/my-orders" className="btn btn-dark btn-sm px-4 rounded-pill mr-2 mb-2">My Orders</Link>
                                    <Link to="/shop/All" className="btn btn-info btn-sm px-4 rounded-pill">Continue Shopping</Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* --- PREMIUM STYLING --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .btn-info { background: #17a2b8; border: none; }
                .btn-info:hover { background: #138496; }
                .border-info { border-color: #17a2b8 !important; }
                .cursor-pointer { cursor: pointer; }
                .uppercase { text-transform: uppercase; letter-spacing: 1px; }
                .xx-small { font-size: 10px; }
                .transition { transition: 0.3s all ease; }
                .card { border: none !important; }
                @media (max-width: 768px) {
                    .profile-header { padding-top: 3rem !important; padding-bottom: 3rem !important; }
                }
            `}} />
        </div>
    )
}