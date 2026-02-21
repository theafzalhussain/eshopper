import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function AdminSubcategory() {
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'name', headerName: 'Subcategory Name', width: 300 },
        {
            field: "actions",
            headerName: "Actions",
            width: 200,
            renderCell: ({ row }) => (
                <div className="d-flex">
                    <button className="btn btn-sm btn-outline-info mr-2 rounded-circle" onClick={() => navigate("/admin-update-subcategory/" + row.id)}>
                        <Edit size={16} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => {if(window.confirm("Delete this?")) dispatch(deleteSubcategory({ id: row.id }))}}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        },
    ];

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-2xl p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold">Subcategories</h4>
                                <Link to="/admin-add-subcategory" className='btn btn-info rounded-pill px-4'><Plus size={18} className="mr-2"/> ADD</Link>
                            </div>
                            <div style={{ height: 500, width: '100%' }}>
                                <DataGrid rows={subcategory} columns={columns} pageSize={8} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}