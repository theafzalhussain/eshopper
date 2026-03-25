import React, { useState, useEffect, useCallback } from 'react';
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
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.9rem', margin: '4px 0', fontWeight: 600 }}>
            {entry.name}: ₹{entry.value?.toLocaleString('en-IN')}
          </p>
        ))}
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
        background: 'rgba(15, 23, 42, 0.95)',
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

  // Custom Legend
  const renderCustomLegend = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D4AF37' }} />
        <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Revenue</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0D9488', opacity: 0.6 }} />
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

        {isLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--teal-primary)' }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
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
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#targetGradient)"
                name="Target"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                name="Revenue"
                dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#1E293B' }}
                activeDot={{ r: 8, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {renderCustomLegend()}
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

        {isLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--teal-primary)' }} />
          </div>
        ) : chartData.category.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.category}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="_id"
                  animationBegin={0}
                  animationDuration={1200}
                >
                  {chartData.category.map((entry, index) => (
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

            {/* Legend */}
            <div style={{ width: '40%', paddingLeft: '1rem' }}>
              {chartData.category.slice(0, 5).map((item, index) => (
                <motion.div
                  key={item._id || index}
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
                      {item._id || item.name || 'Unknown'}
                    </span>
                  </div>
                  <span style={{ color: CHART_COLORS[index % CHART_COLORS.length], fontWeight: 600, fontSize: '0.8rem' }}>
                    {item.value}
                  </span>
                </motion.div>
              ))}
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
      </motion.div>
    </div>
  );
}
