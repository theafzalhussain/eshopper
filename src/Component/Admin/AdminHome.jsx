import React, { useEffect, useState } from 'react'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { getProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { getContact } from '../../Store/ActionCreaters/ContactActionCreators'
import { motion } from 'framer-motion'
import { Users, ShoppingBag, MessageSquare, DollarSign } from 'lucide-react'

export default function AdminHome() {
    const dispatch = useDispatch()
    const users = useSelector((state) => state.UserStateData)
    const products = useSelector((state) => state.ProductStateData)
    const contacts = useSelector((state) => state.ContactStateData)
    const checkouts = useSelector((state) => state.CheckoutStateData)

    const [admin, setAdmin] = useState({})

    useEffect(() => {
        // Sabhi data ek saath fetch karo
        dispatch(getUser()); dispatch(getProduct()); 
        dispatch(getContact()); dispatch(getCheckout());
    }, [dispatch])

    useEffect(() => {
        const data = users.find((item) => item.id === localStorage.getItem("userid"))
        if (data) setAdmin(data)
    }, [users])

    const stats = [
        { title: "Total Users", count: users.length, icon: <Users className="text-info" />, color: "bg-info-light" },
        { title: "Products", count: products.length, icon: <ShoppingBag className="text-success" />, color: "bg-success-light" },
        { title: "Queries", count: contacts.length, icon: <MessageSquare className="text-warning" />, color: "bg-warning-light" },
        { title: "Total Orders", count: checkouts.length, icon: <DollarSign className="text-danger" />, color: "bg-danger-light" }
    ]

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 shadow rounded-3xl mb-4">
                            <h2 className="font-weight-bold mb-4">Admin Dashboard</h2>
                            <div className="row">
                                {stats.map((s, i) => (
                                    <div key={i} className="col-md-3 mb-3">
                                        <div className={`p-4 rounded-2xl text-center shadow-sm bg-white border`}>
                                            <div className="mb-2">{s.icon}</div>
                                            <h3 className="font-weight-bold mb-0">{s.count}</h3>
                                            <small className="text-muted font-weight-bold">{s.title}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}