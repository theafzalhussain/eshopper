/* ══════════════════════════════════════════════════════════
   DEFERRED MONITORING
   Sentry (~80 kB) and Datadog RUM (~90 kB) used to sit in the
   initial bundle and run before first paint. They are now loaded
   only after the page is interactive, so they cost the user
   nothing on the critical path.

   Errors that happen before the SDKs arrive are buffered by
   index.js and replayed here, so nothing is lost.
══════════════════════════════════════════════════════════ */

const NOISE_PATTERNS = [
  'ResizeObserver loop',
  'Loading chunk',
  'ChunkLoadError',
  'Network Error',
  'AbortError',
  'Request timeout or abort',
  'google-analytics',
  'ERR_BLOCKED_BY_CLIENT',
  'recaptcha',
  'Failed to fetch dynamically imported module'
]

const isNoise = (message = '') => NOISE_PATTERNS.some((p) => String(message).includes(p))

let started = false

const initSentry = async (buffer = []) => {
  const Sentry = await import('@sentry/react')

  Sentry.init({
    dsn: 'https://9a338081afe9842d896054b81c3ce5f6@o4510951293976576.ingest.us.sentry.io/4510951305379840',
    /* 100% tracing on every session was pure overhead — sample instead */
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV || 'production',
    beforeSend(event) {
      const msg = String(event?.exception?.values?.[0]?.value || '')
      if (isNoise(msg)) return null
      return event
    }
  })

  /* replay anything that broke before Sentry was ready */
  buffer.forEach((item) => {
    try {
      if (!item || isNoise(item.message)) return
      if (item.error instanceof Error) Sentry.captureException(item.error)
      else if (item.message) Sentry.captureMessage(item.message)
    } catch { /* ignore */ }
  })

  return Sentry
}

const initDatadog = async () => {
  const { datadogRum } = await import('@datadog/browser-rum')

  datadogRum.init({
    applicationId: '3955c403-a66a-4cfe-a13b-6fbf7f629960',
    clientToken: 'pub4e55a313802bdb08c6394e6fb377ce8d',
    site: 'us5.datadoghq.com',
    service: 'eshopper-frontend',
    env: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    /* full sampling on every visitor was expensive and noisy */
    sessionSampleRate: 20,
    sessionReplaySampleRate: 5,
    trackResources: true,
    trackUserInteractions: true,
    /* long-task tracking itself adds observer overhead on low-end phones */
    trackLongTasks: false,
    defaultPrivacyLevel: 'mask-user-input'
  })
}

/* Runs after the page is loaded and the main thread is free. */
export const startMonitoring = (buffer = []) => {
  if (started) return
  started = true

  const run = () => {
    initSentry(buffer).catch(() => { /* monitoring must never break the app */ })
    initDatadog().catch(() => { /* ditto */ })
  }

  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 })
    } else {
      setTimeout(run, 2500)
    }
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
}

export default startMonitoring
