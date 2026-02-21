import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getCheckout, deleteCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators';
import { motion } from 'framer-motion'
import { ShoppingBag, Trash2 } from 'lucide-react'

export default function AdminCheckout() {
    const dispatch = useDispatch()
    const checkoutData = useSelector((state) => state.CheckoutStateData)

    useEffect(() => {
        dispatch(getCheckout())
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id for DataGrid
    const rows = checkoutData ? checkoutData.map((item) => ({
        ...item,
        id: item._id || item.id 
    })) : []

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 200 },
        { field: 'userid', headerName: 'User ID', width: 200 },
        { field: 'paymentmode', headerName: 'Payment', width: 120 },
        { 
            field: 'orderstatus', 
            headerName: 'Status', 
            width: 150,
            renderCell: ({row}) => (
                <span className={`badge px-3 py-2 rounded-pill ${row.orderstatus === 'Order Placed' ? 'badge-warning' : 'badge-success'}`}>
                    {row.orderstatus}
                </span>
            )
        },
        { field: 'finalAmount', headerName: 'Total Amount', width: 130, renderCell: ({row}) => <strong>₹{row.finalAmount}</strong> },
        {
            field: "delete", headerName: "Action", width: 80,
            renderCell: ({ row }) => (
                <button className="btn text-danger" onClick={() => { if(window.confirm("Delete Order?")) dispatch(deleteCheckout({ id: row.id })) }}>
                    <Trash2 size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5" style={{ minHeight: "80vh" }}>
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-lg rounded-2xl p-4 border">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center">
                            <ShoppingBag className="mr-2 text-info"/> Manage All Orders
                        </h4>
                        <div style={{ height: 600, width: '100%' }}>
                            <DataGrid 
                                rows={rows} 
                                columns={columns} 
                                pageSize={10} 
                                disableSelectionOnClick 
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}