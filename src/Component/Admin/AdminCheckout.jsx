import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators';

export default function AdminCheckout() {
    const dispatch = useDispatch()
    const checkoutData = useSelector((state) => state.CheckoutStateData)

    useEffect(() => {
        dispatch(getCheckout())
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id
    const rows = checkoutData ? checkoutData.map((item) => ({
        ...item,
        id: item._id || item.id
    })) : []

    const columns = [
        { field: 'id', headerName: 'Order ID', width: 200 },
        { field: 'userid', headerName: 'User ID', width: 200 },
        { field: 'paymentmode', headerName: 'Payment', width: 120 },
        { field: 'orderstatus', headerName: 'Status', width: 150 },
        { field: 'finalAmount', headerName: 'Total', width: 130, renderCell: ({row}) => <strong>₹{row.finalAmount}</strong> },
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white p-4 shadow-sm rounded-lg border">
                        <h4 className="mb-4 font-weight-bold text-info">Manage Orders</h4>
                        <div style={{ height: 550, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={10} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}