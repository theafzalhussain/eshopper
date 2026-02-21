import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteUser, getUser } from '../../Store/ActionCreaters/UserActionCreators';
import { motion } from 'framer-motion'
import { Trash2, Shield, User as UserIcon, Mail, Phone } from 'lucide-react'

export default function AdminUsers() {
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()

    const columns = [
        { field: 'id', headerName: 'ID', width: 100 },
        { 
            field: 'name', 
            headerName: 'Full Name', 
            width: 200, 
            renderCell: ({row}) => (
                <div className="d-flex align-items-center">
                    <div className="bg-light rounded-circle p-2 mr-2"><UserIcon size={14}/></div>
                    <span className="font-weight-bold">{row.name}</span>
                </div>
            )
        },
        { field: 'username', headerName: 'Username', width: 150 },
        { field: 'email', headerName: 'Email', width: 220 },
        { field: 'phone', headerName: 'Phone', width: 130 },
        { 
            field: 'role', 
            headerName: 'Role', 
            width: 120,
            renderCell: ({row}) => (
                <span className={`badge rounded-pill px-3 py-2 ${row.role === 'Admin' ? 'badge-danger' : 'badge-info'}`}>
                    {row.role}
                </span>
            )
        },
        {
            field: "delete",
            headerName: "Action",
            width: 100,
            renderCell: ({ row }) => (
                <button 
                    className="btn btn-sm btn-outline-danger rounded-circle border-0"
                    onClick={() => { if(window.confirm("Permanent delete this user?")) dispatch(deleteUser({ id: row.id })) }}
                >
                    <Trash2 size={18} />
                </button>
            ),
        }
    ];

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Shield className="text-info mr-2" />
                                <h4 className="font-weight-bold mb-0">Registered Users</h4>
                            </div>
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid 
                                    rows={users} 
                                    columns={columns} 
                                    pageSize={10} 
                                    disableSelectionOnClick
                                    className="border-0"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}