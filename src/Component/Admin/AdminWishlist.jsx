import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteWishlist, getWishlist } from '../../Store/ActionCreaters/WishlistActionCreators';
import { motion } from 'framer-motion'
import { Heart, Trash2 } from 'lucide-react'

export default function AdminWishlist() {
    const wishlist = useSelector((state) => state.WishlistStateData)
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getWishlist()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <Heart className="text-danger mr-2" fill="#ff4757" />
                                    <h4 className="font-weight-bold mb-0">Customer Wishlists</h4>
                                </div>
                                <span className="badge badge-light p-2 border">Total items: {wishlist.length}</span>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover table-sm">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>ID</th>
                                            <th>Product</th>
                                            <th>Product Name</th>
                                            <th>User ID</th>
                                            <th>Price</th>
                                            <th>Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wishlist.map((row) => (
                                            <tr key={row.id}>
                                                <td className="small">{row.id}</td>
                                                <td><img src={row.pic} height="40px" width="40px" className="rounded shadow-sm" style={{objectFit:'cover'}} alt="" /></td>
                                                <td className="small font-weight-bold">{row.name}</td>
                                                <td className="text-muted small">{row.userid}</td>
                                                <td className="text-info font-weight-bold">₹{row.price}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-light text-danger rounded-pill px-2" onClick={() => { if(window.confirm("Remove from global wishlist?")) dispatch(deleteWishlist({ id: row.id })) }}>
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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