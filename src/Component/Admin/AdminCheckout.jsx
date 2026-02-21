import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators';
import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id for MUI DataGrid
    const rows = checkouts?.map((item) => ({
        ...item,
        id: item._id || item.id
    })) || []

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 150 },
        { field: 'userid', headerName: 'Customer ID', width: 200 },
        { field: 'paymentmode', headerName: 'Payment', width: 120 },
        { 
            field: 'orderstatus', headerName: 'Status', width: 150,
            renderCell: ({row}) => <span className={`badge ${row.orderstatus === 'Order Placed' ? 'badge-warning' : 'badge-success'} px-3 py-2 rounded-pill`}>{row.orderstatus}</span>
        },
        { field: 'finalAmount', headerName: 'Amount', width: 130, renderCell: ({row}) => <strong className="text-info">₹{row.finalAmount}</strong> },
    ];

    return (
        <div className="container-fluid my-5" style={{ minHeight: "80vh" }}>
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-lg rounded-2xl p-4 border">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><ShoppingBag className="mr-2 text-info"/> Manage Orders</h4>
                        <div style={{ height: 550, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}