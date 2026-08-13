/* ══════════════════════════════════════════════════════════
   AUTH ERROR CLASSIFICATION

   A customer closing the Google popup is not an application error, but
   logging it with console.error made Datadog RUM record it as one (RUM
   collects console errors), which is how "Google login: Auth sync failed"
   ended up on the error dashboard.

   Expected interruptions are warned about; anything else is a real error.
══════════════════════════════════════════════════════════ */

const EXPECTED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/user-cancelled',
  'auth/web-storage-unsupported',
  'auth/network-request-failed',
  'auth/timeout'
])

const EXPECTED_MESSAGES = [
  'popup closed',
  'popup-closed',
  'cancelled',
  'canceled',
  'network error',
  'Failed to fetch',
  'network-request-failed'
]

export const isExpectedAuthInterruption = (err) => {
  if (!err) return false
  if (EXPECTED_CODES.has(err.code)) return true
  const message = String(err.message || err || '')
  return EXPECTED_MESSAGES.some((m) => message.toLowerCase().includes(m.toLowerCase()))
}

/** Log at the right level so only genuine failures reach error tracking. */
export const logAuthFailure = (label, err) => {
  if (isExpectedAuthInterruption(err)) console.warn(`${label} (user/network interruption):`, err?.code || err?.message || err)
  else console.error(label, err)
}

export default logAuthFailure
