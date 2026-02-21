import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteWishlist, getWishlist } from '../../Store/ActionCreaters/WishlistActionCreators';
import { motion } from 'framer-motion'
import { Heart, Trash2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminWishlist() {
    const wishlist = useSelector((state) => state.WishlistStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'ID', width: 100 },
        { 
            field: 'pic', 
            headerName: 'Product', 
            width: 80, 
            renderCell: ({row}) => <img src={row.pic} height="40px" width="40px" className="rounded shadow-sm" style={{objectFit:'cover'}} /> 
        },
        { field: 'name', headerName: 'Product Name', width: 250, renderCell:({row})=> <span className="small font-weight-bold">{row.name}</span> },
        { field: 'userid', headerName: 'User ID', width: 220, renderCell:({row})=><span className="text-muted small">{row.userid}</span> },
        { field: 'price', headerName: 'Price', width: 120, renderCell:({row})=><span className="text-info font-weight-bold">₹{row.price}</span> },
        {
            field: "delete",
            headerName: "Remove",
            width: 120,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm btn-light text-danger rounded-pill px-3 shadow-sm border"
                    onClick={() => { if(window.confirm("Remove from global wishlist?")) dispatch(deleteWishlist({ id: row.id })) }}
                >
                    <Trash2 size={14} className="mr-1" /> Delete
                </button>
            ),
        }
    ];

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
                            <div style={{ height: 550, width: '100%' }}>
                                <DataGrid 
                                    rows={wishlist} 
                                    columns={columns} 
                                    pageSize={8} 
                                    disableSelectionOnClick
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}