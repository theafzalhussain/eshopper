import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getCheckout, updateCheckout, deleteCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators';
import { motion } from 'framer-motion'
import { CheckSquare, CreditCard, ShoppingBag, Truck } from 'lucide-react'

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 100 },
        { field: 'userid', headerName: 'Customer ID', width: 150 },
        { 
            field: 'paymentmode', 
            headerName: 'Payment', 
            width: 120,
            renderCell: ({row}) => (
                <div className="small d-flex align-items-center">
                    <CreditCard size={14} className="mr-1 text-muted" /> {row.paymentmode}
                </div>
            )
        },
        { 
            field: 'orderstatus', 
            headerName: 'Order Status', 
            width: 150,
            renderCell: ({row}) => (
                <span className={`badge px-3 py-2 rounded-pill ${row.orderstatus === 'Order Placed' ? 'badge-warning' : 'badge-success'}`}>
                    {row.orderstatus}
                </span>
            )
        },
        { field: 'finalAmount', headerName: 'Total Amount', width: 130, renderCell: ({row}) => <strong className="text-info">₹{row.finalAmount}</strong> },
        {
            field: "update",
            headerName: "Process",
            width: 150,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm btn-info rounded-pill px-3 shadow-sm"
                    onClick={() => dispatch(updateCheckout({ ...row, orderstatus: "Packed" }))}
                >
                    <Truck size={14} className="mr-1" /> Ship Order
                </button>
            )
        },
    ];

    useEffect(() => { dispatch(getCheckout()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <div className="bg-info-light p-3 rounded-xl mr-3 text-info"><ShoppingBag /></div>
                                <h4 className="font-weight-bold mb-0">Order Management</h4>
                            </div>
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid rows={checkouts} columns={columns} pageSize={10} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}