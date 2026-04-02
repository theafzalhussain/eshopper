import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteUser, getUser } from '../../Store/ActionCreaters/UserActionCreators';
import { motion } from 'framer-motion'
import { Trash2, Shield, User as UserIcon, Crown } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../../constants'

export default function AdminUsers() {
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const [membershipFilter, setMembershipFilter] = useState('All')
    const [upgradingIds, setUpgradingIds] = useState([])

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    const filteredUsers = useMemo(() => {
        if (membershipFilter === 'All') return users
        return users.filter((user) => String(user.membershipType || 'Silver') === membershipFilter)
    }, [users, membershipFilter])

    const upgradeMembership = async (userId, membershipType) => {
        setUpgradingIds((prev) => [...prev, userId])
        try {
            await axios.put(`${BASE_URL}/api/admin/users/${userId}/membership`, { membershipType })
            dispatch(getUser())
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to update membership')
        } finally {
            setUpgradingIds((prev) => prev.filter((id) => id !== userId))
        }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                        <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
                                <div className="d-flex align-items-center">
                                    <Shield className="text-info mr-2" />
                                    <h4 className="font-weight-bold mb-0">Registered Users</h4>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {['All', 'Silver', 'Gold', 'Elite'].map((tier) => (
                                        <button
                                            key={tier}
                                            type="button"
                                            className={`btn btn-sm rounded-pill px-3 ${membershipFilter === tier ? 'btn-dark' : 'btn-outline-secondary'}`}
                                            onClick={() => setMembershipFilter(tier)}
                                        >
                                            {tier}
                                        </button>
                                    ))}
                                </div>
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
                                            <th>Membership</th>
                                            <th>Total Orders</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((row) => {
                                            const rowId = row.id || row._id
                                            const currentMembership = row.membershipType || 'Silver'
                                            return (
                                            <tr key={rowId}>
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
                                                    <span className={`badge rounded-pill px-2 py-1 ${currentMembership === 'Elite' ? 'bg-warning text-dark' : currentMembership === 'Gold' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                                                        {currentMembership}
                                                    </span>
                                                </td>
                                                <td className="small">{row.totalOrders || 0}</td>
                                                <td>
                                                    <div className="d-flex flex-wrap gap-2 align-items-center">
                                                        <button className="btn btn-sm btn-outline-danger rounded-circle border-0" onClick={() => { if(window.confirm("Permanent delete this user?")) dispatch(deleteUser({ id: rowId })) }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <select
                                                            className="form-control form-control-sm rounded-pill"
                                                            style={{ width: '130px' }}
                                                            value={currentMembership}
                                                            onChange={(e) => upgradeMembership(rowId, e.target.value)}
                                                            disabled={upgradingIds.includes(rowId)}
                                                        >
                                                            {['Silver', 'Gold', 'Elite'].map((tier) => (
                                                                <option key={tier} value={tier}>{tier}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})}
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