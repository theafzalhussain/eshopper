import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';
import { motion } from 'framer-motion'
import { Send, Trash2 } from 'lucide-react'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getNewslatter()) 
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id for MUI DataGrid
    const rows = newsletters?.map((item) => ({
        ...item,
        id: item._id || item.id
    })) || []

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'email', headerName: 'Subscriber Email', width: 400, renderCell: ({row}) => <span className="font-weight-bold">{row.email}</span> },
        {
            field: "action", headerName: "Action", width: 150,
            renderCell: ({ row }) => (
                <button className="btn btn-sm btn-outline-danger rounded-pill px-4 shadow-sm" onClick={() => { if(window.confirm("Remove Subscriber?")) dispatch(deleteNewslatter({ id: row.id })) }}>
                    <Trash2 size={14} className="mr-1" /> Delete
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5" style={{ minHeight: "80vh" }}>
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-lg rounded-2xl p-4 border">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="font-weight-bold mb-0 d-flex align-items-center">
                                <Send className="mr-2 text-info"/> Newsletter List
                            </h4>
                            <span className="badge badge-info p-2">Subscribers: {newsletters.length}</span>
                        </div>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}