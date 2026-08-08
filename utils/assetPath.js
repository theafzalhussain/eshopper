/**
 * Asset-request detection for the SPA fallback.
 *
 * The SPA fallback must return index.html for app routes only. If it also
 * answers asset requests, a stale browser tab asking for a chunk that this
 * build no longer has (/static/js/5361.<old-hash>.chunk.js) receives HTML,
 * and the browser fails with "SyntaxError: Unexpected token '<'" instead of
 * a recoverable 404.
 */
function isAssetRequest(pathname) {
    const p = String(pathname || '');
    if (p.startsWith('/static/')) return true;
    // /file.js, /manifest.json, /logo192.png, /sw.js ...
    return /\.[a-zA-Z0-9]{2,5}$/.test(p);
}

module.exports = { isAssetRequest };
