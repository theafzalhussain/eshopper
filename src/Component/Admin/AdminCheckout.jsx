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

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 200 },
        { field: 'userid', headerName: 'User ID', width: 200 },
        { field: 'paymentmode', headerName: 'Payment', width: 120 },
        { field: 'orderstatus', headerName: 'Status', width: 150 },
        { field: 'finalAmount', headerName: 'Amount', width: 130, renderCell: ({row}) => <strong>₹{row.finalAmount}</strong> },
    ];

    useEffect(() => { dispatch(getCheckout()) }, [dispatch])

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-xl p-4">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><ShoppingBag className="mr-2 text-info"/> Orders List</h4>
                        <div style={{ height: 550, width: '100%' }}>
                            <DataGrid rows={checkouts || []} columns={columns} pageSize={10} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}