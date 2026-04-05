import React, { useEffect, useState, useMemo, useCallback } from 'react'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import {
    Users, ShoppingBag, DollarSign, Package, ShieldCheck, Mail, Phone,
    Edit3, TrendingUp, TrendingDown, AlertTriangle, Activity,
    ArrowRight, RefreshCw, Zap, PlusCircle, ClipboardList, BarChart3
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSocket } from './socket'
import SystemControlCenter from './SystemControlCenter'
import PremiumCharts from './PremiumCharts'
import TopProducts from './TopProducts'
import RecentActivityFeed from './RecentActivityFeed'
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
        activeSessions: 0,
        activity: {
            recentOrders: [],
            recentUsers: [],
            lowStock: []
        }
    })
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isLive, setIsLive] = useState(true)
    const [systemHealth, setSystemHealth] = useState({ api: false, database: false })

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
                activeSessions: data.activeSessions || 0,
                activity: data.activity || {
                    recentOrders: [],
                    recentUsers: [],
                    lowStock: []
                }
            })
            setLastUpdated(new Date())
            setSystemHealth((prev) => ({ ...prev, api: true }))
            setIsLoading(false)
        } catch (error) {
            console.error('❌ Dashboard fetch error:', error)
            console.error('🔍 Check if backend server is running at:', BASE_URL)
            setSystemHealth((prev) => ({ ...prev, api: false }))
            setIsLoading(false)
        }
    }, [])

    const checkDatabaseHealth = useCallback(async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/admin/test-connection`)
            if (!response.ok) throw new Error('DB health check failed')
            const data = await response.json()
            const online = String(data?.mongoStatus || '').toLowerCase().includes('connect')
                || Boolean(data?.isConnected)
            setSystemHealth((prev) => ({ ...prev, database: online }))
        } catch (error) {
            setSystemHealth((prev) => ({ ...prev, database: false }))
        }
    }, [])

    useEffect(() => {
        dispatch(getUser())
        dispatch(getProduct())
        dispatch(getCheckout())
        dispatch(getContact())
        fetchDashboardData()
        checkDatabaseHealth()

        // Socket.io real-time updates
        const socket = getSocket('admin-dashboard')
        socket.on('connect', () => setIsLive(true))
        socket.on('disconnect', () => setIsLive(false))
        socket.on('dashboardUpdate', fetchDashboardData)
        socket.on('newOrder', fetchDashboardData)

        const interval = setInterval(fetchDashboardData, 30000)
        const healthInterval = setInterval(checkDatabaseHealth, 45000)

        return () => {
            socket.off('dashboardUpdate', fetchDashboardData)
            socket.off('newOrder', fetchDashboardData)
            clearInterval(interval)
            clearInterval(healthInterval)
        }
    }, [dispatch, fetchDashboardData, checkDatabaseHealth])

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

    const fallbackAnalytics = useMemo(() => {
        const safeProducts = Array.isArray(products) ? products : []
        const safeOrders = Array.isArray(orders) ? orders : []

        const productMap = new Map(
            safeProducts.map((product) => [String(product.id || product._id || ''), product])
        )

        const categoryTotals = new Map()
        const topProductsMap = new Map()

        const extractLines = (order) => {
            const candidates = [order?.products, order?.items, order?.orderItems]
            const lines = []
            candidates.forEach((list) => {
                if (!Array.isArray(list)) return
                list.forEach((line) => {
                    if (line && typeof line === 'object') lines.push(line)
                })
            })
            return lines
        }

        safeOrders.forEach((order) => {
            const lines = extractLines(order)
            lines.forEach((line) => {
                const rawQty = Number(line.qty ?? line.quantity ?? line.count ?? 1)
                const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1

                const productIdRaw = line.productid || line.productId || line.product?._id || line.product || line._id || line.id
                const productId = typeof productIdRaw === 'object'
                    ? String(productIdRaw._id || productIdRaw.id || '')
                    : String(productIdRaw || '')

                const productDoc = productMap.get(productId)

                const name = String(line.name || productDoc?.name || 'Product')
                const maincategory = String(line.maincategory || productDoc?.maincategory || 'Uncategorized')
                const brand = String(line.brand || productDoc?.brand || '')
                const pic1 = String(line.pic1 || line.pic || productDoc?.pic1 || '')

                const rawPrice = Number(line.finalprice ?? line.price ?? productDoc?.finalprice ?? productDoc?.baseprice ?? 0)
                const finalprice = Number.isFinite(rawPrice) ? rawPrice : 0

                const key = productId || name.toLowerCase()
                const previous = topProductsMap.get(key) || {
                    _id: productId || key,
                    name,
                    pic1,
                    maincategory,
                    brand,
                    finalprice,
                    totalSold: 0
                }

                previous.totalSold += qty
                if (!previous.pic1 && pic1) previous.pic1 = pic1
                if ((!previous.maincategory || previous.maincategory === 'Uncategorized') && maincategory) previous.maincategory = maincategory
                if (!previous.brand && brand) previous.brand = brand
                if ((!previous.finalprice || previous.finalprice <= 0) && finalprice > 0) previous.finalprice = finalprice

                topProductsMap.set(key, previous)
                categoryTotals.set(maincategory, (categoryTotals.get(maincategory) || 0) + qty)
            })
        })

        return {
            topProducts: Array.from(topProductsMap.values())
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 5),
            salesByCategory: Array.from(categoryTotals.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
        }
    }, [orders, products])

    const fallbackMonthlyData = useMemo(() => {
        const safeOrders = Array.isArray(orders) ? orders : []
        const now = new Date()

        const months = Array.from({ length: 12 }, (_, index) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
            return {
                year: monthDate.getFullYear(),
                month: monthDate.getMonth() + 1,
                key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
            }
        })

        const revenueByMonth = new Map(months.map((m) => [m.key, 0]))

        safeOrders.forEach((order) => {
            const rawDate = order?.orderDate || order?.createdAt || order?.updatedAt
            const amount = Number(order?.finalAmount || 0)
            if (!rawDate || !Number.isFinite(amount) || amount <= 0) return

            const dt = new Date(rawDate)
            if (Number.isNaN(dt.getTime())) return

            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
            if (!revenueByMonth.has(key)) return
            revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + amount)
        })

        return months.map((m) => {
            const revenue = Number(revenueByMonth.get(m.key) || 0)
            const target = revenue > 0 ? Math.round(revenue * 1.12) : 0
            return { month: m.key, revenue, target }
        })
    }, [orders])

    const isMeaningfulCategoryData = (list = []) => Array.isArray(list) && list.length > 0 && list.some((entry) => {
        const categoryName = String(entry?.name || entry?._id || '').trim().toLowerCase()
        return categoryName && categoryName !== 'uncategorized' && Number(entry?.value || 0) > 0
    })

    const isMeaningfulTopProducts = (list = []) => Array.isArray(list) && list.length > 0 && list.some((entry) => {
        const hasImage = Boolean(String(entry?.pic1 || '').trim())
        const categoryName = String(entry?.maincategory || '').trim().toLowerCase()
        const hasCategory = Boolean(categoryName && categoryName !== 'uncategorized')
        return hasImage || hasCategory
    })

    const resolvedSalesByCategory = isMeaningfulCategoryData(dashboardData.salesByCategory)
        ? dashboardData.salesByCategory
        : fallbackAnalytics.salesByCategory

    const resolvedTopProducts = isMeaningfulTopProducts(dashboardData.topProducts)
        ? dashboardData.topProducts
        : fallbackAnalytics.topProducts

    const resolvedMonthlyData = useMemo(() => {
        const apiMonthly = Array.isArray(dashboardData.monthlyData) ? dashboardData.monthlyData : []
        const fallbackMonthly = Array.isArray(fallbackMonthlyData) ? fallbackMonthlyData : []
        if (!apiMonthly.length) return fallbackMonthly

        const apiNonZeroCount = apiMonthly.filter((item) => Number(item?.revenue || 0) > 0).length
        if (apiNonZeroCount >= 2) return apiMonthly

        const fallbackMap = new Map(fallbackMonthly.map((item) => [String(item.month), item]))
        return apiMonthly.map((item) => {
            const key = String(item?.month || '')
            const fallbackItem = fallbackMap.get(key)
            const apiRevenue = Number(item?.revenue || 0)
            const fallbackRevenue = Number(fallbackItem?.revenue || 0)
            const revenue = apiRevenue > 0 ? apiRevenue : fallbackRevenue
            const target = revenue > 0 ? Math.round(revenue * 1.12) : Number(item?.target || fallbackItem?.target || 0)
            return {
                ...item,
                revenue,
                target
            }
        })
    }, [dashboardData.monthlyData, fallbackMonthlyData])

    const formattedMonthlyData = resolvedMonthlyData.map(item => ({
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
                            <div className="scc-header-actions">
                                <div className="scc-system-health-widget">
                                    <p className="scc-system-health-title">System Health</p>
                                    <div className="scc-health-row">
                                        <span className={`scc-health-dot ${systemHealth.api ? 'is-online' : 'is-offline'}`} />
                                        <span>API</span>
                                        <strong>{systemHealth.api ? 'Online' : 'Offline'}</strong>
                                    </div>
                                    <div className="scc-health-row">
                                        <span className={`scc-health-dot ${systemHealth.database ? 'is-online' : 'is-offline'}`} />
                                        <span>Database</span>
                                        <strong>{systemHealth.database ? 'Online' : 'Offline'}</strong>
                                    </div>
                                </div>
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

                        <motion.div
                            className="scc-quick-actions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                        >
                            <Link to="/admin-add-product" className="scc-quick-action-btn">
                                <PlusCircle size={16} />
                                <span>Add Product</span>
                            </Link>
                            <Link to="/admin-orders" className="scc-quick-action-btn">
                                <ClipboardList size={16} />
                                <span>View Orders</span>
                            </Link>
                            <Link to="/admin-home" className="scc-quick-action-btn scc-quick-action-btn--ghost">
                                <BarChart3 size={16} />
                                <span>Analytics</span>
                            </Link>
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
                                title="Total Orders"
                                value={metrics.totalOrders || metrics.newOrders || 0}
                                icon={Package}
                                percentChange={ordersChange.change}
                                trend={ordersChange.trend}
                                variant="orders"
                                progress={65}
                                reportLink="/admin-orders"
                                isLoading={isLoading}
                                subtitle="All orders in database"
                            />
                        </div>

                        {/* Charts Section */}
                        <PremiumCharts
                            monthlyData={formattedMonthlyData}
                            salesByCategory={resolvedSalesByCategory}
                        />

                        <RecentActivityFeed
                            orders={orders}
                            products={products}
                            lowStockCount={dashboardData.lowStockCount}
                            activityData={dashboardData.activity}
                            isConnected={Boolean(systemHealth.api && systemHealth.database)}
                        />

                        {/* Top Products Section */}
                        <TopProducts topProducts={resolvedTopProducts} />

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