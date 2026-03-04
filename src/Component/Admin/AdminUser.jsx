import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteUser, getUser } from '../../Store/ActionCreaters/UserActionCreators';
import { motion } from 'framer-motion'
import { Trash2, Shield, User as UserIcon } from 'lucide-react'

export default function AdminUsers() {
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()

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
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover table-sm">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>ID</th>
                                            <th>Full Name</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Role</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((row) => (
                                            <tr key={row.id}>
                                                <td className="small">{row.id}</td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-light rounded-circle p-1 mr-2"><UserIcon size={12}/></div>
                                                        <span className="font-weight-bold">{row.name}</span>
                                                    </div>
                                                </td>
                                                <td className="small">{row.username}</td>
                                                <td className="small">{row.email}</td>
                                                <td className="small">{row.phone}</td>
                                                <td><span className={`badge rounded-pill px-2 py-1 text-white ${row.role === 'Admin' ? 'bg-danger' : 'bg-info'}`}>{row.role}</span></td>
                                                <td>
                                                    <button className="btn btn-sm btn-outline-danger rounded-circle border-0" onClick={() => { if(window.confirm("Permanent delete this user?")) dispatch(deleteUser({ id: row.id })) }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}