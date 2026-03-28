import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav';
import { deleteUser, getUser, updateUser } from '../../Store/ActionCreaters/UserActionCreators';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Shield, User as UserIcon, UserCheck, UserX, Search, Filter, MoreVertical, ChevronDown, ChevronUp, Star, Lock, Unlock, Users, ArrowRight, CheckCircle2, Ban } from 'lucide-react';
import './SystemControlCenter.css';
import './AdminResponsive.css';

// Premium User Status Toggle (active/blocked)
const UserStatusToggle = ({ status, onToggle }) => (
    <motion.button
        whileTap={{ scale: 0.92 }}
        className={`scc-badge scc-badge--${status === 'active' ? 'success' : 'danger'}`}
        onClick={onToggle}
        title={status === 'active' ? 'Block User' : 'Unblock User'}
        style={{ minWidth: 80 }}
    >
        {status === 'active' ? <Unlock size={14} /> : <Lock size={14} />} {status.charAt(0).toUpperCase() + status.slice(1)}
    </motion.button>
);

// Premium Role Badge
const RoleBadge = ({ role }) => (
    <span className={`scc-badge scc-badge--${role === 'Admin' ? 'warning' : 'info'}`}>{role}</span>
);

// User Details Modal with orders & activity
import axios from 'axios';
const UserDetailsModal = ({ user, open, onClose }) => {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    React.useEffect(() => {
        if (open && user?.email) {
            setLoading(true);
            axios.get(`/api/admin/orders?search=${encodeURIComponent(user.email)}&limit=5`)
                .then(res => setOrders(res.data.orders || []))
                .catch(() => setOrders([]))
                .finally(() => setLoading(false));
        }
    }, [open, user]);
    return (
        <AnimatePresence>
            {open && (
                <motion.div className="scc-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="scc-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                        <div className="scc-modal-header">
                            <UserIcon size={24} />
                            <span style={{ fontWeight: 700, fontSize: '1.2rem', marginLeft: 8 }}>{user?.name}</span>
                            <button className="scc-modal-close" onClick={onClose}>&times;</button>
                        </div>
                        <div className="scc-modal-body">
                            <div><b>Email:</b> {user?.email}</div>
                            <div><b>Phone:</b> {user?.phone}</div>
                            <div><b>Role:</b> {user?.role}</div>
                            <div><b>Status:</b> {user?.status}</div>
                            <hr style={{ margin: '16px 0' }} />
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent Orders</div>
                            {loading ? <div>Loading orders...</div> : (
                                orders.length === 0 ? <div style={{ color: '#888' }}>No recent orders found.</div> : (
                                    <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                                        {orders.map(order => (
                                            <li key={order._id} style={{ marginBottom: 6 }}>
                                                <span style={{ fontWeight: 500 }}>#{order.orderId}</span> - {order.orderStatus} - <span style={{ color: '#0D9488' }}>{order.amount ? `₹${order.amount}` : ''}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )
                            )}
                            {/* Activity log placeholder */}
                            <hr style={{ margin: '16px 0' }} />
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent Activity</div>
                            <ul style={{ color: '#888', paddingLeft: 18, marginBottom: 0 }}>
                                {auditLog.filter(l => user && l.msg.includes(user.email || user.name)).length === 0 && (
                                    <li>[No recent activity]</li>
                                )}
                                {auditLog.filter(l => user && l.msg.includes(user.email || user.name)).map((l, i) => (
                                    <li key={i}>{l.time}: {l.msg}</li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

function AdminUsers() {
    const users = useSelector((state) => state.UserStateData) || [];
    const dispatch = useDispatch();
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    // Bulk actions state
    const [selectedIds, setSelectedIds] = useState([]);
    const allVisibleIds = paginatedUsers.map(u => u.id);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

    useEffect(() => { dispatch(getUser()); }, [dispatch]);

    // Filtered and sorted users
    const filteredUsers = users
        .filter(u => {
            // Search
            const matchesSearch =
                u.name?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase()) ||
                u.username?.toLowerCase().includes(search.toLowerCase());
            // Role filter
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            // Status filter
            const matchesStatus = filterStatus === 'all' || (u.status || 'active') === filterStatus;
            return matchesSearch && matchesRole && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else if (sortBy === 'role') {
                return sortDir === 'asc' ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role);
            } else {
                return 0;
            }
        });

    // Pagination
    const USERS_PER_PAGE = 10;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
    useEffect(() => { setPage(1); }, [search, filterRole, filterStatus]);
    const paginatedUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

    // Toggle user status (active/blocked)
    const handleStatusToggle = (user) => {
        const newStatus = (user.status || 'active') === 'active' ? 'blocked' : 'active';
        if(window.confirm(`Are you sure you want to ${newStatus === 'blocked' ? 'block' : 'unblock'} this user?`)) {
            dispatch(updateUser({ ...user, status: newStatus }));
        }
    };

    // Handle user details modal
    const openUserModal = (user) => {
        setSelectedUser(user);
        setModalOpen(true);
    };
    const closeUserModal = () => setModalOpen(false);

    // Handle sorting
    const handleSort = (field) => {
        if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortDir('asc'); }
    };

    // Bulk action handlers
    const handleSelectAll = () => {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(allVisibleIds);
    };
    const handleSelectOne = (id) => {
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };
    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} users?`)) {
            selectedIds.forEach(id => dispatch(deleteUser({ id })));
            setSelectedIds([]);
        }
    };
    const handleBulkBlock = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Block ${selectedIds.length} users?`)) {
            filteredUsers.filter(u => selectedIds.includes(u.id)).forEach(user => {
                if ((user.status || 'active') !== 'blocked') dispatch(updateUser({ ...user, status: 'blocked' }));
            });
            setSelectedIds([]);
        }
    };
    const handleBulkUnblock = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Unblock ${selectedIds.length} users?`)) {
            filteredUsers.filter(u => selectedIds.includes(u.id)).forEach(user => {
                if ((user.status || 'active') !== 'active') dispatch(updateUser({ ...user, status: 'active' }));
            });
            setSelectedIds([]);
        }
    };
    const handleBulkPromote = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Promote ${selectedIds.length} users to Admin?`)) {
            filteredUsers.filter(u => selectedIds.includes(u.id)).forEach(user => {
                if (user.role !== 'Admin') dispatch(updateUser({ ...user, role: 'Admin' }));
            });
            setSelectedIds([]);
        }
    };
    const handleBulkDemote = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Demote ${selectedIds.length} users to User?`)) {
            filteredUsers.filter(u => selectedIds.includes(u.id)).forEach(user => {
                if (user.role !== 'User') dispatch(updateUser({ ...user, role: 'User' }));
            });
            setSelectedIds([]);
        }
    };


    // Audit log state
    const [auditLog, setAuditLog] = useState([]);

    // Wrap dispatches to log actions
    const logAndDispatch = (action, logMsg) => {
        setAuditLog(prev => [{ msg: logMsg, time: new Date().toLocaleString() }, ...prev.slice(0, 19)]);
        dispatch(action);
    };

    return (
        <div className="scc-container">
            <LefNav />
            <div className="admin-main-content">
                <div className="scc-header">
                    <div className="scc-header-icon"><Users size={28} /></div>
                    <div>
                        <h2 className="scc-header-title">User Management</h2>
                        <div className="scc-header-desc">Manage all registered users, roles, and access. Premium features inspired by Amazon/Flipkart admin panels.</div>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="scc-bulk-bar">
                        <span>{selectedIds.length} selected</span>
                        <button className="scc-bulk-btn scc-bulk-delete" onClick={handleBulkDelete}>Delete</button>
                        <button className="scc-bulk-btn scc-bulk-block" onClick={handleBulkBlock}>Block</button>
                        <button className="scc-bulk-btn scc-bulk-unblock" onClick={handleBulkUnblock}>Unblock</button>
                        <button className="scc-bulk-btn scc-bulk-promote" onClick={handleBulkPromote}>Promote</button>
                        <button className="scc-bulk-btn scc-bulk-demote" onClick={handleBulkDemote}>Demote</button>
                        <button className="scc-bulk-btn scc-bulk-clear" onClick={() => setSelectedIds([])}>Clear</button>
                    </div>
                )}

                {/* Search & Filter Bar */}
                <div className="scc-toolbar">
                    <div className="scc-searchbar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, username..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="scc-search-input"
                        />
                    </div>
                    <div className="scc-filters">
                        <select
                            className="scc-filter-select"
                            value={filterRole}
                            onChange={e => setFilterRole(e.target.value)}
                            style={{ marginRight: 12 }}
                        >
                            <option value="all">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="User">User</option>
                            {/* Add more roles if needed */}
                        </select>
                        <select
                            className="scc-filter-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>

                {/* Premium Table */}
                <div className="luxe-table-wrap admin-user-table-responsive" style={{ marginTop: 24 }}>
                    <table className="luxe-table">
                        <thead>
                            <tr>
                                <th className="hide-mobile"><input type="checkbox" checked={allSelected} onChange={handleSelectAll} /></th>
                                <th>Full Name</th>
                                <th className="hide-mobile">Username</th>
                                <th>Email</th>
                                <th className="hide-mobile">Phone</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 32 }}>No users found.</td></tr>
                            )}
                            {paginatedUsers.map((row) => (
                                <tr key={row.id} className="admin-user-row-responsive">
                                  <td className="hide-mobile"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelectOne(row.id)} /></td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <div className="scc-avatar"><UserIcon size={16} /></div>
                                      <span style={{ fontWeight: 600 }}>{row.name}</span>
                                      {row.isPremium && <Star size={14} color="#D4AF37" title="Premium User" />}
                                      <div className="show-mobile" style={{ fontSize: 12, color: '#888' }}>{row.username}</div>
                                    </div>
                                    <div className="show-mobile" style={{ fontSize: 12, color: '#888' }}>{row.email}</div>
                                    <div className="show-mobile" style={{ fontSize: 12, color: '#888' }}>{row.phone}</div>
                                  </td>
                                  <td className="hide-mobile">{row.username}</td>
                                  <td className="hide-mobile">{row.email}</td>
                                  <td className="hide-mobile">{row.phone}</td>
                                  <td><RoleBadge role={row.role} /></td>
                                  <td><UserStatusToggle status={row.status || 'active'} onToggle={() => handleStatusToggle(row)} /></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      <motion.button whileTap={{ scale: 0.92 }} className="scc-action-btn scc-action-view" title="View Details" onClick={() => openUserModal(row)}><ArrowRight size={14} /></motion.button>
                                      {row.role === 'User' && (<motion.button whileTap={{ scale: 0.92 }} className="scc-action-btn scc-action-promote" title="Promote to Admin" onClick={() => { if(window.confirm(`Promote ${row.name} to Admin?`)) logAndDispatch(updateUser({ ...row, role: 'Admin' }), `Promoted ${row.email}`); }}><UserCheck size={14} /></motion.button>)}
                                      {row.role === 'Admin' && (<motion.button whileTap={{ scale: 0.92 }} className="scc-action-btn scc-action-demote" title="Demote to User" onClick={() => { if(window.confirm(`Demote ${row.name} to User?`)) logAndDispatch(updateUser({ ...row, role: 'User' }), `Demoted ${row.email}`); }}><UserX size={14} /></motion.button>)}
                                      <motion.button whileTap={{ scale: 0.92 }} className="scc-action-btn scc-action-delete" title="Delete User" onClick={() => { if(window.confirm("Permanent delete this user?")) logAndDispatch(deleteUser({ id: row.id }), `Deleted ${row.email}`); }}><Trash2 size={14} /></motion.button>
                                    </div>
                                  </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="scc-pagination" style={{ margin: '24px 0', display: 'flex', justifyContent: 'center', gap: 8 }}>
                        <button disabled={page === 1} onClick={() => setPage(page - 1)}>&lt;</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                className={page === i + 1 ? 'active' : ''}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>&gt;</button>
                    </div>
                )}

                {/* User Details Modal */}
                <UserDetailsModal user={selectedUser} open={modalOpen} onClose={closeUserModal} />
            </div>
        </div>
    );
}

export default AdminUsers;