import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteNewslatter, getNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';
import { motion } from 'framer-motion'
import { Send, Trash2 } from 'lucide-react'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'email', headerName: 'Email Address', width: 400 },
        {
            field: "delete", headerName: "Action", width: 150,
            renderCell: ({ row }) => (
                <button className="btn btn-sm btn-outline-danger px-3 rounded-pill" onClick={() => dispatch(deleteNewslatter({ id: row.id }))}>
                    <Trash2 size={14} className="mr-1" /> Remove
                </button>
            ),
        }
    ];

    useEffect(() => { dispatch(getNewslatter()) }, [dispatch])

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-xl p-4">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><Send className="mr-2 text-info"/> Subscribers</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={newsletters || []} columns={columns} pageSize={8} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}