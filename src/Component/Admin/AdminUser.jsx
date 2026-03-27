import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Users, Trash2, ShieldCheck, ShieldOff, User as UserIcon } from 'lucide-react'
import LefNav from './LefNav'
import { deleteUser, getUser } from '../../Store/ActionCreaters/UserActionCreators'
import './AdminPanel.css'

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' }
}

export default function AdminUser() {
    const users = useSelector((state) => state.UserStateData) || []
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    const handleDelete = (id) => {
        if (window.confirm('Permanently delete this user account?')) {
            dispatch(deleteUser({ id }))
        }
    }

    return (
        <div className="ap-page py-5">
            <LefNav />

            <div className="admin-main-content">
                <div className="container-fluid px-lg-4">
                    <div className="w-100">
                        <motion.div className="ap-card" {...fadeUp}>

                            {/* ── Header ──────────────────────────────── */}
                            <div className="ap-header">
                                <div className="ap-header-left">
                                    <div className="ap-header-icon">
                                        <Users size={22} />
                                    </div>
                                    <div>
                                        <h1 className="ap-title">Registered Users</h1>
                                        <p className="ap-subtitle">User Account Management</p>
                                    </div>
                                </div>
                                <span className="ap-count-badge">
                                    {users.length} {users.length === 1 ? 'User' : 'Users'}
                                </span>
                            </div>

                            {/* ── Table ───────────────────────────────── */}
                            <div className="ap-table-wrap">
                                <table className="ap-table" style={{ minWidth: '780px' }}>
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Role</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length > 0 ? users.map((row, i) => (
                                            <motion.tr
                                                key={row.id || row._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                            >
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                        <div className="ap-avatar">
                                                            <UserIcon size={14} />
                                                        </div>
                                                        <span className="ap-fw-bold">{row.name}</span>
                                                    </div>
                                                </td>
                                                <td className="ap-text-muted">{row.username}</td>
                                                <td style={{ fontSize: '0.83rem' }}>{row.email}</td>
                                                <td style={{ fontSize: '0.83rem' }}>{row.phone}</td>
                                                <td>
                                                    {row.role === 'Admin' ? (
                                                        <span className="ap-badge ap-badge-gold">
                                                            <ShieldCheck size={11} /> {row.role}
                                                        </span>
                                                    ) : (
                                                        <span className="ap-badge ap-badge-teal">
                                                            <ShieldOff size={11} /> {row.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="ap-btn-danger"
                                                        onClick={() => handleDelete(row.id || row._id)}
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={13} /> Remove
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="ap-table-empty">
                                                    No registered users found.
                                                </td>
                                            </tr>
                                        )}
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