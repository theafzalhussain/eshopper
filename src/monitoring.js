/* ══════════════════════════════════════════════════════════
   DEFERRED MONITORING
   Sentry (~80 kB) and Datadog RUM (~90 kB) used to sit in the
   initial bundle and run before first paint. They are now loaded
   only after the page is interactive, so they cost the user
   nothing on the critical path.

   Errors that happen before the SDKs arrive are buffered by
   index.js and replayed here, so nothing is lost.

   Two rules keep the dashboards honest:
   1. Local development never reports. Dev-only crashes (HMR half
      states, half-finished refactors) used to land in Datadog as
      production errors — that is where "authUser is not defined"
      and "loadTranscript is not defined" came from.
   2. Errors with no frame from our own bundle are not ours. Browser
      extensions and in-app-webview injected scripts throw bare
      ReferenceErrors (e.g. "lang is not defined") that no line of
      this codebase can produce; they are dropped instead of counted.
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
  'Failed to fetch dynamically imported module',
  /* socket.io long-poll hiccup while the API cold-starts */
  'xhr poll error',
  'websocket error',
  /* cross-origin script error with no usable detail */
  'Script error.'
]

/* Frames that prove the throw came from outside our application code */
const FOREIGN_FRAME_PATTERNS = [
  'chrome-extension://',
  'moz-extension://',
  'safari-web-extension://',
  'safari-extension://',
  'extensions::',
  'webkit-masked-url'
]

/* Frames that prove the throw came from our own bundle */
const FIRST_PARTY_FRAME = /\/static\/js\/|eshopperr\.me|localhost:3000|127\.0\.0\.1:3000/

export const isNoise = (message = '') => {
  const text = String(message || '')
  return NOISE_PATTERNS.some((p) => text.includes(p))
}

export const isFirstPartyStack = (stack = '') => FIRST_PARTY_FRAME.test(String(stack || ''))

/**
 * True when the error clearly did not come from this app: an extension /
 * injected-script frame, or a bare "X is not defined" with no frame of ours.
 */
export const isThirdPartyError = (message = '', stack = '') => {
  const frames = String(stack || '')
  if (FOREIGN_FRAME_PATTERNS.some((p) => frames.includes(p))) return true
  if (/\bis not defined\b/.test(String(message || '')) && !isFirstPartyStack(frames)) return true
  return false
}

export const shouldReport = (message = '', stack = '') =>
  !isNoise(message) && !isThirdPartyError(message, stack)

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']

/** Local dev must never pollute production dashboards. */
export const monitoringEnabled = (hostname = (typeof window !== 'undefined' ? window.location.hostname : '')) => {
  if (process.env.REACT_APP_FORCE_MONITORING === 'true') return true
  const host = String(hostname || '')
  if (LOCAL_HOSTS.includes(host) || host.endsWith('.local')) return false
  return true
}

let started = false
let sentryRef = null
const pendingCaptures = []

/* Boundaries call this; it works whether or not Sentry has booted yet. */
const installCaptureBridge = () => {
  if (typeof window === 'undefined') return
  window.__eshopperCaptureError = (error, context) => {
    const message = String(error?.message || error || '')
    const stack = String(error?.stack || '')
    if (!shouldReport(message, stack)) return
    if (sentryRef) {
      sentryRef.captureException(error, context ? { extra: context } : undefined)
    } else if (pendingCaptures.length < 20) {
      pendingCaptures.push({ error, context })
    }
  }
}

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
      const exception = event?.exception?.values?.[0]
      const msg = String(exception?.value || '')
      const stack = (exception?.stacktrace?.frames || [])
        .map((f) => f?.filename || '')
        .join('\n')
      if (!shouldReport(msg, stack)) return null
      return event
    }
  })

  sentryRef = Sentry

  /* replay anything that broke before Sentry was ready */
  buffer.forEach((item) => {
    try {
      if (!item) return
      const stack = String(item.error?.stack || item.stack || '')
      if (!shouldReport(item.message, stack)) return
      if (item.error instanceof Error) Sentry.captureException(item.error)
      else if (item.message) Sentry.captureMessage(item.message)
    } catch { /* ignore */ }
  })

  pendingCaptures.splice(0).forEach(({ error, context }) => {
    try {
      Sentry.captureException(error, context ? { extra: context } : undefined)
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
    version: process.env.REACT_APP_VERSION || '1.0.0',
    /* At ~11 views/day, 20% sampling produced "not enough data" for
       CLS / INP / LCP. Full sampling on this traffic is still cheap. */
    sessionSampleRate: 100,
    sessionReplaySampleRate: 10,
    trackResources: true,
    trackUserInteractions: true,
    /* long-task tracking itself adds observer overhead on low-end phones */
    trackLongTasks: false,
    defaultPrivacyLevel: 'mask-user-input',
    beforeSend(event) {
      if (event?.type === 'error') {
        const message = String(event.error?.message || '')
        const stack = String(event.error?.stack || '')
        if (!shouldReport(message, stack)) return false
      }
      return true
    }
  })
}

/* Runs after the page is loaded and the main thread is free. */
export const startMonitoring = (buffer = []) => {
  if (started) return
  started = true

  installCaptureBridge()

  if (!monitoringEnabled()) {
    /* Keep the bridge (so boundaries still work) but stay silent. */
    return
  }

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
