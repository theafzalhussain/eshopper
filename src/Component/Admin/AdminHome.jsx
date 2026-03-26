import React, { useEffect, useState, useMemo, useCallback } from 'react'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import {
    Users, ShoppingBag, DollarSign, Package, ShieldCheck, Mail, Phone,
    Edit3, TrendingUp, TrendingDown, AlertTriangle, Activity,
    ArrowRight, RefreshCw, Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSocket } from './socket'
import SystemControlCenter from './SystemControlCenter'
import PremiumCharts from './PremiumCharts'
import TopProducts from './TopProducts'
import './SystemControlCenter.css'

// ActionCreators for live database connectivity
import { getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { getProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { getContact } from '../../Store/ActionCreaters/ContactActionCreators'
import { BASE_URL } from '../../constants'

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

    // Test database connection
    const testConnection = useCallback(async () => {
        try {
            console.log('🧪 Testing database connection...')
            const response = await fetch(`${BASE_URL}/api/admin/test-connection`)
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            const data = await response.json()
            console.log('✅ Test connection result:', data)
            alert(`Database Test Successful!\n\nUsers: ${data.counts.users}\nProducts: ${data.counts.products}\nOrders: ${data.counts.orders}\nMongo Status: ${data.mongoStatus}`)
        } catch (error) {
            console.error('❌ Test connection failed:', error)
            alert(`Database Test Failed!\n\nError: ${error.message}\n\nCheck console for details.`)
        }
    }, [])

    // Fetch dashboard analytics from API
    const fetchDashboardData = useCallback(async () => {
        try {
            console.log('🔄 Fetching dashboard data from:', `${BASE_URL}/api/admin/dashboard-analytics`)
            const response = await fetch(`${BASE_URL}/api/admin/dashboard-analytics`)
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            const data = await response.json()

            console.log('✅ Dashboard data received:', data)

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
            console.error('❌ Dashboard fetch error:', error)
            console.error('🔍 Check if backend server is running at:', BASE_URL)
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
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area with responsive margin */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-4">
                        {/* MAIN DASHBOARD */}
                        <div className="w-100">
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
                                    onClick={testConnection}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}
                                >
                                    Test DB
                                </motion.button>
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
                        </div>

                        {/* Charts Section */}
                        <PremiumCharts
                            monthlyData={formattedMonthlyData}
                            salesByCategory={dashboardData.salesByCategory}
                        />

                        {/* Top Products Section */}
                        <TopProducts />

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