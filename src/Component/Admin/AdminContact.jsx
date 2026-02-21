import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { motion } from 'framer-motion'
import { MessageSquare, Trash2 } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 250 },
        { field: 'status', headerName: 'Status', width: 100 },
        {
            field: "delete", headerName: "Action", width: 80,
            renderCell: ({ row }) => (
                <button className="btn btn-sm text-danger" onClick={() => dispatch(deleteContact({ id: row.id }))}>
                    <Trash2 size={18} />
                </button>
            ),
        }
    ];

    useEffect(() => { dispatch(getContact()) }, [dispatch])

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-xl p-4">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><MessageSquare className="mr-2 text-info"/> Inquiries</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={contacts || []} columns={columns} pageSize={8} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}