import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Truck, CheckCircle2, XCircle, Clock, MapPin,
  RotateCcw, ShieldCheck, Banknote, ArrowRight, AlertCircle, Info
} from 'lucide-react'
import '../styles/ReturnProcessWizard.css'

/* ═══════════════════════════════════════════════════════════════
   RETURN PROCESS WIZARD
   Shows the current return status + progress steps to the user.
   Used inside OrderTracking when a return is in progress.
   ═══════════════════════════════════════════════════════════════ */

const RETURN_STEPS = [
  { key: 'REQUESTED', label: 'Return Requested', icon: RotateCcw, desc: 'Your return request has been submitted for review' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, desc: 'Admin has approved your return request' },
  { key: 'PICKED_UP', label: 'Pickup Scheduled', icon: MapPin, desc: 'Agent will collect your item soon' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck, desc: 'Item is on the way to our warehouse' },
  { key: 'RECEIVED', label: 'Received & Inspected', icon: Package, desc: 'Item received and quality check done' },
  { key: 'REFUND_COMPLETED', label: 'Refund Processed', icon: Banknote, desc: 'Refund has been credited to your account' }
]

const STATUS_COLORS = {
  REQUESTED: { bg: 'rgba(26,140,140,0.08)', border: 'rgba(26,140,140,0.3)', color: '#1A8C8C', label: 'Under Review' },
  APPROVED: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.3)', color: '#16A34A', label: 'Approved' },
  REJECTED: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)', color: '#DC2626', label: 'Rejected' },
  PICKED_UP: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', color: '#F59E0B', label: 'Picked Up' },
  IN_TRANSIT: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', color: '#3B82F6', label: 'In Transit' },
  RECEIVED: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', color: '#8B5CF6', label: 'Received' },
  INSPECTED: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', color: '#8B5CF6', label: 'Inspected' },
  REFUND_COMPLETED: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', color: '#10B981', label: 'Refund Done' },
  REFUND_FAILED: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)', color: '#DC2626', label: 'Refund Failed' }
}

const REASON_LABELS = {
  DEFECTIVE: 'Product Defective',
  NOT_AS_DESCRIBED: 'Not As Described',
  DAMAGED: 'Damaged in Shipping',
  WRONG_ITEM: 'Wrong Item Received',
  QUALITY_ISSUE: 'Quality Issue',
  SIZE_FIT: 'Size/Fit Issue',
  CHANGED_MIND: 'Changed Mind',
  OTHER: 'Other'
}

