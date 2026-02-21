import React, { useEffect, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { motion } from 'framer-motion'
import { MessageSquare, Trash2 } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getContact()) 
    }, [dispatch])

    // ZAROORI FIX: MongoDB ki _id ko DataGrid ke liye map karna
    const rows = Array.isArray(contacts) ? contacts.map((item) => ({
        ...item,
        id: item._id || item.id 
    })) : []

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 300 },
        {
            field: "delete", headerName: "Action", width: 100,
            renderCell: ({ row }) => (
                <button className="btn text-danger" onClick={() => {if(window.confirm("Delete Message?")) dispatch(deleteContact({ id: row.id }))}}>
                    <Trash2 size={18} />
                </button>
            ),
        }
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><MessageSquare className="mr-2 text-info"/> Customer Inquiries</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            {/* rows={rows} ka use kiya hai */}
                            <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}