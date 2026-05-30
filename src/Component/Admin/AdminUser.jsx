import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteUser, getUser } from '../../Store/ActionCreaters/UserActionCreators';
import { motion } from 'framer-motion'
import { Trash2, Shield, User as UserIcon, Crown, Search, Mail, Phone as PhoneIcon, ChevronDown, ShieldCheck } from 'lucide-react'
import axios from 'axios'
import { BASE_URL } from '../../constants'
import { getAdminHeaders } from './adminAuth'
import './SystemControlCenter.css'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [membershipFilter, setMembershipFilter] = useState('All')
    const [searchTerm, setSearchTerm] = useState('')
    const [upgradingIds, setUpgradingIds] = useState([])

    const fetchAdminUsers = async () => {
        try {
            const timeCache = new Date().getTime();
            const resp = await axios.get(`${BASE_URL}/api/admin/users?t=${timeCache}`, { headers: getAdminHeaders() })
            if (resp.data && Array.isArray(resp.data.users)) {
                setUsers(resp.data.users)
            }
        } catch (error) {
            console.error('Failed to fetch admin users:', error)
        }
    }

    useEffect(() => { fetchAdminUsers() }, [])

    // Realtime: refresh users when backend emits relevant DB changes
    useEffect(() => {
        const handler = (e) => {
            try {
                const data = (e && e.detail) || {};
                const coll = (data.collection || '').toString().toLowerCase();
                if (!coll) return;
                if (['users', 'user', 'orders', 'order', 'checkout', 'checkouts'].includes(coll)) {
                    fetchAdminUsers();
                }
            } catch (err) { console.warn('Realtime admin user handler error', err && err.message); }
        };
        window.addEventListener('realtime:dbChange', handler);
        return () => window.removeEventListener('realtime:dbChange', handler);
    }, []);

    const filteredUsers = useMemo(() => {
        let result = users || []
        if (membershipFilter !== 'All') {
            result = result.filter((user) => String(user.membershipType || 'Silver') === membershipFilter)
        }
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase()
            result = result.filter(user => 
                (user.name && user.name.toLowerCase().includes(lowerQuery)) ||
                (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
                (user.phone && user.phone.includes(lowerQuery)) ||
                (user.username && user.username.toLowerCase().includes(lowerQuery))
            )
        }
        return result
    }, [users, membershipFilter, searchTerm])

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Permanently delete user ${userName}?`)) return;
        
        // Optimistically remove user from UI instantly
        setUsers(prev => prev.filter(u => u.id !== userId && u._id !== userId));

        try {
            await axios.delete(`${BASE_URL}/user/${userId}`, { headers: getAdminHeaders() });
            // Let the background refetch silently
            fetchAdminUsers();
        } catch (error) {
            console.error('Delete user failed:', error);
            alert(error?.response?.data?.message || 'Failed to delete user');
            // Revert state if failed
            fetchAdminUsers();
        }
    }

    const upgradeMembership = async (userId, membershipType) => {
        setUpgradingIds((prev) => [...prev, userId])

        // Optimistically update membership in UI instantly
        setUsers(prev => prev.map(u => (u.id === userId || u._id === userId) ? { ...u, membershipType } : u));

        try {
            const response = await axios.put(
                `${BASE_URL}/api/admin/users/${userId}/membership`,
                { membershipType },
                { headers: getAdminHeaders() }
            )
            // Log the response for debugging
            console.log('Membership update response:', response.data);
            // Let the background refetch silently so we get enriched details too
            fetchAdminUsers()
            window.dispatchEvent(new CustomEvent('membership-updated', {
                detail: { userId, membershipType }
            }))
            // Small delay to ensure state updates are processed
            setTimeout(() => {
                console.log('Membership update completed for user:', userId);
            }, 100)
        } catch (error) {
            console.error('Membership update failed:', error);
            alert(error?.response?.data?.message || 'Failed to update membership')
        } finally {
            setUpgradingIds((prev) => prev.filter((id) => id !== userId))
        }
    }

    const totalUsers = users.length;
    const eliteUsers = users.filter(u => u.membershipType === 'Elite').length;
    const goldUsers = users.filter(u => u.membershipType === 'Gold').length;
    const silverUsers = users.filter(u => String(u.membershipType || 'Silver') === 'Silver').length;

    return (
        <div className="lux-admin-users-page" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-4 py-4">
                    
                    {/* Luxury Header Banner */}
                    <motion.div 
                        className="lux-users-banner mb-4"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="lux-banner-content">
                            <div>
                                <div className="lux-eyebrow"><ShieldCheck size={14} className="mr-1"/> Directory</div>
                                <h1 className="lux-banner-title">Registered <span>Members</span></h1>
                                <p className="lux-banner-sub">Manage customer accounts, roles, and premium memberships.</p>
                            </div>
                            <div className="lux-banner-stats">
                                <div className="lux-stat-box">
                                    <span>Total Members</span>
                                    <strong>{totalUsers}</strong>
                                </div>
                                <div className="lux-stat-box lux-stat-silver">
                                    <span>Silver Tier</span>
                                    <strong>{silverUsers}</strong>
                                </div>
                                <div className="lux-stat-box lux-stat-gold">
                                    <span>Gold Tier</span>
                                    <strong>{goldUsers}</strong>
                                </div>
                                <div className="lux-stat-box lux-stat-gold">
                                    <span>Elite Tier</span>
                                    <strong>{eliteUsers}</strong>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="w-100">
                        <motion.div 
                            initial={{opacity:0, y:20}} 
                            animate={{opacity:1, y:0}} 
                            transition={{ delay: 0.2 }}
                            className="lux-users-card"
                        >
                            {/* Toolbar: Search & Filters */}
                            <div className="lux-toolbar">
                                <div className="lux-search-box">
                                    <Search size={16} className="lux-search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name, email, or phone..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <div className="lux-filter-group">
                                    {['All', 'Elite', 'Gold', 'Silver'].map((tier) => (
                                        <button
                                            key={tier}
                                            type="button"
                                            className={`lux-filter-btn ${membershipFilter === tier ? 'active' : ''}`}
                                            onClick={() => setMembershipFilter(tier)}
                                        >
                                            {tier === 'Elite' && <Crown size={12} className="mr-1 d-none d-sm-inline" />}
                                            {tier}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Responsive Table */}
                            <div className="lux-table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th className="hide-mobile">User ID</th>
                                            <th>Customer Details</th>
                                            <th className="hide-mobile">Contact</th>
                                            <th>Role</th>
                                            <th>Membership</th>
                                            <th className="text-center hide-mobile">Orders</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-5">
                                                    <div className="text-muted d-flex flex-column align-items-center">
                                                        <UserIcon size={32} className="mb-2 opacity-50" />
                                                        <span>No users found matching your criteria.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                        filteredUsers.map((row) => {
                                            const rowId = row.id || row._id
                                            const currentMembership = row.membershipType || 'Silver'
                                            
                                            // Dynamic Badge Styles
                                            let badgeClass = 'lux-badge-silver';
                                            if(currentMembership === 'Elite') badgeClass = 'lux-badge-elite';
                                            if(currentMembership === 'Gold') badgeClass = 'lux-badge-gold';

                                            return (
                                            <tr key={rowId} className="lux-table-row">
                                                <td className="lux-td-id hide-mobile">
                                                    {String(rowId).slice(-8)}
                                                </td>
                                                <td>
                                                    <div className="lux-user-profile">
                                                        <div className="lux-avatar">
                                                            {row.name ? row.name.charAt(0).toUpperCase() : <UserIcon size={16}/>}
                                                        </div>
                                                        <div className="lux-user-meta">
                                                            <strong className="lux-user-name">{row.name || 'Unknown'}</strong>
                                                            <span className="lux-user-username">@{row.username || 'user'}</span>
                                                            {/* Mobile Contact Sub-info */}
                                                            <div className="lux-user-mobile-contact d-md-none mt-1">
                                                                <div><Mail size={10}/> {row.email}</div>
                                                                {row.phone && <div><PhoneIcon size={10}/> {row.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hide-mobile lux-contact-col">
                                                    <div className="lux-contact-item"><Mail size={12}/> {row.email || 'N/A'}</div>
                                                    <div className="lux-contact-item"><PhoneIcon size={12}/> {row.phone || 'N/A'}</div>
                                                </td>
                                                <td>
                                                    <span className={`lux-role-badge ${row.role === 'Admin' ? 'role-admin' : 'role-user'}`}>
                                                        {row.role || 'User'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`lux-tier-badge ${badgeClass}`}>
                                                        {currentMembership === 'Elite' && <Crown size={12} className="mr-1" />}
                                                        {currentMembership}
                                                    </span>
                                                </td>
                                                <td className="text-center lux-td-orders hide-mobile">
                                                    <strong>{row.totalOrders || 0}</strong>
                                                </td>
                                                <td className="text-right">
                                                    <div className="lux-action-cell">
                                                        <div className="lux-select-wrapper">
                                                            <select
                                                                className="lux-tier-select"
                                                                value={currentMembership}
                                                                onChange={(e) => upgradeMembership(rowId, e.target.value)}
                                                                disabled={upgradingIds.includes(rowId)}
                                                            >
                                                                {['Silver', 'Gold', 'Elite'].map((tier) => (
                                                                    <option key={tier} value={tier}>{tier}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={12} className="lux-select-icon" />
                                                        </div>
                                                        
                                                        <button 
                                                            className="lux-btn-delete" 
                                                            onClick={() => handleDeleteUser(rowId, row.name)}
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            )
                                        })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            
            {/* Luxury Styles Embedded */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');

                .lux-admin-users-page {
                    font-family: 'Jost', sans-serif;
                }

                /* Banner */
                .lux-users-banner {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    border-radius: 24px;
                    padding: 32px 40px;
                    color: white;
                    box-shadow: 0 20px 40px rgba(15,23,42,0.12);
                    border: 1px solid rgba(212,175,55,0.2);
                }
                .lux-banner-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                .lux-eyebrow {
                    display: inline-flex; align-items: center;
                    font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
                    color: #D4AF37; font-weight: 600; margin-bottom: 8px;
                }
                .lux-banner-title {
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(24px, 3vw, 36px);
                    font-weight: 800;
                    color: #ffffff;
                    margin: 0 0 4px;
                }
                .lux-banner-title span { color: #D4AF37; }
                .lux-banner-sub { color: #94a3b8; margin: 0; font-size: 14px; }
                
                .lux-banner-stats { display: flex; gap: 16px; }
                .lux-stat-box {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    padding: 12px 20px;
                    display: flex; flex-direction: column;
                }
                .lux-stat-gold {
                    background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
                    border-color: rgba(212,175,55,0.3);
                }
                .lux-stat-box span { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
                .lux-stat-gold span { color: #D4AF37; }
                .lux-stat-box strong { font-size: 24px; font-weight: 700; color: #fff; line-height: 1.2; }
                .lux-stat-silver {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(226,232,240,0.18);
                }

                /* Main Card */
                .lux-users-card {
                    background: #fff;
                    border-radius: 24px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
                    border: 1px solid rgba(212,175,55,0.1);
                    overflow: hidden;
                }

                /* Toolbar */
                .lux-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                    padding: 24px;
                    border-bottom: 1px solid #f1f5f9;
                    background: #fafbfc;
                }
                .lux-search-box {
                    position: relative;
                    flex: 1;
                    min-width: 260px;
                    max-width: 400px;
                }
                .lux-search-icon {
                    position: absolute;
                    left: 14px; top: 50%; transform: translateY(-50%);
                    color: #94a3b8;
                }
                .lux-search-box input {
                    width: 100%;
                    padding: 10px 16px 10px 40px;
                    border-radius: 999px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    font-size: 13px;
                    transition: all 0.2s;
                    outline: none;
                }
                .lux-search-box input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
                
                .lux-filter-group {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 999px;
                    gap: 4px;
                }
                .lux-filter-btn {
                    border: none; background: transparent;
                    padding: 6px 16px; border-radius: 999px;
                    font-size: 12px; font-weight: 600; color: #64748b;
                    transition: all 0.2s; cursor: pointer;
                    display: inline-flex; align-items: center;
                }
                .lux-filter-btn:hover { color: #0f172a; }
                .lux-filter-btn.active { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

                /* Table */
                .lux-table-responsive {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .lux-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 800px;
                }
                .lux-table th {
                    background: #fff;
                    padding: 16px 24px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: left;
                }
                .lux-table td {
                    padding: 16px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                    font-size: 13px;
                }
                .lux-table-row:hover td { background: #fafbfc; }
                
                .lux-td-id { font-family: monospace; color: #94a3b8; font-size: 12px; }
                
                /* Profile Column */
                .lux-user-profile { display: flex; align-items: center; gap: 14px; }
                .lux-avatar {
                    width: 40px; height: 40px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
                    color: #b8860b;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 16px; flex-shrink: 0;
                }
                .lux-user-meta { display: flex; flex-direction: column; }
                .lux-user-name { color: #0f172a; font-size: 14px; font-weight: 600; }
                .lux-user-username { color: #94a3b8; font-size: 12px; }
                
                .lux-contact-item { display: flex; align-items: center; gap: 6px; color: #475569; margin-bottom: 4px; }
                .lux-contact-item:last-child { margin-bottom: 0; }

                /* Badges */
                .lux-role-badge {
                    display: inline-flex; padding: 4px 10px; border-radius: 6px;
                    font-size: 11px; font-weight: 700; text-transform: uppercase;
                }
                .role-admin { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
                .role-user { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                
                .lux-tier-badge {
                    display: inline-flex; align-items: center;
                    padding: 4px 12px; border-radius: 50px;
                    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                }
                .lux-badge-elite { background: linear-gradient(135deg, #D4AF37, #b8860b); color: #fff; box-shadow: 0 4px 10px rgba(212,175,55,0.2); }
                .lux-badge-gold { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; border: 1px solid #fcd34d; }
                .lux-badge-silver { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
                
                .lux-td-orders strong { color: #0f172a; font-size: 14px; }

                /* Actions */
                .lux-action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
                
                .lux-select-wrapper { position: relative; width: 120px; }
                .lux-tier-select {
                    width: 100%; appearance: none;
                    background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
                    padding: 8px 30px 8px 12px; font-size: 12px; font-weight: 600; color: #334155;
                    outline: none; cursor: pointer; transition: all 0.2s;
                }
                .lux-tier-select:focus { border-color: #D4AF37; }
                .lux-tier-select:disabled { opacity: 0.5; cursor: not-allowed; }
                .lux-select-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
                
                .lux-btn-delete {
                    width: 32px; height: 32px;
                    border-radius: 8px; border: 1px solid transparent;
                    background: #f8fafc; color: #94a3b8;
                    display: inline-flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.2s;
                }
                .lux-btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

                /* Mobile Overrides */
                @media (max-width: 768px) {
                    .hide-mobile { display: none !important; }
                    .lux-table { min-width: 100%; }
                    .lux-users-banner { padding: 24px; }
                    .lux-toolbar { flex-direction: column; align-items: stretch; }
                    .lux-search-box { max-width: 100%; }
                    .lux-filter-group { overflow-x: auto; white-space: nowrap; justify-content: flex-start; }
                }
            `}} />
        </div>
    )
}