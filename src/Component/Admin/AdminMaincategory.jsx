import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators';
import { Edit3, Trash2, Plus } from 'lucide-react'

export default function AdminMaincategory() {
    const maincategory = useSelector((state) => state.MaincategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getMaincategory()) }, [dispatch])

    // FIX: Map _id to id so DataGrid and Navigate can find the user
    const rows = maincategory?.map((item) => ({
        ...item,
        id: item._id || item.id // Handles both formats
    })) || []

    const columns = [
        { field: 'id', headerName: 'ID', width: 220 },
        { field: 'name', headerName: 'Category Name', width: 250 },
        {
            field: "edit", headerName: "Edit", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-info rounded-circle p-2" 
                    onClick={() => navigate("/admin-update-maincategory/" + row.id)}>
                    <Edit3 size={18} />
                </button>
            )
        },
        {
            field: "delete", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn btn-outline-danger rounded-circle p-2" 
                    onClick={() => { if(window.confirm("Delete this?")) dispatch(deleteMaincategory({ id: row.id })) }}>
                    <Trash2 size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-9">
                    <div className="bg-white shadow-lg rounded-2xl p-4">
                        <div className="d-flex justify-content-between mb-4">
                            <h4 className="font-weight-bold">Main Categories</h4>
                            <Link to="/admin-add-maincategory" className='btn btn-info rounded-pill px-4'>
                                <Plus size={18}/> ADD NEW
                            </Link>
                        </div>
                        <div style={{ height: 450, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={7} disableSelectionOnClick />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}