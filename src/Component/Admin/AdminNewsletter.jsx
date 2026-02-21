import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';
import { Send, Trash2 } from 'lucide-react'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getNewslatter()) 
    }, [dispatch])

    // ID Mapping Fix
    const rows = Array.isArray(newsletters) ? newsletters.map((item) => ({
        ...item,
        id: item._id || item.id
    })) : []

    const columns = [
        { field: 'id', headerName: 'Subscriber ID', width: 250 },
        { field: 'email', headerName: 'Email Address', width: 400 },
        {
            field: "action", headerName: "Unsubscribe", width: 150,
            renderCell: ({ row }) => (
                <button className="btn btn-sm btn-outline-danger px-4 rounded-pill" onClick={() => dispatch(deleteNewslatter({ id: row.id }))}>
                    <Trash2 size={14} className="mr-1"/> Delete
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white shadow-lg rounded-2xl p-4" style={{ height: 550 }}>
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><Send className="mr-2 text-info" /> Subscribers List</h4>
                        <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick />
                    </div>
                </div>
            </div>
        </div>
    )
}