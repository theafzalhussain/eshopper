/* ════════════════════════════════════════════════════════════════════
   CHUNK RECOVERY

   After a new deploy, an old app shell (cached index.html / main.js in
   the browser or a CDN) asks for a JS chunk hash that no longer exists
   on the host. Because the host rewrites unknown paths to index.html
   (SPA fallback), the browser receives HTML where JS was expected:

     GET /static/js/5361.c0264308.chunk.js  ->  <!doctype html>...
     Uncaught SyntaxError: Unexpected token '<'

   React.lazy() then rejects, the Suspense boundary throws, and with no
   error boundary above it the whole tree unmounts — a blank white page.

   This module detects that class of failure and reloads once (with a
   cache-busting query) so the browser picks up the current shell.
   Reloads are capped so a genuinely broken deploy cannot loop forever.
════════════════════════════════════════════════════════════════════ */

const RELOAD_TS_KEY = 'eshopper_chunk_reload_ts';
const RELOAD_COUNT_KEY = 'eshopper_chunk_reload_count';
const MAX_RELOADS = 2;
const COOLDOWN_MS = 15000;

const readMessage = (value) => String(
    value?.message ||
    value?.reason?.message ||
    value?.error?.message ||
    value ||
    ''
);

const readName = (value) => String(
    value?.name || value?.reason?.name || value?.error?.name || ''
);

/**
 * True when the value looks like a code-split chunk that failed to load,
 * including the "HTML served instead of JS" variant.
 */
export function isChunkLoadFailure(value) {
    const msg = readMessage(value);
    const name = readName(value);

    // A JSON.parse of an HTML error page is an API problem, not a chunk problem.
    if (/is not valid JSON/i.test(msg)) return false;

    return (
        name === 'ChunkLoadError' ||
        /ChunkLoadError/i.test(msg) ||
        /Loading chunk [\w-]+ failed/i.test(msg) ||
        /Loading CSS chunk [\w-]+ failed/i.test(msg) ||
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        // HTML app shell returned for a .js request
        /Unexpected token ['"`]?</.test(msg) ||
        /expected expression, got ['"`]?</i.test(msg) ||
        /Unexpected token ['"`]?doctype/i.test(msg)
    );
}

/** Reload attempts are exhausted — show the user a real error instead. */
export function chunkRecoveryExhausted() {
    try {
        return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || 0) >= MAX_RELOADS;
    } catch (_) {
        return false;
    }
}

/** Called once the app renders successfully, so the next deploy starts clean. */
export function resetChunkRecoveryState() {
    try {
        sessionStorage.removeItem(RELOAD_TS_KEY);
        sessionStorage.removeItem(RELOAD_COUNT_KEY);
    } catch (_) { /* ignore */ }
}

/**
 * Reload once with a cache-busting param. Returns true when a reload was
 * triggered, false when it was suppressed (cooldown or attempt cap).
 */
export function recoverFromChunkError(source) {
    let now = Date.now();
    try {
        const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || 0);
        const count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || 0);

        if (count >= MAX_RELOADS) {
            console.warn('[Eshopper] Chunk reload limit reached; keeping the page for diagnostics.', source);
            return false;
        }
        if (now - last < COOLDOWN_MS) return false;

        sessionStorage.setItem(RELOAD_TS_KEY, String(now));
        sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1));
    } catch (_) { /* sessionStorage blocked — still attempt one reload */ }

    console.warn('[Eshopper] Stale build detected (chunk load failed). Reloading once...', source);

    // Drop any Service Worker / CacheStorage copy of the stale shell first.
    clearStaleCaches().finally(() => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('_r', String(now));
            window.location.replace(url.toString());
        } catch (_) {
            window.location.reload();
        }
    });

    return true;
}

async function clearStaleCaches() {
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch (_) { /* ignore */ }
    try {
        if (navigator.serviceWorker?.getRegistrations) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch (_) { /* ignore */ }
}
