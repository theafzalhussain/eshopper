import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getProduct, deleteProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import { Edit3, Trash2, Plus } from 'lucide-react'

export default function AdminProduct() {
    const productData = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getProduct()) }, [dispatch])

    const rows = productData?.map((item) => ({
        ...item, id: item._id || item.id // Fix: Handles MongoDB format
    })) || []

    const columns = [
        { field: 'pic1', headerName: 'Image', width: 80, renderCell: ({row}) => <img src={row.pic1} height="40px" width="40px" style={{objectFit:'cover', borderRadius:'8px'}} alt="" /> },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'finalprice', headerName: 'Price', width: 100, renderCell:({row}) => <strong>₹{row.finalprice}</strong> },
        {
            field: "actions", headerName: "Actions", width: 150,
            renderCell: ({ row }) => (
                <div className="d-flex">
                    <button className="btn btn-outline-info rounded-circle mr-2" onClick={() => navigate("/admin-update-product/" + row.id)}><Edit3 size={16} /></button>
                    <button className="btn btn-outline-danger rounded-circle" onClick={() => {if(window.confirm("Delete Product?")) dispatch(deleteProduct({id: row.id}))}}><Trash2 size={16} /></button>
                </div>
            )
        },
    ];

    return (
        <div className="container-fluid my-5"><div className="row">
            <div className="col-lg-2"><LefNav /></div>
            <div className="col-lg-10">
                <div className="bg-white p-4 shadow rounded-2xl">
                    <div className="d-flex justify-content-between mb-4">
                        <h4 className="font-weight-bold">Product Inventory</h4>
                        <Link to="/admin-add-product" className='btn btn-info rounded-pill px-4'>+ ADD NEW</Link>
                    </div>
                    <div style={{ height: 500, width: '100%' }}><DataGrid rows={rows} columns={columns} disableSelectionOnClick /></div>
                </div>
            </div>
        </div></div>
    )
}