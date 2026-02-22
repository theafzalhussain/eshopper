import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators';
import { motion } from 'framer-motion'
import { Edit3, Trash2, Plus, Grid } from 'lucide-react'

export default function AdminSubcategory() {
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    const rows = subcategory?.map((item) => ({ ...item, id: item.id || item._id })) || []

    const columns = [
        { field: 'id', headerName: 'ID', width: 220 },
        { field: 'name', headerName: 'Subcategory', width: 250 },
        {
            field: "edit", headerName: "Edit", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-info rounded-circle" onClick={() => navigate(`/admin-update-subcategory/${row.id}`)}><Edit3 size={18}/></button>
            )
        },
        {
            field: "delete", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-danger rounded-circle" onClick={() => dispatch(deleteSubcategory({id: row.id}))}><Trash2 size={18}/></button>
            )
        }
    ];

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-9">
                        <div className="bg-white p-4 shadow rounded-2xl"><div className="d-flex justify-content-between mb-4"><h4 className="font-weight-bold"><Grid size={22}/> Subcategories</h4><Link to="/admin-add-subcategory" className='btn btn-info px-4 rounded-pill font-weight-bold'>+ ADD NEW</Link></div><DataGrid rows={rows} columns={columns} autoHeight /></div>
                    </div>
                </div>
            </div>
        </div>
    )
}