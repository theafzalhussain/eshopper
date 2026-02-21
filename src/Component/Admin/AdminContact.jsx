import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { motion } from 'framer-motion'
import { MessageSquare, Trash2, Mail } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    function getAPIData() {
        dispatch(getContact())
    }

    useEffect(() => { 
        getAPIData() 
    }, [dispatch])

    const columns = [
        { field: 'id', headerName: 'S.No', width: 90 },
        { field: 'name', headerName: 'Customer Name', width: 180, renderCell:(params) => <strong>{params.value}</strong> },
        { field: 'email', headerName: 'Email Address', width: 230 },
        { field: 'phone', headerName: 'Phone', width: 140 },
        { field: 'subject', headerName: 'Query Subject', width: 200 },
        { field: 'message', headerName: 'Message Content', width: 300 },
        {
            field: "delete",
            headerName: "Action",
            width: 80,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm text-danger shadow-none" 
                    onClick={() => {if(window.confirm("Permanent Delete?")) dispatch(deleteContact({ id: row.id }))}}
                >
                    <Trash2 size={20} />
                </button>
            ),
        }
    ];

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex align-items-center justify-content-between mb-4 px-2">
                                <h4 className="font-weight-bold d-flex align-items-center mb-0">
                                    <MessageSquare className="mr-2 text-info"/> Feedback Inquiries
                                </h4>
                                <span className="badge badge-light p-2 border">Received: {contacts.length}</span>
                            </div>
                            
                            {/* Zaroori: Bina Height ke DataGrid nahi dikhega */}
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid 
                                    rows={contacts || []} 
                                    columns={columns} 
                                    pageSize={10} 
                                    disableSelectionOnClick
                                    density="comfortable"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}