import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteCart, getCart } from '../../Store/ActionCreaters/CartActionCreators';
import { motion } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Edit } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminCart() {
    var cart = useSelector((state) => state.CartStateData)
    var dispatch = useDispatch()

    function getAPIData(){
        dispatch(getCart())
    }
    useEffect(() => {
       getAPIData()
    }, [])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                                <h4 className="font-weight-bold d-flex align-items-center mb-0">
                                    <ShoppingCart className="mr-2 text-info" /> Cart Management
                                </h4>
                                <Link to="/admin-add-cart" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold d-flex align-items-center'>
                                    <Plus size={16} className="mr-2" /> ADD CART
                                </Link>
                            </div>

                            <div className="alert alert-info rounded-xl border-0 shadow-sm">
                                <strong>Notice:</strong> Cart management interface is temporarily unavailable. Please check back later for full functionality.
                            </div>

                            {/* Placeholder table for future implementation */}
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>User</th>
                                            <th>Product</th>
                                            <th className="d-none d-md-table-cell">Quantity</th>
                                            <th className="d-none d-lg-table-cell">Total</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.length ? cart.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.id}</td>
                                                <td className="font-weight-bold">{item.userid || 'N/A'}</td>
                                                <td>{item.name || 'N/A'}</td>
                                                <td className="d-none d-md-table-cell">{item.qty || 1}</td>
                                                <td className="d-none d-lg-table-cell text-success font-weight-bold">₹{item.total || 'N/A'}</td>
                                                <td>
                                                    <button
                                                        onClick={() => dispatch(deleteCart({ id: item.id }))}
                                                        className="btn btn-sm btn-outline-danger rounded-pill"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-4">No cart items found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}

