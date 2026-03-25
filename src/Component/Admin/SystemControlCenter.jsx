import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Users,
  Activity,
  ArrowRight,
  RefreshCw,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { getSocket } from './socket';
import { BASE_URL } from '../../constants';
import './SystemControlCenter.css';

// Premium Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  percentChange,
  trend,
  variant,
  progress,
  reportLink,
  isLoading,
  subtitle
}) => {
  return (
    <motion.div
      className={`scc-card scc-card--${variant}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="scc-card-header">
        <div className="scc-card-icon">
          <Icon />
        </div>
        {percentChange !== undefined && (
          <motion.div
            className={`scc-badge scc-badge--${trend}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {trend === 'up' ? <TrendingUp /> : <TrendingDown />}
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
          {subtitle && (
            <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
          )}
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
          <ArrowRight />
        </Link>
      )}
    </motion.div>
  );
};

// Main System Control Center Component
export default function SystemControlCenter() {
  const [dashboardData, setDashboardData] = useState({
    metrics: null,
    monthlyData: [],
    salesByCategory: [],
    topProducts: [],
    lowStockCount: 0,
    activeSessions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);

  // Fetch dashboard data from API
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard-analytics`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      setDashboardData(prev => ({
        ...prev,
        metrics: data.metrics,
        monthlyData: data.monthlyData || [],
        salesByCategory: data.salesByCategory || [],
        topProducts: data.topProducts || [],
        lowStockCount: data.lowStockCount || 0,
        activeSessions: data.activeSessions || 0,
        previousMetrics: data.previousMetrics
      }));
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setIsLoading(false);
    }
  }, []);

  // Socket.io real-time updates
  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket('admin-dashboard');

    socket.on('connect', () => {
      setIsLive(true);
      console.log('Dashboard connected to real-time updates');
    });

    socket.on('disconnect', () => {
      setIsLive(false);
    });

    // Listen for dashboard updates
    socket.on('dashboardUpdate', (data) => {
      console.log('Real-time update received:', data);
      fetchDashboardData();
    });

    // Listen for new orders
    socket.on('newOrder', (orderData) => {
      console.log('New order received:', orderData);
      setDashboardData(prev => ({
        ...prev,
        metrics: prev.metrics ? {
          ...prev.metrics,
          totalRevenue: (prev.metrics.totalRevenue || 0) + (orderData.amount || 0),
          newOrders: (prev.metrics.newOrders || 0) + 1
        } : prev.metrics
      }));
      setLastUpdated(new Date());
    });

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      socket.off('dashboardUpdate');
      socket.off('newOrder');
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  // Calculate percentage changes
  const getPercentChange = (current, previous) => {
    if (!previous || previous === 0) return { change: 0, trend: 'up' };
    const change = ((current - previous) / previous) * 100;
    return { change, trend: change >= 0 ? 'up' : 'down' };
  };

  const metrics = dashboardData.metrics || {};
  const previousMetrics = dashboardData.previousMetrics || {};

  const revenueChange = getPercentChange(metrics.totalRevenue, previousMetrics.totalRevenue);
  const ordersChange = getPercentChange(metrics.newOrders, previousMetrics.newOrders);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="scc-container">
      {/* Header */}
      <motion.div
        className="scc-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="scc-header-icon">
          <ShieldCheck />
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
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--slate-text)'
            }}
          >
            <RefreshCw size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="scc-stats-grid">
        <AnimatePresence mode="wait">
          {/* Total Revenue Card */}
          <StatsCard
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

          {/* Low Stock Alert Card */}
          <StatsCard
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

          {/* Today's Active Sessions Card */}
          <StatsCard
            key="sessions"
            title="Active Sessions"
            value={dashboardData.activeSessions || metrics.newCustomers || 0}
            icon={Activity}
            variant="sessions"
            reportLink="/admin-user"
            isLoading={isLoading}
            subtitle="Users online today"
          />

          {/* New Orders Card */}
          <StatsCard
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

      {/* Last Updated */}
      {lastUpdated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            color: 'var(--slate-text)',
            fontSize: '0.75rem',
            marginTop: '1rem'
          }}
        >
          <Zap size={12} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Last synced: {lastUpdated.toLocaleTimeString()}
        </motion.div>
      )}
    </div>
  );
}