const CONDITION_LABELS = {
  UNOPENED: 'Unopened',
  OPENED_UNUSED: 'Opened but Unused',
  USED: 'Used',
  DAMAGED: 'Damaged',
  NOT_SPECIFIED: 'Not Specified'
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ReturnProcessWizard({ returnData, orderAmount }) {
  /* Hooks must run on every render, so they sit above the early return.
     Previously the `return null` below came first, which meant a render with
     return data ran two useMemo calls and a render without it ran none —
     React then throws "Rendered fewer hooks than expected" the moment a
     return flips between NOT_INITIATED and an active status. */
  const currentStatus = returnData?.status || 'REQUESTED'

  // Calculate which step index we're at
  const currentStepIndex = useMemo(() => {
    const idx = RETURN_STEPS.findIndex(s => s.key === currentStatus)
    return idx >= 0 ? idx : 0
  }, [currentStatus])

  // Timeline events
  const timelineEvents = useMemo(() => {
    const events = []
    if (!returnData) return events
    if (returnData.requestedAt) events.push({ label: 'Return Requested', date: returnData.requestedAt, icon: RotateCcw })
    if (returnData.approvedAt) events.push({ label: 'Return Approved', date: returnData.approvedAt, icon: CheckCircle2 })
    if (returnData.pickupDate) events.push({ label: 'Pickup Scheduled', date: returnData.pickupDate, icon: MapPin })
    if (returnData.deliveredBackDate) events.push({ label: 'Item Received at Warehouse', date: returnData.deliveredBackDate, icon: Package })
    return events
  }, [returnData])

  if (!returnData || returnData.status === 'NOT_INITIATED') return null

  const isRejected = currentStatus === 'REJECTED'
  const isRefundFailed = currentStatus === 'REFUND_FAILED'
  const isCompleted = currentStatus === 'REFUND_COMPLETED'

  const statusConfig = STATUS_COLORS[currentStatus] || STATUS_COLORS.REQUESTED

  return (
    <motion.div
      className="rpw-wrap"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Status Header */}
      <div className="rpw-header">
        <div className="rpw-header-left">
          <div className="rpw-badge" style={{ background: statusConfig.bg, border: `1px solid ${statusConfig.border}`, color: statusConfig.color }}>
            <RotateCcw size={12} />
            Return {statusConfig.label}
          </div>
          <h3 className="rpw-title">Return Progress</h3>
          <p className="rpw-subtitle">Track your return request status in real-time</p>
        </div>
        {returnData.returnTrackingId && (
          <div className="rpw-tracking-id">
            <span className="rpw-tracking-label">Return ID</span>
            <span className="rpw-tracking-value">{returnData.returnTrackingId}</span>
          </div>
        )}
      </div>

      {/* Rejected / Failed Banner */}
      {isRejected && (
        <div className="rpw-alert rpw-alert-error">
          <XCircle size={18} />
          <div>
            <strong>Return Rejected</strong>
            <p>{returnData.rejectionReason || 'Your return request was not approved. Please contact support for more details.'}</p>
          </div>
        </div>
      )}

      {isRefundFailed && (
        <div className="rpw-alert rpw-alert-error">
          <AlertCircle size={18} />
          <div>
            <strong>Refund Processing Failed</strong>
            <p>There was an issue processing your refund. Our team is looking into it and will resolve within 24-48 hours.</p>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="rpw-alert rpw-alert-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Refund Completed!</strong>
            <p>₹{Number(returnData.returnRefundAmount || orderAmount || 0).toLocaleString('en-IN')} has been credited to your original payment method.</p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      {!isRejected && (
        <div className="rpw-steps">
          {RETURN_STEPS.map((step, idx) => {
            const StepIcon = step.icon
            const isActive = idx === currentStepIndex
            const isDone = idx < currentStepIndex || isCompleted
            const isPending = idx > currentStepIndex && !isCompleted

            let stepClass = 'rpw-step'
            if (isDone) stepClass += ' completed'
            else if (isActive) stepClass += ' current'
            else if (isPending) stepClass += ' pending'

            return (
              <div key={step.key} className={stepClass}>
                <div className="rpw-step-indicator">
                  <div className="rpw-step-dot">
                    {isDone ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
                  </div>
                  {idx < RETURN_STEPS.length - 1 && <div className="rpw-step-line" />}
                </div>
                <div className="rpw-step-info">
                  <span className="rpw-step-label">{step.label}</span>
                  <span className="rpw-step-desc">{step.desc}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Return Details */}
      <div className="rpw-details-grid">
        {/* Reason */}
        <div className="rpw-detail-card">
          <div className="rpw-detail-icon"><Info size={16} /></div>
          <div>
            <span className="rpw-detail-label">Return Reason</span>
            <span className="rpw-detail-value">{REASON_LABELS[returnData.reason] || returnData.reason || 'Not specified'}</span>
          </div>
        </div>

        {/* Condition */}
        <div className="rpw-detail-card">
          <div className="rpw-detail-icon"><ShieldCheck size={16} /></div>
          <div>
            <span className="rpw-detail-label">Item Condition</span>
            <span className="rpw-detail-value">{CONDITION_LABELS[returnData.condition] || returnData.condition || 'Not specified'}</span>
          </div>
        </div>

        {/* Pickup Agent */}
        {returnData.pickupAgent && (
          <div className="rpw-detail-card">
            <div className="rpw-detail-icon"><Truck size={16} /></div>
            <div>
              <span className="rpw-detail-label">Pickup Agent</span>
              <span className="rpw-detail-value">{returnData.pickupAgent}</span>
            </div>
          </div>
        )}

        {/* Refund Amount */}
        {(returnData.returnRefundAmount > 0 || isCompleted) && (
          <div className="rpw-detail-card">
            <div className="rpw-detail-icon"><Banknote size={16} /></div>
            <div>
              <span className="rpw-detail-label">Refund Amount</span>
              <span className="rpw-detail-value rpw-detail-amount">₹{Number(returnData.returnRefundAmount || orderAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {returnData.description && (
        <div className="rpw-description">
          <span className="rpw-detail-label">Additional Details</span>
          <p>{returnData.description}</p>
        </div>
      )}

      {/* Timeline */}
      {timelineEvents.length > 0 && (
        <div className="rpw-timeline">
          <span className="rpw-timeline-title">Activity Timeline</span>
          {timelineEvents.map((evt, i) => {
            const EvtIcon = evt.icon
            return (
              <div key={i} className="rpw-timeline-item">
                <div className="rpw-timeline-dot"><EvtIcon size={12} /></div>
                <div className="rpw-timeline-content">
                  <span className="rpw-timeline-label">{evt.label}</span>
                  <span className="rpw-timeline-date">{formatDateTime(evt.date)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Note */}
      {!isCompleted && !isRejected && !isRefundFailed && (
        <div className="rpw-info-note">
          <Clock size={14} />
          <span>
            {currentStatus === 'REQUESTED' && 'Your return request is being reviewed. You will be notified once approved.'}
            {currentStatus === 'APPROVED' && 'Return approved! Pickup will be scheduled within 1-2 business days.'}
            {currentStatus === 'PICKED_UP' && 'Agent has picked up the item. It will reach our warehouse soon.'}
            {currentStatus === 'IN_TRANSIT' && 'Your item is on the way to our quality check center.'}
            {currentStatus === 'RECEIVED' && 'Item received! Refund will be processed within 24 hours.'}
            {currentStatus === 'INSPECTED' && 'Quality check completed. Refund processing will begin shortly.'}
          </span>
        </div>
      )}
    </motion.div>
  )
}
