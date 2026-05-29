import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, CircleAlert, Loader2, RefreshCw, ShieldCheck, Sparkles, TestTube2, TimerReset } from 'lucide-react'
import LefNav from './LefNav'
import { BASE_URL } from '../../constants'
import { getAdminHeaders } from './adminAuth'

const CHECK_ITEMS = [
  {
    key: 'auth',
    title: 'Admin session',
    description: 'Confirms the browser has a usable admin token or legacy admin headers.'
  },
  {
    key: 'health',
    title: 'Database health',
    description: 'Calls the lightweight backend health endpoint used by the dashboard.'
  },
  {
    key: 'analytics',
    title: 'Dashboard analytics',
    description: 'Loads the live admin analytics payload to verify the dashboard still boots.'
  },
  {
    key: 'orders',
    title: 'Orders endpoint',
    description: 'Checks the admin orders list endpoint that powers lifecycle actions.'
  }
]

const DEPLOY_STEPS = [
  'Open the admin deploy checks page and confirm the session/auth check passes.',
  'Run the live checks once after the final build is deployed.',
  'Verify the dashboard analytics and orders endpoint both return data.',
  'Open the admin activity log and confirm fresh events are flowing in.',
  'Smoke test one user order screen to confirm cancel/return actions still render correctly.'
]

const makeStatus = (state, message = '') => ({ state, message })

