import React from 'react';

export default function DashboardActivity({ activity }) {
  if (!activity) return null;
  const { recentOrders = [], recentUsers = [], lowStock = [] } = activity;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      {/* Recent Orders */}
      <div className="glass p-6 rounded-xl shadow-gold">
        <h2 className="text-lg font-serif gold-accent mb-4">Recent Orders</h2>
        <ul className="divide-y divide-slate/40">
          {recentOrders.length === 0 && <li className="py-2 text-slate-400">No recent orders</li>}
          {recentOrders.map(order => (
            <li key={order.orderId} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-gold-600">#{order.orderId}</span>
              <span className="text-slate-300">{order.userName || 'N/A'}</span>
              <span className="text-xs text-slate-400">{new Date(order.updatedAt || order.createdAt).toLocaleString()}</span>
              <span className="text-xs rounded bg-gold/10 gold-accent px-2 py-1 ml-2">{order.orderStatus}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Recent Users & Low Inventory */}
      <div className="glass p-6 rounded-xl shadow-gold flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-serif gold-accent mb-2">New Users</h2>
          <ul className="divide-y divide-slate/40">
            {recentUsers.length === 0 && <li className="py-2 text-slate-400">No new users</li>}
            {recentUsers.map(user => (
              <li key={user._id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{user.name || user.email}</span>
                <span className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-serif gold-accent mb-2">Low Inventory</h2>
          <ul className="divide-y divide-slate/40">
            {lowStock.length === 0 && <li className="py-2 text-slate-400">No low stock products</li>}
            {lowStock.map(product => (
              <li key={product._id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{product.name}</span>
                <span className="text-xs text-slate-400">Stock: {product.stock}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
