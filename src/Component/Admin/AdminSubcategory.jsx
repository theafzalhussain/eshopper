import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, Grid } from 'lucide-react'

export default function AdminSubcategory() {
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const columns = [
        { field: 'id', headerName: 'ID', width: 220 },
        { field: 'name', headerName: 'Subcategory', width: 300 },
        {
            field: "edit", headerName: "Edit", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-info rounded-circle p-2" 
                    onClick={() => navigate(`/admin-update-subcategory/${row.id}`)}>
                    <Edit3 size={18} />
                </button>
            )
        },
        {
            field: "delete", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-danger rounded-circle p-2" 
                    onClick={() => { if(window.confirm("Are you sure?")) dispatch(deleteSubcategory({ id: row.id })) }}>
                    <Trash2 size={18} />
                </button>
            )
        },
    ];

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-9">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-white shadow-xl rounded-2xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center"><Grid className="mr-2 text-info"/> Sub-Categories</h4>
                                <Link to="/admin-add-subcategory" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold'>
                                    <Plus size={18} className="mr-1"/> ADD
                                </Link>
                            </div>
                            <div style={{ height: 450, width: '100%' }}>
                                <DataGrid rows={subcategory || []} columns={columns} pageSize={7} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}