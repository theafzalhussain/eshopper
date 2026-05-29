import React from 'react'
import LefNav from './LefNav'
import AdminActivities from './AdminActivities'

export default function AdminActivityLog() {
  return (
    <div className="lux-admin-page" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <LefNav />
      <div className="admin-main-content">
        <div className="container-fluid px-lg-4 py-4">
          <AdminActivities />
        </div>
      </div>
    </div>
  )
}
