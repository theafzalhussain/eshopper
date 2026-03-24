import React, { useState } from 'react';

import './admin-dashboard.css';
import AdminDashboardLive from './AdminDashboardLive';

const navLinks = [
  { name: 'Dashboard', icon: '🏠' },
  { name: 'Orders', icon: '📦' },
  { name: 'Products', icon: '🛍️' },
  { name: 'Users', icon: '👤' },
  { name: 'Analytics', icon: '📊' },
  { name: 'Settings', icon: '⚙️' },
];

export default function AdminDashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-charcoal to-slate">
      {/* Sidebar */}
      <aside className={`glass fixed z-30 inset-y-0 left-0 w-64 p-6 flex flex-col transition-transform duration-300 transition-custom lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>  
        <div className="flex items-center mb-10">
          <span className="text-2xl font-serif gold-accent font-bold tracking-wide">Boutique Luxe</span>
        </div>
        <nav className="flex-1">
          {navLinks.map(link => (
            <a key={link.name} href="#" className="flex items-center gap-3 py-3 px-4 rounded-xl text-lg font-medium hover:bg-slate/60 gold-accent transition-all transition-custom mb-2">
              <span>{link.icon}</span>
              <span>{link.name}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Hamburger for mobile */}
      <button
        className="lg:hidden fixed top-6 left-6 z-40 p-2 rounded-xl glass shadow-gold"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Open sidebar"
      >
        <svg width="28" height="28" fill="#B8860B" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="#B8860B" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-64 p-6 transition-all transition-custom">
        <div className="glass p-8 rounded-xl shadow-gold min-h-[80vh] animate-fadein">
          <AdminDashboardLive />
          {children}
        </div>
      </main>
    </div>
  );
}