export default function AdminDeployChecks() {
  const [running, setRunning] = useState(false)
  const [lastRunAt, setLastRunAt] = useState(null)
  const [results, setResults] = useState(() => CHECK_ITEMS.reduce((acc, item) => {
    acc[item.key] = makeStatus('idle', 'Not checked yet')
    return acc
  }, {}))

  const adminHeaders = useMemo(() => getAdminHeaders(), [])

  const setCheckResult = (key, state, message) => {
    setResults((prev) => ({
      ...prev,
      [key]: makeStatus(state, message)
    }))
  }

  const runChecks = useCallback(async () => {
    setRunning(true)
    try {
      const hasAdminHeader = Boolean(Object.keys(adminHeaders || {}).length)
      setCheckResult('auth', hasAdminHeader ? 'pass' : 'fail', hasAdminHeader ? 'Admin headers available' : 'No admin auth found in the browser session')

      const healthResp = await fetch(`${BASE_URL}/api/admin/test-connection`, { headers: adminHeaders })
      if (!healthResp.ok) throw new Error(`Health check failed with HTTP ${healthResp.status}`)
      const healthJson = await healthResp.json()
      setCheckResult('health', 'pass', `Mongo: ${healthJson?.mongoStatus || 'unknown'} | Users: ${healthJson?.counts?.users ?? 0} | Orders: ${healthJson?.counts?.orders ?? 0}`)

      const analyticsResp = await fetch(`${BASE_URL}/api/admin/dashboard-analytics`, { headers: adminHeaders })
      if (!analyticsResp.ok) throw new Error(`Dashboard analytics failed with HTTP ${analyticsResp.status}`)
      const analyticsJson = await analyticsResp.json()
      const metrics = analyticsJson?.metrics || {}
      setCheckResult('analytics', 'pass', `Revenue: ${Number(metrics.totalRevenue || 0).toLocaleString('en-IN')} | Orders: ${Number(metrics.totalOrders || 0).toLocaleString('en-IN')}`)

      const ordersResp = await fetch(`${BASE_URL}/api/admin/orders`, { headers: adminHeaders })
      if (!ordersResp.ok) throw new Error(`Orders endpoint failed with HTTP ${ordersResp.status}`)
      const ordersJson = await ordersResp.json()
      const ordersCount = Array.isArray(ordersJson?.orders) ? ordersJson.orders.length : 0
      setCheckResult('orders', 'pass', `Orders endpoint returned ${ordersCount} records`)

      setLastRunAt(new Date())
    } catch (error) {
      const message = error?.message || 'Sanity check failed'
      setCheckResult('health', 'fail', message)
      setCheckResult('analytics', 'fail', message)
      setCheckResult('orders', 'fail', message)
    } finally {
      setRunning(false)
    }
  }, [adminHeaders])

  useEffect(() => {
    runChecks()
  }, [])

  const summary = useMemo(() => {
    const values = CHECK_ITEMS.map((item) => results[item.key]?.state || 'idle')
    const passed = values.filter((value) => value === 'pass').length
    const failed = values.filter((value) => value === 'fail').length
    const pending = values.filter((value) => value === 'idle' || value === 'checking').length
    return { passed, failed, pending }
  }, [results])

  return (
    <div className="lux-admin-page" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <LefNav />
      <div className="admin-main-content">
        <div className="container-fluid px-lg-4 py-4">
          <motion.div
            className="lux-banner mb-4"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="lux-banner-content">
              <div>
                <div className="lux-eyebrow"><TestTube2 size={14} className="mr-1" /> Pre-Deploy</div>
                <h1 className="lux-banner-title">Production <span>Sanity Checks</span></h1>
                <p className="lux-banner-sub">Quick runtime checks for admin auth, dashboard analytics, orders endpoint and database health before shipping a release.</p>
              </div>
              <div className="lux-banner-stats">
                <div className="lux-stat-box">
                  <span>Passed</span>
                  <strong>{summary.passed}</strong>
                </div>
                <div className="lux-stat-box">
                  <span>Failed</span>
                  <strong>{summary.failed}</strong>
                </div>
                <div className="lux-stat-box">
                  <span>Pending</span>
                  <strong>{summary.pending}</strong>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="lux-card mb-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '1.05rem' }}>Release checklist</h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>A green run means the core admin paths are healthy enough for a deploy candidate.</p>
              </div>
              <button
                type="button"
                onClick={runChecks}
                disabled={running}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: running ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 24px rgba(15,118,110,0.12)'
                }}
              >
                {running ? <Loader2 size={16} className="ot-spin" /> : <RefreshCw size={16} />}
                {running ? 'Running checks...' : 'Run checks again'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {CHECK_ITEMS.map((item) => {
                const result = results[item.key] || makeStatus('idle', 'Not checked yet')
                const tone = result.state === 'pass' ? '#16a34a' : result.state === 'fail' ? '#dc2626' : '#9ca3af'
                const icon = result.state === 'pass' ? <CheckCircle2 size={16} /> : result.state === 'fail' ? <CircleAlert size={16} /> : <Sparkles size={16} />

                return (
                  <div
                    key={item.key}
                    style={{
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#111827', fontWeight: 800 }}>
                          <span style={{ color: tone }}>{icon}</span>
                          {item.title}
                        </div>
                        <div style={{ marginTop: 6, color: '#6b7280', fontSize: 13, lineHeight: 1.55 }}>{item.description}</div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: tone, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <TimerReset size={12} />
                        {result.state}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, color: '#374151', fontSize: 13, lineHeight: 1.55 }}>{result.message}</div>
                  </div>
                )
              })}
            </div>

            {lastRunAt && (
              <div style={{ marginTop: 14, color: '#6b7280', fontSize: 12 }}>
                Last run: {lastRunAt.toLocaleString('en-IN')}
              </div>
            )}
          </motion.div>

          <motion.div
            className="lux-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Sparkles size={18} color="#0f766e" />
              <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem' }}>Quick deploy checklist</h3>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: '#4b5563', lineHeight: 1.7, fontSize: 14 }}>
              {DEPLOY_STEPS.map((step) => (
                <li key={step} style={{ marginBottom: 6 }}>{step}</li>
              ))}
            </ol>
          </motion.div>

          <motion.div
            className="lux-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{ padding: '1.25rem', marginTop: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldCheck size={18} color="#0f766e" />
              <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem' }}>What this covers</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', lineHeight: 1.7, fontSize: 14 }}>
              <li>Admin auth headers or token presence in the browser session.</li>
              <li>Database health check used by the live dashboard widgets.</li>
              <li>Dashboard analytics payload that powers the admin home screen.</li>
              <li>Orders endpoint that supports order lifecycle management in the admin panel.</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
