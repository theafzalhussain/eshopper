import React, { useEffect, useState, useMemo, useCallback } from 'react'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, ShoppingBag, DollarSign, Package, ShieldCheck, Mail, Phone,
    Edit3, ClipboardList, TrendingUp, TrendingDown, AlertTriangle, Activity,
    ArrowRight, RefreshCw, Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSocket } from './socket'
import DashboardCharts from './DashboardCharts'
import PremiumCharts from './PremiumCharts'
import TopProducts from './TopProducts'
import './SystemControlCenter.css'

// ActionCreators for live database connectivity
import { getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { getProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { getContact } from '../../Store/ActionCreaters/ContactActionCreators'

// Premium Stats Card Component
const PremiumStatsCard = ({
    title, value, icon: Icon, percentChange, trend, variant, progress, reportLink, isLoading, subtitle
}) => (
    <motion.div
        className={`scc-card scc-card--${variant}`}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
        <div className="scc-card-header">
            <div className="scc-card-icon">
                <Icon size={26} />
            </div>
            {percentChange !== undefined && (
                <motion.div
                    className={`scc-badge scc-badge--${trend}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                >
                    {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Math.abs(percentChange).toFixed(1)}%</span>
                </motion.div>
            )}
        </div>

        {isLoading ? (
            <div>
                <div className="scc-skeleton scc-skeleton-value" />
                <div className="scc-skeleton scc-skeleton-label" />
            </div>
        ) : (
            <>
                <motion.div
                    className="scc-card-value"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {value}
                </motion.div>
                <div className="scc-card-label">{title}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>{subtitle}</div>}
            </>
        )}

        {progress !== undefined && (
            <div className="scc-progress">
                <motion.div
                    className="scc-progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            </div>
        )}

        {reportLink && (
            <Link to={reportLink} className="scc-view-report">
                <span>View Report</span>
                <ArrowRight size={16} />
            </Link>
        )}
    </motion.div>
);

export default function AdminHome() {
    const dispatch = useDispatch()

    // Redux State
    const users = useSelector((state) => state.UserStateData) || []
    const products = useSelector((state) => state.ProductStateData) || []
    const orders = useSelector((state) => state.CheckoutStateData) || []

    const [admin, setAdmin] = useState({})
    const [dashboardData, setDashboardData] = useState({
        metrics: null,
        previousMetrics: null,
        monthlyData: [],
        salesByCategory: [],
        topProducts: [],
        lowStockCount: 0,
        activeSessions: 0
    })
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isLive, setIsLive] = useState(true)

    // Fetch dashboard analytics from API
    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/dashboard-analytics')
            if (!response.ok) throw new Error('Failed to fetch')
            const data = await response.json()

            setDashboardData({
                metrics: data.metrics,
                previousMetrics: data.previousMetrics,
                monthlyData: data.monthlyData || [],
                salesByCategory: data.salesByCategory || [],
                topProducts: data.topProducts || [],
                lowStockCount: data.lowStockCount || 0,
                activeSessions: data.activeSessions || 0
            })
            setLastUpdated(new Date())
            setIsLoading(false)
        } catch (error) {
            console.error('Dashboard fetch error:', error)
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        dispatch(getUser())
        dispatch(getProduct())
        dispatch(getCheckout())
        dispatch(getContact())
        fetchDashboardData()

        // Socket.io real-time updates
        const socket = getSocket('admin-dashboard')
        socket.on('connect', () => setIsLive(true))
        socket.on('disconnect', () => setIsLive(false))
        socket.on('dashboardUpdate', fetchDashboardData)
        socket.on('newOrder', fetchDashboardData)

        const interval = setInterval(fetchDashboardData, 30000)

        return () => {
            socket.off('dashboardUpdate', fetchDashboardData)
            socket.off('newOrder', fetchDashboardData)
            clearInterval(interval)
        }
    }, [dispatch, fetchDashboardData])

    useEffect(() => {
        const currentUserId = localStorage.getItem("userid")
        const currentAdmin = users.find((item) => (item.id || item._id) === currentUserId)
        if (currentAdmin) setAdmin(currentAdmin)
    }, [users])

    // Calculate percentage changes
    const getPercentChange = (current, previous) => {
        if (!previous || previous === 0) return { change: 0, trend: 'up' }
        const change = ((current - previous) / previous) * 100
        return { change, trend: change >= 0 ? 'up' : 'down' }
    }

    const metrics = dashboardData.metrics || {}
    const previousMetrics = dashboardData.previousMetrics || {}
    const revenueChange = getPercentChange(metrics.totalRevenue, previousMetrics.totalRevenue)
    const ordersChange = getPercentChange(metrics.newOrders, previousMetrics.newOrders)

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '₹0'
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
        return `₹${amount.toLocaleString('en-IN')}`
    }

    // Format month labels
    const formatMonth = (monthStr) => {
        if (!monthStr) return ''
        const parts = monthStr.split('-')
        if (parts.length === 2) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return months[parseInt(parts[1]) - 1] || monthStr
        }
        return monthStr
    }

    const formattedMonthlyData = dashboardData.monthlyData.map(item => ({
        ...item,
        monthLabel: formatMonth(item.month)
    }))

    return (
        <div className="scc-container" style={{ minHeight: "100vh" }}>
            <div className="container-fluid px-lg-4">
                <div className="row">
                    {/* LEFT MENU */}
                    <div className="col-lg-2 col-md-3 mb-4">
                        <LefNav />
                    </div>

                    {/* MAIN DASHBOARD */}
                    <div className="col-lg-10 col-md-9">
                        {/* Header */}
                        <motion.div
                            className="scc-header"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="scc-header-icon">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h1 className="scc-title">System Control Center</h1>
                                <p className="scc-subtitle">Enterprise Analytics Dashboard</p>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {isLive && (
                                    <div className="scc-live-indicator">
                                        <span className="scc-live-dot" />
                                        <span>LIVE</span>
                                    </div>
                                )}
                                <motion.button
                                    onClick={fetchDashboardData}
                                    whileHover={{ rotate: 180 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                >
                                    <RefreshCw size={20} />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Admin Profile Card - Compact */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="scc-card mb-4"
                            style={{ padding: '1.25rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <img
                                    src={admin.pic || "/assets/images/noimage.png"}
                                    style={{ width: 70, height: 70, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(212, 175, 55, 0.3)' }}
                                    alt="Admin"
                                />
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <h4 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>{admin.name || "Administrator"}</h4>
                                    <span style={{
                                        background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: '#fff',
                                        marginTop: '0.5rem',
                                        display: 'inline-block'
                                    }}>SUPER ADMIN</span>
                                </div>
                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ color: '#64748B', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                                        <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{admin.email || 'loading...'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#64748B', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</p>
                                        <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{admin.phone || '+91 000-0000'}</p>
                                    </div>
                                </div>
                                <Link
                                    to="/update-profile"
                                    style={{
                                        background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}
                                >
                                    <Edit3 size={14} style={{ marginRight: '0.5rem' }} />
                                    Edit Profile
                                </Link>
                            </div>
                        </motion.div>

                        {/* Premium Stats Grid */}
                        <div className="scc-stats-grid">
                            <AnimatePresence mode="wait">
                                <PremiumStatsCard
                                    key="revenue"
                                    title="Total Revenue"
                                    value={formatCurrency(metrics.totalRevenue)}
                                    icon={DollarSign}
                                    percentChange={revenueChange.change}
                                    trend={revenueChange.trend}
                                    variant="revenue"
                                    progress={75}
                                    reportLink="/admin-orders"
                                    isLoading={isLoading}
                                    subtitle="vs last month"
                                />
                                <PremiumStatsCard
                                    key="stock"
                                    title="Low Stock Alert"
                                    value={dashboardData.lowStockCount}
                                    icon={AlertTriangle}
                                    variant="stock"
                                    progress={(dashboardData.lowStockCount / 50) * 100}
                                    reportLink="/admin-product"
                                    isLoading={isLoading}
                                    subtitle="Products need restock"
                                />
                                <PremiumStatsCard
                                    key="sessions"
                                    title="Active Sessions"
                                    value={dashboardData.activeSessions || metrics.newCustomers || 0}
                                    icon={Activity}
                                    variant="sessions"
                                    reportLink="/admin-user"
                                    isLoading={isLoading}
                                    subtitle="Users online today"
                                />
                                <PremiumStatsCard
                                    key="orders"
                                    title="Today's Orders"
                                    value={metrics.newOrders || 0}
                                    icon={Package}
                                    percentChange={ordersChange.change}
                                    trend={ordersChange.trend}
                                    variant="orders"
                                    progress={65}
                                    reportLink="/admin-orders"
                                    isLoading={isLoading}
                                    subtitle="Orders placed today"
                                />
                            </AnimatePresence>
                        </div>

                        {/* Charts Section */}
                        <div className="scc-charts-grid">
                            {/* Revenue Trend Chart */}
                            <motion.div
                                className="scc-chart-card"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="scc-chart-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <BarChart3 size={20} color="#fff" />
                                        </div>
                                        <h2 className="scc-chart-title">Sales Revenue Trend</h2>
                                    </div>
                                </div>

                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={formattedMonthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                                        <XAxis dataKey="monthLabel" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                        <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="target" stroke="#0D9488" strokeWidth={2} strokeDasharray="5 5" fill="url(#targetGradient)" name="Target" />
                                        <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} fill="url(#revenueGradient)" name="Revenue" dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#1E293B' }} />
                                    </AreaChart>
                                </ResponsiveContainer>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D4AF37' }} />
                                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Revenue</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0D9488' }} />
                                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Target</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Category Distribution Pie Chart */}
                            <motion.div
                                className="scc-chart-card"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="scc-chart-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <PieIcon size={20} color="#fff" />
                                        </div>
                                        <h2 className="scc-chart-title">Category Distribution</h2>
                                    </div>
                                </div>

                                {dashboardData.salesByCategory.length > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <ResponsiveContainer width="55%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={dashboardData.salesByCategory}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={90}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    nameKey="_id"
                                                >
                                                    {dashboardData.salesByCategory.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(15, 23, 42, 0.8)" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '12px' }}
                                                    labelStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        <div style={{ width: '45%', paddingLeft: '0.5rem' }}>
                                            {dashboardData.salesByCategory.slice(0, 5).map((item, index) => (
                                                <motion.div
                                                    key={item._id || index}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + index * 0.1 }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '0.4rem 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                        <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>{item._id || 'Unknown'}</span>
                                                    </div>
                                                    <span style={{ color: CHART_COLORS[index % CHART_COLORS.length], fontWeight: 600, fontSize: '0.75rem' }}>{item.value}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                        No category data available
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Top 5 Products Section */}
                        <motion.div
                            className="scc-top-products"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="scc-chart-header" style={{ marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <TrendingUp size={20} color="#fff" />
                                    </div>
                                    <div>
                                        <h2 className="scc-chart-title">Top 5 Best Sellers</h2>
                                        <p style={{ color: '#64748B', fontSize: '0.7rem', margin: 0 }}>Most ordered products</p>
                                    </div>
                                </div>
                            </div>

                            {dashboardData.topProducts.length > 0 ? (
                                <div>
                                    {dashboardData.topProducts.map((product, index) => (
                                        <motion.div
                                            key={product._id || index}
                                            className="scc-product-item"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                            whileHover={{ scale: 1.01 }}
                                        >
                                            <div className={`scc-product-rank scc-product-rank--${index + 1}`}>
                                                {index + 1}
                                            </div>
                                            <img
                                                src={product.pic1 || '/assets/images/noimage.png'}
                                                alt={product.name}
                                                className="scc-product-img"
                                                onError={(e) => { e.target.src = '/assets/images/noimage.png' }}
                                            />
                                            <div className="scc-product-info">
                                                <div className="scc-product-name">
                                                    {product.name?.length > 25 ? product.name.slice(0, 25) + '...' : product.name}
                                                </div>
                                                <div className="scc-product-category">
                                                    {product.maincategory || 'Uncategorized'}
                                                </div>
                                            </div>
                                            <div className="scc-product-sales">
                                                <div className="scc-product-count">{product.totalSold || 0}</div>
                                                <div className="scc-product-label">Sold</div>
                                            </div>
                                            <div style={{ minWidth: '70px', textAlign: 'right' }}>
                                                <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.85rem' }}>
                                                    ₹{(product.finalprice || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                                    <ShoppingBag size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>No product data available</p>
                                </div>
                            )}

                            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center' }}>
                                <Link to="/admin-product" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                                    View All Products <ArrowRight size={14} />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Last Updated */}
                        {lastUpdated && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ textAlign: 'center', color: '#64748B', fontSize: '0.7rem', marginTop: '1.5rem', paddingBottom: '2rem' }}
                            >
                                <Zap size={12} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Last synced: {lastUpdated.toLocaleTimeString()}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
