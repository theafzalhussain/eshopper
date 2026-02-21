import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators';
import { ShoppingBag } from 'lucide-react'

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    // ID Mapping Fix
    const rows = Array.isArray(checkouts) ? checkouts.map((item) => ({
        ...item,
        id: item._id || item.id
    })) : []

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 200 },
        { field: 'userid', headerName: 'User ID', width: 200 },
        { field: 'paymentmode', headerName: 'Method', width: 120 },
        { 
            field: 'orderstatus', headerName: 'Status', width: 150,
            renderCell: ({row}) => <span className="badge badge-warning p-2">{row.orderstatus}</span> 
        },
        { field: 'finalAmount', headerName: 'Total', width: 130, renderCell:({row})=><strong>₹{row.finalAmount}</strong> },
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white shadow-lg rounded-2xl p-4 border" style={{ height: 600 }}>
                        <h4 className="mb-4 d-flex align-items-center"><ShoppingBag className="mr-2 text-info"/> Recent Orders</h4>
                        <DataGrid rows={rows} columns={columns} pageSize={10} />
                    </div>
                </div>
            </div>
        </div>
    )
}