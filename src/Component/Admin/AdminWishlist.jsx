import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteWishlist, getWishlist } from '../../Store/ActionCreaters/WishlistActionCreators';
import { motion } from 'framer-motion'
import { Heart, Trash2 } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminWishlist() {
    const wishlist = useSelector((state) => state.WishlistStateData)
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getWishlist()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
                                <div className="d-flex align-items-center">
                                    <Heart className="text-danger mr-2" fill="#ff4757" />
                                    <h4 className="font-weight-bold mb-0">Customer Wishlists</h4>
                                </div>
                                <span className="badge badge-light p-2 border">Total items: {wishlist.length}</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover table-sm">
                                    <thead className="table-dark">
                                        <tr>
                                            <th className="d-none d-md-table-cell">ID</th>
                                            <th>Product</th>
                                            <th>Product Name</th>
                                            <th className="d-none d-lg-table-cell">User ID</th>
                                            <th>Price</th>
                                            <th>Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wishlist.length ? wishlist.map((row) => (
                                            <tr key={row.id}>
                                                <td className="small d-none d-md-table-cell">{row.id}</td>
                                                <td><img src={row.pic} height="40px" width="40px" className="rounded shadow-sm" style={{objectFit:'cover'}} alt="" /></td>
                                                <td className="small font-weight-bold">{row.name}</td>
                                                <td className="text-muted small d-none d-lg-table-cell">{row.userid}</td>
                                                <td className="text-info font-weight-bold">₹{row.price}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-light text-danger rounded-pill px-2" onClick={() => { if(window.confirm("Remove from global wishlist?")) dispatch(deleteWishlist({ id: row.id })) }}>
                                                        <Trash2 size={12} /> <span className="d-none d-sm-inline">Delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-4">No wishlist items found.</td>
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