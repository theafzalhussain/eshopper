import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { motion } from 'framer-motion'
import { Trash2, MailOpen } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getContact()) 
    }, [dispatch])

    // FIX: DataGrid needs 'id', so we map MongoDB '_id' to 'id'
    const rows = contacts?.map((item) => ({
        ...item,
        id: item._id || item.id 
    })) || []

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Customer', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 250 },
        {
            field: "action", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn text-danger p-0" onClick={() => { if(window.confirm("Delete Message?")) dispatch(deleteContact({ id: row.id })) }}>
                    <Trash2 size={18} />
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
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><MailOpen className="mr-2 text-info"/> Customer Queries</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}