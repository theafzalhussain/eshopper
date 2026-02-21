import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function AdminMaincategory() {
    const maincategory = useSelector((state) => state.MaincategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'name', headerName: 'Category Name', width: 300, renderCell: ({row}) => <span className="font-weight-bold">{row.name}</span> },
        {
            field: "actions",
            headerName: "Actions",
            width: 200,
            renderCell: ({ row }) => (
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-info mr-2 rounded-circle" onClick={() => navigate("/admin-update-maincategory/" + row.id)}>
                        <Edit size={16} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => {if(window.confirm("Delete this?")) dispatch(deleteMaincategory({ id: row.id }))}}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        },
    ];

    useEffect(() => { dispatch(getMaincategory()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2 col-md-3"><LefNav /></div>
                    <div className="col-lg-10 col-md-9">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-2xl p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold mb-0">Main Categories</h4>
                                <Link to="/admin-add-maincategory" className='btn btn-info rounded-pill px-4 d-flex align-items-center shadow-sm'>
                                    <Plus size={18} className="mr-2" /> ADD NEW
                                </Link>
                            </div>
                            <div style={{ height: 500, width: '100%' }} className="premium-datagrid">
                                <DataGrid rows={maincategory} columns={columns} pageSize={8} rowsPerPageOptions={[8]} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}