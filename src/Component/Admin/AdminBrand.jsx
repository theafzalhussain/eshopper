import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators';
import { Tag, Edit, Trash2 } from 'lucide-react'

export default function AdminBrand() {
    const brand = useSelector((state) => state.BrandStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getBrand()) }, [dispatch])
    const rows = brand?.map(item => ({ ...item, id: item.id || item._id })) || []

    const columns = [
        { field: 'id', headerName: 'Brand ID', width: 220 },
        { field: 'name', headerName: 'Brand Name', width: 300 },
        {
            field: "action", headerName: "Edit/Delete", width: 200,
            renderCell: ({ row }) => (
                <div className="d-flex align-items-center">
                    <button className="btn btn-outline-info rounded-circle mr-3" onClick={() => navigate(`/admin-update-brand/${row.id}`)}><Edit size={16}/></button>
                    <button className="btn btn-outline-danger rounded-circle" onClick={() => dispatch(deleteBrand({id: row.id}))}><Trash2 size={16}/></button>
                </div>
            )
        }
    ];

    return (
        <div className="container-fluid my-5 py-3"><div className="row"><div className="col-lg-2"><LefNav /></div><div className="col-lg-10"><div className="bg-white p-4 shadow-xl rounded-2xl"><div className="d-flex justify-content-between mb-4"><h4 className="font-weight-bold">Partner Brands</h4><Link to="/admin-add-brand" className='btn btn-info px-4 rounded-pill'>+ BRAND</Link></div><DataGrid rows={rows} columns={columns} autoHeight disableSelectionOnClick /></div></div></div></div>
    )
}