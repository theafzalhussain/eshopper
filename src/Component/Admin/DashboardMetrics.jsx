import React from 'react';

const metrics = [
  {
    label: 'Total Revenue',
    value: '₹12,45,000',
    icon: '💰',
    accent: 'bg-gradient-to-r from-gold to-yellow-400',
  },
  {
    label: 'New Orders',
    value: '320',
    icon: '📦',
    accent: 'bg-gradient-to-r from-gold to-orange-400',
  },
  {
    label: 'New Customers',
    value: '87',
    icon: '👤',
    accent: 'bg-gradient-to-r from-gold to-green-400',
  },
  {
    label: 'Active Products',
    value: '1,240',
    icon: '🛍️',
    accent: 'bg-gradient-to-r from-gold to-pink-400',
  },
];

export default function DashboardMetrics({ metrics: live }) {
  const metrics = [
    {
      label: 'Total Revenue',
      value: live?.totalRevenue ? `₹${live.totalRevenue.toLocaleString()}` : '-',
      icon: '💰',
      accent: 'bg-gradient-to-r from-gold to-yellow-400',
    },
    {
      label: 'Total Orders',
      value: live?.totalOrders ?? live?.newOrders ?? '-',
      icon: '📦',
      accent: 'bg-gradient-to-r from-gold to-orange-400',
    },
    {
      label: 'New Customers',
      value: live?.newCustomers ?? '-',
      icon: '👤',
      accent: 'bg-gradient-to-r from-gold to-green-400',
    },
    {
      label: 'Active Products',
      value: live?.activeProducts ?? '-',
      icon: '🛍️',
      accent: 'bg-gradient-to-r from-gold to-pink-400',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="glass flex items-center gap-4 p-6 rounded-xl shadow-gold transition-transform hover:scale-[1.03] duration-300 transition-custom"
        >
          <div className={`w-14 h-14 flex items-center justify-center rounded-full text-2xl ${m.accent} shadow-gold`}>
            {m.icon}
          </div>
          <div>
            <div className="text-lg font-serif gold-accent mb-1">{m.label}</div>
            <div className="text-2xl font-bold font-sans tracking-wide">{m.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
