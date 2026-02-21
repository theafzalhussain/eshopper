import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { motion } from 'framer-motion'
import { MessageSquare, Trash2, Mail, Phone, Calendar } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Customer Name', width: 150, renderCell: ({row}) => <span className="font-weight-bold">{row.name}</span> },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'phone', headerName: 'Phone', width: 130 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 250 },
        { 
            field: 'status', 
            headerName: 'Status', 
            width: 120,
            renderCell: ({row}) => (
                <span className={`badge rounded-pill px-3 py-2 ${row.status === 'Active' ? 'badge-info' : 'badge-success'}`}>
                    {row.status}
                </span>
            )
        },
        {
            field: "delete",
            headerName: "Action",
            width: 80,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm btn-outline-danger rounded-circle border-0"
                    onClick={() => { if(window.confirm("Delete this message?")) dispatch(deleteContact({ id: row.id })) }}
                >
                    <Trash2 size={18} />
                </button>
            ),
        }
    ];

    useEffect(() => { dispatch(getContact()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <div className="bg-info-light p-3 rounded-xl mr-3 text-info"><MessageSquare /></div>
                                <h4 className="font-weight-bold mb-0">Customer Inquiries</h4>
                            </div>
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid rows={contacts} columns={columns} pageSize={10} disableSelectionOnClick density="comfortable" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}