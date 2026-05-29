import { useRef } from 'react';
import { getSocket } from './socket';
import React, { useEffect, useState } from 'react';
import DashboardMetrics from './DashboardMetrics';
import DashboardCharts from './DashboardCharts';
import DashboardActivity from './DashboardActivity';
import DashboardTodo from './DashboardTodo';
import { getAdminHeaders } from './adminAuth';
import { BASE_URL } from '../../constants';


export default function AdminDashboardLive() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
          headers: getAdminHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDashboard();

    // Real-time updates via Socket.io
    socketRef.current = getSocket();
    socketRef.current.on('dashboardUpdate', fetchDashboard);

    // Fallback polling every 30s
    const interval = setInterval(fetchDashboard, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off('dashboardUpdate', fetchDashboard);
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <DashboardMetrics metrics={data.metrics} />
      <DashboardCharts
        monthlyData={data.monthlyData}
        salesByCategory={data.salesByCategory}
        salesBySize={data.salesBySize}
        availableSizes={data.availableSizes}
      />
      <DashboardActivity activity={data.activity} />
      <DashboardTodo todos={data.todos} />
    </div>
  );
}
