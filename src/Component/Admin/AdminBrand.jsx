import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function AdminBrand() {
    const brand = useSelector((state) => state.BrandStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'name', headerName: 'Brand Name', width: 300 },
        {
            field: "actions",
            headerName: "Actions",
            width: 200,
            renderCell: ({ row }) => (
                <div className="d-flex">
                    <button className="btn btn-sm btn-outline-info mr-2 rounded-circle" onClick={() => navigate("/admin-update-brand/" + row.id)}>
                        <Edit size={16} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => {if(window.confirm("Delete this?")) dispatch(deleteBrand({ id: row.id }))}}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        },
    ];

    useEffect(() => { dispatch(getBrand()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-2xl p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold text-dark">Brand Management</h4>
                                <Link to="/admin-add-brand" className='btn btn-info rounded-pill px-4'><Plus size={18} className="mr-2"/> NEW BRAND</Link>
                            </div>
                            <div style={{ height: 500, width: '100%' }}>
                                <DataGrid rows={brand} columns={columns} pageSize={8} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}