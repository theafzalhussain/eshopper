import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { User, Mail, Phone, ShieldCheck, Edit3 } from 'lucide-react'

export default function AdminHome() {
    const [admin, setAdmin] = useState({})
    const dispatch = useDispatch()
    const users = useSelector((state) => state.UserStateData)

    useEffect(() => {
        dispatch(getUser())
    }, [dispatch])

    useEffect(() => {
        // Database se current Admin ki details nikaalna
        const currentUserId = localStorage.getItem("userid")
        const data = users.find((item) => item.id === currentUserId)
        if (data) setAdmin(data)
    }, [users])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            <div className="container-fluid py-5">
                <div className="row">
                    {/* --- LEFT NAVIGATION --- */}
                    <div className="col-lg-2 col-md-3 mb-4">
                        <div className="shadow-sm rounded-2xl bg-white p-2">
                            <LefNav />
                        </div>
                    </div>

                    {/* --- MAIN CONTENT AREA --- */}
                    <div className="col-lg-10 col-md-9">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white shadow-lg rounded-3xl overflow-hidden border-0"
                        >
                            <div className="row no-gutters">
                                {/* LEFT SIDE: Image/Branding */}
                                <div className="col-lg-5 bg-light d-flex align-items-center justify-content-center p-4">
                                    <div className="text-center">
                                        <motion.img 
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            transition={{ duration: 0.5 }}
                                            src={admin.pic || "/assets/images/bg_1.jpg"} 
                                            className="img-fluid rounded-2xl shadow-2xl mb-4" 
                                            style={{ maxHeight: "400px", width: "100%", objectFit: "cover", border: "5px solid white" }} 
                                            alt="Admin" 
                                        />
                                        <h4 className="font-weight-bold text-dark mb-0">System Administrator</h4>
                                        <p className="text-muted small">Eshopper Control Center</p>
                                    </div>
                                </div>

                                {/* RIGHT SIDE: Admin Details */}
                                <div className="col-lg-7 p-5">
                                    <div className="d-flex align-items-center mb-4">
                                        <div className="bg-info-light p-3 rounded-circle mr-3">
                                            <ShieldCheck size={32} className="text-info" />
                                        </div>
                                        <div>
                                            <h2 className="font-weight-bold mb-0">Admin Profile</h2>
                                            <p className="text-muted mb-0 small text-uppercase" style={{letterSpacing:'2px'}}>Personal Information</p>
                                        </div>
                                    </div>

                                    <div className="admin-info-grid">
                                        {[
                                            { icon: <User size={18}/>, label: "Full Name", value: admin.name || "Loading..." },
                                            { icon: <User size={18}/>, label: "Username", value: admin.username || "Loading..." },
                                            { icon: <Mail size={18}/>, label: "Email Address", value: admin.email || "Loading..." },
                                            { icon: <Phone size={18}/>, label: "Phone Number", value: admin.phone || "Loading..." },
                                            { icon: <ShieldCheck size={18}/>, label: "System Role", value: admin.role || "Admin" }
                                        ].map((item, index) => (
                                            <div key={index} className="d-flex align-items-center p-3 mb-2 rounded-xl transition hover-bg-light border-bottom">
                                                <div className="text-info mr-3">{item.icon}</div>
                                                <div className="flex-grow-1">
                                                    <small className="text-muted d-block" style={{fontSize:'11px'}}>{item.label}</small>
                                                    <span className="font-weight-bold text-dark">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-5">
                                        <Link to="/update-profile" className='btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold d-flex align-items-center justify-content-center'>
                                            <Edit3 size={18} className="mr-2" /> UPDATE ADMIN PROFILE
                                        </Link>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>

                        {/* --- QUICK STATS ROW (Extra Premium Feature) --- */}
                        <div className="row mt-4">
                            {['Total Users', 'Orders', 'Revenue', 'Active Ads'].map((stat, i) => (
                                <div key={i} className="col-md-3">
                                    <div className="p-3 bg-white shadow-sm rounded-2xl text-center border-0">
                                        <p className="small text-muted mb-1">{stat}</p>
                                        <h4 className="font-weight-bold mb-0">--</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 35px !important; }
                .rounded-xl { border-radius: 12px !important; }
                .bg-info-light { background-color: rgba(23, 162, 184, 0.1); }
                .hover-bg-light:hover { background-color: #fcfcfc; }
                .transition { transition: 0.3s all ease; }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15) !important; }
                .w-max { width: max-content; }
                .btn-info { background: #17a2b8; border: none; }
                .btn-info:hover { background: #138496; transform: translateY(-2px); }
            `}} />
        </div>
    )
}