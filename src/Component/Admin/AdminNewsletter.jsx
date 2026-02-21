import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteNewslatter, getNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';
import { motion } from 'framer-motion'
import { Send, Trash2, MailCheck } from 'lucide-react'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'Subscriber ID', width: 250 },
        { 
            field: 'email', 
            headerName: 'Email Address', 
            width: 400,
            renderCell: ({row}) => (
                <div className="d-flex align-items-center">
                    <MailCheck size={16} className="mr-2 text-success" />
                    <span className="font-weight-bold">{row.email}</span>
                </div>
            )
        },
        {
            field: "delete",
            headerName: "Unsubscribe",
            width: 150,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm btn-light text-danger rounded-pill px-4 border shadow-sm"
                    onClick={() => { if(window.confirm("Remove this email?")) dispatch(deleteNewslatter({ id: row.id })) }}
                >
                    <Trash2 size={14} className="mr-2" /> Remove
                </button>
            ),
        }
    ];

    useEffect(() => { dispatch(getNewslatter()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <div className="bg-info-light p-3 rounded-xl mr-3 text-info"><Send /></div>
                                    <h4 className="font-weight-bold mb-0">Newsletter Subscribers</h4>
                                </div>
                                <span className="badge badge-dark p-2">Total: {newsletters.length}</span>
                            </div>
                            <div style={{ height: 500, width: '100%' }}>
                                <DataGrid rows={newsletters} columns={columns} pageSize={8} disableSelectionOnClick />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}