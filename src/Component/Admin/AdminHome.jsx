import React, { useEffect, useState, useMemo } from 'react'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Users, ShoppingBag, DollarSign, Package, ShieldCheck, Mail, Phone, Edit3 } from 'lucide-react'
import { Link } from 'react-router-dom'

// Importing all ActionCreators to fetch live data
import { getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { getProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { getContact } from '../../Store/ActionCreaters/ContactActionCreators'

export default function AdminHome() {
    const dispatch = useDispatch()
    
    // --- 📊 GETTING DATA FROM REDUX ---
    const users = useSelector((state) => state.UserStateData) || []
    const products = useSelector((state) => state.ProductStateData) || []
    const orders = useSelector((state) => state.CheckoutStateData) || []
    const contacts = useSelector((state) => state.ContactStateData) || []

    const [admin, setAdmin] = useState({})

    useEffect(() => {
        // Dashboard load hote hi database se fresh data mangana
        dispatch(getUser())
        dispatch(getProduct())
        dispatch(getCheckout())
        dispatch(getContact())
    }, [dispatch])

    useEffect(() => {
        const currentUserId = localStorage.getItem("userid")
        // Mapping string IDs accurately
        const currentAdmin = users.find((item) => (item.id || item._id) === currentUserId)
        if (currentAdmin) setAdmin(currentAdmin)
    }, [users])

    // --- 🧮 CALCULATING LIVE STATS ---
    const statsData = useMemo(() => {
        // Calculating total revenue from all checkout orders
        const totalRevenue = orders.reduce((sum, item) => sum + (Number(item.finalAmount) || 0), 0);
        
        return [
            { 
                title: "Total Users", 
                count: users.length, 
                icon: <Users size={26} />, 
                color: "#17a2b8" // Cyan
            },
            { 
                title: "Orders", 
                count: orders.length, 
                icon: <ShoppingBag size={26} />, 
                color: "#28a745" // Green
            },
            { 
                title: "Revenue", 
                count: "₹" + totalRevenue.toLocaleString(), 
                icon: <DollarSign size={26} />, 
                color: "#ffc107" // Amber/Gold
            },
            { 
                title: "Live Products", 
                count: products.length, 
                icon: <Package size={26} />, 
                color: "#ff4757" // Red
            }
        ];
    }, [users, products, orders]);

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "100vh", paddingTop: "50px" }}>
            <div className="container-fluid px-lg-5">
                <div className="row">
                    {/* LEFT MENU */}
                    <div className="col-lg-3 col-md-4">
                        <LefNav />
                    </div>

                    {/* MAIN DASHBOARD */}
                    <div className="col-lg-9 col-md-8">
                        {/* Profile Overview Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white shadow-xl rounded-3xl overflow-hidden border-0 mb-5 p-0"
                        >
                            <div className="row no-gutters">
                                <div className="col-lg-4 bg-light d-flex flex-column align-items-center justify-content-center p-5 border-right">
                                    <img 
                                        src={admin.pic || "/assets/images/bg_1.jpg"} 
                                        className="rounded-2xl shadow-2xl mb-4 border-white" 
                                        style={{ height: "240px", width: "220px", objectFit: "cover", border: "5px solid white" }} 
                                        alt="Admin" 
                                    />
                                    <h4 className="font-weight-bold text-dark">{admin.name || "Administrator"}</h4>
                                    <p className="badge badge-info px-3">SUPER ADMIN</p>
                                </div>
                                <div className="col-lg-8 p-5">
                                    <div className="d-flex align-items-center mb-4">
                                        <ShieldCheck className="text-info mr-3" size={28}/>
                                        <h3 className="font-weight-bold mb-0">System Control Center</h3>
                                    </div>
                                    <div className="row">
                                        <div className="col-sm-6 mb-4">
                                            <p className="text-muted small uppercase ls-1 mb-1">Login Identity</p>
                                            <div className="font-weight-bold">@{admin.username || "admin_account"}</div>
                                        </div>
                                        <div className="col-sm-6 mb-4">
                                            <p className="text-muted small uppercase ls-1 mb-1">Direct Contact</p>
                                            <div className="font-weight-bold">{admin.phone || "+91 000-0000"}</div>
                                        </div>
                                        <div className="col-sm-6 mb-4">
                                            <p className="text-muted small uppercase ls-1 mb-1">Management Email</p>
                                            <div className="font-weight-bold">{admin.email || "loading..."}</div>
                                        </div>
                                    </div>
                                    <Link to="/update-profile" className='btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg transition hover-scale mt-3'>
                                        <Edit3 size={18} className="mr-2" /> RE-CALIBRATE PROFILE
                                    </Link>
                                </div>
                            </div>
                        </motion.div>

                        {/* --- 📈 THE LIVE STATS GRID --- */}
                        <div className="row">
                            {statsData.map((item, index) => (
                                <motion.div 
                                    key={index} className="col-xl-3 col-sm-6 mb-4" 
                                    whileHover={{ scale: 1.03 }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="bg-white p-4 shadow-sm border rounded-2xl h-100 text-center d-flex flex-column align-items-center justify-content-center">
                                        <div className="p-3 rounded-circle mb-3 shadow-sm" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                                            {item.icon}
                                        </div>
                                        <h2 className="font-weight-bold text-dark mb-1">{item.count}</h2>
                                        <span className="text-muted small font-weight-bold text-uppercase">{item.title}</span>
                                        <div className="w-25 bg-info mt-2" style={{height:'3px', opacity: 0.3}}></div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Custom Global CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 25px !important; }
                .rounded-3xl { border-radius: 35px !important; }
                .ls-1 { letter-spacing: 1px; }
                .uppercase { text-transform: uppercase; }
                .shadow-2xl { box-shadow: 0 40px 80px rgba(0,0,0,0.12) !important; }
                .shadow-xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08) !important; }
                .transition { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .hover-scale:hover { transform: scale(1.02); }
                .vh-90 { height: 90vh; }
            `}} />
        </div>
    )
}