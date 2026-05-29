import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { BASE_URL } from '../../constants'
import { getAdminHeaders } from './adminAuth'
import { getSocket } from './socket'
import { Activity, Search, Filter, RefreshCw, Sparkles, User2, Clock3, BadgeCheck } from 'lucide-react'

const ACTION_OPTIONS = [
    { label: 'All actions', value: '' },
    { label: 'Login', value: 'logged in' },
    { label: 'Order', value: 'order' },
    { label: 'Cart', value: 'cart' },
    { label: 'Wishlist', value: 'wishlist' },
    { label: 'Profile', value: 'profile' },
    { label: 'Checkout', value: 'checkout' }
]

export default function AdminActivities() {
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [endpointMissing, setEndpointMissing] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [userFilter, setUserFilter] = useState('')

    const fetchActivities = useCallback(async ({ q = searchText, action = actionFilter, user = userFilter } = {}) => {
        try {
            setLoading(true)
            setEndpointMissing(false)
            const params = new URLSearchParams({ limit: '100' })
            if (q.trim()) params.set('q', q.trim())
            if (action.trim()) params.set('action', action.trim())
            if (user.trim()) params.set('userEmail', user.trim())

            const resp = await fetch(`${BASE_URL}/api/admin/activities?${params.toString()}`, { headers: getAdminHeaders() })
            if (resp.status === 404) {
                setEndpointMissing(true)
                setActivities([])
                return
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
            const data = await resp.json()
            setActivities(Array.isArray(data.activities) ? data.activities : [])
        } catch (err) {
            if (String(err?.message || '').includes('HTTP 404')) {
                setEndpointMissing(true)
                setActivities([])
            } else {
                console.error('Failed to fetch activities', err)
            }
        } finally {
            setLoading(false)
        }
    }, [actionFilter, searchText, userFilter])

    useEffect(() => {
        fetchActivities()
        const id = setInterval(fetchActivities, 30000)
        return () => clearInterval(id)
    }, [fetchActivities])

    useEffect(() => {
        const socket = getSocket('admin-dashboard')
        const onActivityLogged = () => fetchActivities()
        socket.on('activityLogged', onActivityLogged)
        return () => socket.off('activityLogged', onActivityLogged)
    }, [fetchActivities])

    const uniqueUsers = useMemo(() => {
        const seen = new Set()
        return activities
            .map((activity) => activity.userEmail || String(activity.userId || '').trim())
            .filter((user) => {
                const key = String(user || '').trim()
                if (!key || seen.has(key)) return false
                seen.add(key)
                return true
            })
    }, [activities])

    const filteredActivities = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        return activities.filter((activity) => {
            const blob = [activity.action, activity.userEmail, activity.userId, JSON.stringify(activity.meta || {})].join(' ').toLowerCase()
            const matchesSearch = !q || blob.includes(q)
            const matchesAction = !actionFilter || String(activity.action || '').toLowerCase().includes(actionFilter.toLowerCase())
            const matchesUser = !userFilter || String(activity.userEmail || activity.userId || '').toLowerCase().includes(userFilter.toLowerCase())
            return matchesSearch && matchesAction && matchesUser
        })
    }, [activities, actionFilter, searchText, userFilter])

    const handleRefresh = () => fetchActivities({ q: searchText, action: actionFilter, user: userFilter })

    const styles = {
        shell: {
            padding: '1rem 1rem 0.95rem',
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.12)',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.96) 100%)',
            boxShadow: '0 20px 60px rgba(2,6,23,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
        },
        topRow: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            marginBottom: 16
        },
        titleWrap: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap'
        },
        icon: {
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(14,116,144,0.22), rgba(212,175,55,0.16))',
            border: '1px solid rgba(212,175,55,0.18)',
            color: '#d4af37',
            boxShadow: '0 10px 30px rgba(212,175,55,0.08)'
        },
        title: {
            margin: 0,
            fontSize: '1.15rem',
            lineHeight: 1.15,
            color: '#f8fafc',
            letterSpacing: '-0.02em'
        },
        titleAccent: {
            display: 'inline-block',
            marginLeft: 8,
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#9dd6ff',
            border: '1px solid rgba(125,211,252,0.18)',
            background: 'rgba(14,165,233,0.08)'
        },
        subtitle: {
            margin: '6px 0 0',
            color: '#94a3b8',
            fontSize: 13,
            maxWidth: 560,
            lineHeight: 1.55
        },
        refreshBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, rgba(13,148,136,0.22), rgba(15,118,110,0.28))',
            color: '#d6fbff',
            border: '1px solid rgba(45,212,191,0.22)',
            borderRadius: 12,
            padding: '10px 14px',
            cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(13,148,136,0.12)'
        },
        filters: {
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr 0.8fr',
            gap: 10,
            marginBottom: 14
        },
        field: {
            width: '100%',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(15,23,42,0.82))',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: 12,
            padding: '11px 12px',
            color: '#fff',
            outline: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
        },
        list: {
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 2
        },
        item: {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 12,
            alignItems: 'start',
            padding: '12px 12px',
            borderRadius: 14,
            marginBottom: 10,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.7), rgba(15,23,42,0.55))',
            border: '1px solid rgba(148,163,184,0.08)',
            boxShadow: '0 8px 20px rgba(2,6,23,0.18)'
        },
        dot: (action) => ({
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: action?.toLowerCase?.().includes('order')
                ? 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.06))'
                : action?.toLowerCase?.().includes('cart')
                    ? 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(14,165,233,0.06))'
                    : action?.toLowerCase?.().includes('wishlist')
                        ? 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(244,114,182,0.06))'
                        : 'linear-gradient(135deg, rgba(45,212,191,0.18), rgba(45,212,191,0.06))',
            border: '1px solid rgba(255,255,255,0.06)',
            color: action?.toLowerCase?.().includes('order')
                ? '#d4af37'
                : action?.toLowerCase?.().includes('cart')
                    ? '#7dd3fc'
                    : action?.toLowerCase?.().includes('wishlist')
                        ? '#f9a8d4'
                        : '#5eead4'
        }),
        action: {
            color: '#f8fafc',
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 4,
            lineHeight: 1.3
        },
        meta: {
            color: '#94a3b8',
            fontSize: 12,
            lineHeight: 1.5,
            wordBreak: 'break-word'
        },
        time: {
            color: '#cbd5e1',
            fontSize: 11,
            whiteSpace: 'nowrap',
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(148,163,184,0.08)',
            border: '1px solid rgba(148,163,184,0.08)'
        },
        empty: {
            borderRadius: 16,
            border: '1px dashed rgba(148,163,184,0.18)',
            background: 'radial-gradient(circle at top, rgba(201,168,76,0.08), transparent 55%), rgba(15,23,42,0.55)',
            padding: '20px 18px',
            color: '#94a3b8',
            textAlign: 'center'
        }
    }

    return (
        <div className="scc-card mb-4 admin-activities-shell" style={styles.shell}>
            <div style={styles.topRow} className="admin-toprow">
                <div>
                    <div style={styles.titleWrap}>
                        <div style={styles.icon}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 style={styles.title}>
                                User Activity
                                <span style={styles.titleAccent}>Live Feed</span>
                            </h3>
                            <p style={styles.subtitle}>Recent user actions from database, surfaced with premium filters so admin can scan login, cart, wishlist, profile and order events fast.</p>
                        </div>
                    </div>
                    {endpointMissing && <p style={{ margin: '0 0 12px', color: '#f59e0b', fontSize: 12 }}>Activity endpoint is not available yet. Restart the backend server to enable this panel.</p>}
                </div>
                <button type="button" className="admin-refresh-btn" onClick={handleRefresh}>
                    <RefreshCw size={15} />
                    Refresh
                </button>
            </div>

            <div className="admin-filters">
                <div className="admin-field-wrap" style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 3 }} />
                    <input className="admin-field" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search action, user, order id..." />
                </div>
                <div className="admin-field-wrap" style={{ position: 'relative' }}>
                    <Filter size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 3 }} />
                    <select className="admin-field" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                        {ACTION_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                    </select>
                </div>
                <div className="admin-field-wrap" style={{ position: 'relative' }}>
                    <User2 size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 3 }} />
                    <select className="admin-field" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
                        <option value="">All users</option>
                        {uniqueUsers.map((user) => <option key={user} value={user}>{user}</option>)}
                    </select>
                </div>
            </div>

            {loading ? <div style={{ color: '#94A3B8' }}>Loading...</div> : (
                <div style={styles.list}>
                    {filteredActivities.length === 0 && (
                        <div style={styles.empty}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#d4af37', fontWeight: 700, marginBottom: 8 }}>
                                <Sparkles size={14} />
                                No activity logs yet
                            </div>
                            <div>As users login, add items to cart, update profile, checkout or place orders, their actions will appear here automatically.</div>
                        </div>
                    )}
                    {filteredActivities.map((act) => (
                        <div key={act._id} style={styles.item} className="activity-list-item">
                            <div style={styles.dot(act.action)}>
                                {String(act.action || '').toLowerCase().includes('order') ? <BadgeCheck size={16} /> : <Activity size={16} />}
                            </div>
                            <div>
                                <div style={styles.action}>{act.action}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                    <div style={{ color: '#cbd5e1', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <User2 size={12} />
                                        {act.userEmail || act.userId || 'Anonymous'}
                                    </div>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(148,163,184,0.6)' }} />
                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{act.ip || 'Unknown IP'}</div>
                                </div>
                                {act.meta && <div style={styles.meta}>{JSON.stringify(act.meta)}</div>}
                            </div>
                            <div style={styles.time}>
                                <Clock3 size={11} style={{ display: 'inline', marginRight: 5 }} />
                                {new Date(act.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
