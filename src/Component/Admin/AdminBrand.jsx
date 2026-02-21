import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, Tag } from 'lucide-react'

export default function AdminBrand() {
    const brand = useSelector((state) => state.BrandStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getBrand()) }, [dispatch])

    // 🎯 FIXED: Mapping MongoDB _id to id so Edit button gets the URL
    const rows = brand?.map((item) => ({
        ...item,
        id: item._id || item.id
    })) || []

    const columns = [
        { field: 'id', headerName: 'ID', width: 220 },
        { field: 'name', headerName: 'Brand Name', width: 300, renderCell: (p) => <span className="font-weight-bold">{p.value}</span> },
        {
            field: "edit", headerName: "Edit", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-info rounded-circle p-2" 
                    onClick={() => navigate(`/admin-update-brand/${row.id}`)}>
                    <Edit3 size={18} />
                </button>
            )
        },
        {
            field: "delete", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-danger rounded-circle p-2" 
                    onClick={() => { if(window.confirm("Sure want to delete brand?")) dispatch(deleteBrand({ id: row.id })) }}>
                    <Trash2 size={18} />
                </button>
            )
        },
    ];

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-9">
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-white shadow-xl rounded-2xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center"><Tag className="mr-2 text-info"/> Brands</h4>
                                <Link to="/admin-add-brand" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold'>
                                    <Plus size={18} className="mr-1"/> ADD NEW BRAND
                                </Link>
                            </div>
                            <div style={{ height: 450, width: '100%' }}>
                                <DataGrid rows={rows} columns={columns} pageSize={7} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}