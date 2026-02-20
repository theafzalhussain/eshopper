import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { getCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'
import { motion } from 'framer-motion'

export default function Profile() {
    var users = useSelector((state) => state.UserStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)
    var orders = useSelector((state) => state.CheckoutStateData)
    
    var [user, setuser] = useState({})
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
                            <h5 className="font-weight-bold text-dark mb-4">Recent Status</h5>
                            <div className="p-5 text-center bg-light rounded-xl">
                                <span className="icon-shopping_bag h1 text-muted opacity-25"></span>
                                <p className="mt-3 text-muted">Aapka dashboard live connect ho chuka hai.</p>
                                <Link to="/shop/All" className="btn btn-info btn-sm px-4 rounded-pill">Continue Shopping</Link>
                            </div>
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
            `}} />
        </div>
    )
}