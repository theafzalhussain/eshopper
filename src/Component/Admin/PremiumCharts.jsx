import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Calendar, RefreshCw } from 'lucide-react';
import { getSocket } from './socket';
import { BASE_URL } from '../../constants';
import './SystemControlCenter.css';

// Custom Tooltip for Line Chart
const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const revenuePoint = payload.find((entry) => entry?.dataKey === 'revenue' || entry?.name === 'Revenue');
    const targetPoint = payload.find((entry) => entry?.dataKey === 'target' || entry?.name === 'Target');
    const revenue = Number(revenuePoint?.value || 0);
    const target = Number(targetPoint?.value || 0);
    const variance = revenue - target;
    const achievement = target > 0 ? (revenue / target) * 100 : 0;
    const orderCount = Number(revenuePoint?.payload?.orderCount || 0);
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    return (
      <div style={{
        background: 'rgba(8, 18, 28, 0.96)',
        border: '1px solid rgba(45, 212, 191, 0.25)',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 18px 34px rgba(2, 8, 23, 0.45)',
        minWidth: '220px'
      }}>
        <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.9rem', margin: '4px 0', fontWeight: 600 }}>
            {entry.name}: ₹{entry.value?.toLocaleString('en-IN')}
          </p>
        ))}
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: '8px' }}>
          <p style={{ color: variance >= 0 ? '#10B981' : '#F87171', fontSize: '0.78rem', margin: '2px 0' }}>
            Gap vs Target: {variance >= 0 ? '+' : '-'}₹{Math.abs(variance).toLocaleString('en-IN')}
          </p>
          <p style={{ color: '#2DD4BF', fontSize: '0.78rem', margin: '2px 0' }}>
            Achievement: {achievement.toFixed(1)}%
          </p>
          {orderCount > 0 && (
            <p style={{ color: '#67E8F9', fontSize: '0.78rem', margin: '2px 0' }}>
              Orders: {orderCount} • Avg AOV: ₹{Math.round(avgOrderValue).toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(8, 18, 28, 0.96)',
        border: '1px solid rgba(13, 148, 136, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
          {payload[0].name}
        </p>
        <p style={{ color: '#0D9488', fontSize: '0.8rem', marginTop: '4px' }}>
          {payload[0].value} orders ({(payload[0].percent * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

// Premium Color Palette for Pie Chart
const CHART_COLORS = [
  '#0D9488', // Teal
  '#D4AF37', // Gold
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export default function PremiumCharts({ monthlyData = [], salesByCategory = [] }) {
  const [chartData, setChartData] = useState({
    monthly: monthlyData,
    category: salesByCategory
  });
  const [period, setPeriod] = useState('12M');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard-analytics`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      setChartData({
        monthly: data.monthlyData || [],
        category: data.salesByCategory || []
      });
    } catch (error) {
      console.error('Chart data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!monthlyData.length && !salesByCategory.length) {
      fetchChartData();
    } else {
      setChartData({
        monthly: monthlyData,
        category: salesByCategory
      });
    }

    const socket = getSocket('admin-dashboard');
    socket.on('dashboardUpdate', fetchChartData);

    return () => {
      socket.off('dashboardUpdate', fetchChartData);
    };
  }, [monthlyData, salesByCategory, fetchChartData]);

  // Format month labels
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[parseInt(parts[1]) - 1] || monthStr;
    }
    return monthStr;
  };

  // Prepare data with formatted labels
  const formattedMonthlyData = chartData.monthly.map(item => ({
    ...item,
    monthLabel: formatMonth(item.month)
  }));

  const periodMonthlyData = useMemo(() => {
    const source = Array.isArray(formattedMonthlyData) ? formattedMonthlyData : [];
    if (period === '6M') {
      return source.slice(-6);
    }

    if (period === 'YTD') {
      const currentYear = new Date().getFullYear();
      const ytd = source.filter((item) => String(item?.month || '').startsWith(`${currentYear}-`));
      return ytd.length ? ytd : source.slice(-6);
    }

    return source;
  }, [formattedMonthlyData, period]);

  const monthlyInsights = useMemo(() => {
    const list = Array.isArray(periodMonthlyData) ? periodMonthlyData : [];
    const totalRevenue = list.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
    const totalTarget = list.reduce((sum, item) => sum + Number(item?.target || 0), 0);
    const totalOrders = list.reduce((sum, item) => sum + Number(item?.orderCount || 0), 0);
    const nonZero = list.filter((item) => Number(item?.revenue || 0) > 0);

    const peak = list.reduce((best, item) => (Number(item?.revenue || 0) > Number(best?.revenue || 0) ? item : best), list[0] || null);
    const low = list.reduce((worst, item) => (Number(item?.revenue || 0) < Number(worst?.revenue || 0) ? item : worst), list[0] || null);

    return {
      totalRevenue,
      totalTarget,
      totalOrders,
      avgMonthlyRevenue: list.length ? Math.round(totalRevenue / list.length) : 0,
      achievement: totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0,
      activeMonths: nonZero.length,
      peak,
      low
    };
  }, [periodMonthlyData]);

  const categoryInsights = useMemo(() => {
    const source = Array.isArray(chartData.category) ? chartData.category : [];
    const normalized = source
      .map((item) => {
        const name = String(item?.name || item?._id || 'Unknown').trim() || 'Unknown';
        const valueRaw = Number(item?.value || 0);
        const value = Number.isFinite(valueRaw) && valueRaw > 0 ? valueRaw : 0;
        return { ...item, name, value };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = normalized.reduce((sum, item) => sum + item.value, 0);
    const dominant = normalized[0] || null;
    const dominantShare = total > 0 && dominant ? (dominant.value / total) * 100 : 0;
    const topThreeUnits = normalized.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
    const concentration = total > 0 ? (topThreeUnits / total) * 100 : 0;

    return {
      list: normalized,
      total,
      categoryCount: normalized.length,
      dominant,
      dominantShare,
      concentration
    };
  }, [chartData.category]);

  // Custom Legend
  const renderCustomLegend = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3B82F6' }} />
        <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Revenue</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#14B8A6', opacity: 0.7 }} />
        <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Target</span>
      </div>
    </div>
  );

  return (
    <div className="scc-charts-grid">
      {/* Sales Revenue Trend - Line/Area Chart */}
      <motion.div
        className="scc-chart-card"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="scc-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} color="#fff" />
            </div>
            <h2 className="scc-chart-title">Sales Revenue Trend</h2>
          </div>
          <div className="scc-chart-tools">
            <div className="scc-chart-period">
              {['6M', '12M', 'YTD'].map(p => (
                <button
                  key={p}
                  className={`scc-period-btn ${period === p ? 'scc-period-btn--active' : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--teal-primary)' }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={periodMonthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
              <YAxis
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#14B8A6"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#targetGradient)"
                name="Target"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                name="Revenue"
                dot={{ r: 3, fill: '#3B82F6', strokeWidth: 2, stroke: '#1E293B' }}
                activeDot={{ r: 7, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {renderCustomLegend()}

        <div style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px'
        }}>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>TOTAL REVENUE</div>
            <div style={{ color: '#FCD34D', fontWeight: 700, marginTop: '4px' }}>₹{Math.round(monthlyInsights.totalRevenue || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>ACHIEVEMENT</div>
            <div style={{ color: '#22d3ee', fontWeight: 700, marginTop: '4px' }}>{monthlyInsights.achievement.toFixed(1)}%</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>PEAK MONTH</div>
            <div style={{ color: '#10B981', fontWeight: 700, marginTop: '4px' }}>
              {monthlyInsights.peak?.monthLabel || monthlyInsights.peak?.month || 'N/A'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>₹{Math.round(monthlyInsights.peak?.revenue || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>AVG / MONTH</div>
            <div style={{ color: '#cbd5e1', fontWeight: 700, marginTop: '4px' }}>₹{Math.round(monthlyInsights.avgMonthlyRevenue || 0).toLocaleString('en-IN')}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Active Months: {monthlyInsights.activeMonths}</div>
          </div>
        </div>
      </motion.div>

      {/* Category Distribution - Pie Chart */}
      <motion.div
        className="scc-chart-card"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="scc-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0D9488, #0F766E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieIcon size={20} color="#fff" />
            </div>
            <h2 className="scc-chart-title">Category Distribution</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--slate-text)',
              fontSize: '0.75rem'
            }}>
              <Calendar size={14} />
              <span>This Month</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--teal-primary)' }} />
          </div>
        ) : categoryInsights.list.length > 0 ? (
          <div className="scc-pie-layout">
            <div className="scc-pie-canvas">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryInsights.list}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {categoryInsights.list.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="rgba(15, 23, 42, 0.8)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="scc-pie-legend">
              {categoryInsights.list.slice(0, 5).map((item, index) => {
                const share = categoryInsights.total > 0 ? (item.value / categoryInsights.total) * 100 : 0;
                return (
                <motion.div
                  key={item.name || item._id || index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: CHART_COLORS[index % CHART_COLORS.length]
                    }} />
                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>
                      {item.name || item._id || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ color: CHART_COLORS[index % CHART_COLORS.length], fontWeight: 600, fontSize: '0.8rem' }}>
                      {item.value}
                    </span>
                    <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              )})}
            </div>
          </div>
        ) : (
          <div style={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--slate-text)'
          }}>
            No category data available
          </div>
        )}

        <div style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px'
        }}>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>TOTAL UNITS</div>
            <div style={{ color: '#FCD34D', fontWeight: 700, marginTop: '4px' }}>{categoryInsights.total.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>DOMINANT CATEGORY</div>
            <div style={{ color: '#22d3ee', fontWeight: 700, marginTop: '4px' }}>
              {categoryInsights.dominant?.name || 'N/A'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{categoryInsights.dominantShare.toFixed(1)}% share</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>CATEGORY COUNT</div>
            <div style={{ color: '#10B981', fontWeight: 700, marginTop: '4px' }}>{categoryInsights.categoryCount}</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em' }}>TOP-3 CONCENTRATION</div>
            <div style={{ color: '#cbd5e1', fontWeight: 700, marginTop: '4px' }}>{categoryInsights.concentration.toFixed(1)}%</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
