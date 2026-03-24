import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 120000, target: 100000 },
  { month: 'Feb', revenue: 135000, target: 120000 },
  { month: 'Mar', revenue: 110000, target: 130000 },
  { month: 'Apr', revenue: 150000, target: 140000 },
  { month: 'May', revenue: 170000, target: 150000 },
  { month: 'Jun', revenue: 160000, target: 155000 },
  { month: 'Jul', revenue: 180000, target: 170000 },
  { month: 'Aug', revenue: 175000, target: 160000 },
  { month: 'Sep', revenue: 190000, target: 180000 },
  { month: 'Oct', revenue: 200000, target: 190000 },
  { month: 'Nov', revenue: 210000, target: 200000 },
  { month: 'Dec', revenue: 220000, target: 210000 },
];

const salesByCategory = [
  { name: 'Clothing', value: 540000 },
  { name: 'Accessories', value: 320000 },
  { name: 'Footwear', value: 210000 },
  { name: 'Beauty', value: 120000 },
];

const COLORS = ['#B8860B', '#FFD700', '#FFB347', '#F7C873'];

export default function DashboardCharts({ monthlyData = [], salesByCategory = [] }) {
  const COLORS = ['#B8860B', '#FFD700', '#FFB347', '#F7C873'];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Line Chart */}
      <div className="glass p-6 rounded-xl shadow-gold">
        <h2 className="text-xl font-serif gold-accent mb-4">Monthly Revenue vs Target</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23272F" />
            <XAxis dataKey="month" stroke="#B8860B" />
            <YAxis stroke="#B8860B" />
            <Tooltip contentStyle={{ background: '#23272F', border: '1px solid #B8860B', color: '#fff' }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#B8860B" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="target" stroke="#FFD700" strokeDasharray="5 5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Pie Chart */}
      <div className="glass p-6 rounded-xl shadow-gold">
        <h2 className="text-xl font-serif gold-accent mb-4">Sales by Category</h2>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={salesByCategory}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#B8860B"
              dataKey="value"
            >
              {salesByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#23272F', border: '1px solid #B8860B', color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
