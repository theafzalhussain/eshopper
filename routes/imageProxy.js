const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { getCacheValue, setCacheValue } = require('../utils/cache');

/* GET /img?src=/assets/productimages/abc.jpg&w=400&q=80
 *
 * Product images no longer come through here: src/utils/cloudinaryHelper.js now
 * hands Cloudinary URLs straight to the browser, so the CDN serves them instead
 * of this process. The route stays for local /assets paths and any older client
 * still holding a proxied URL.
 *
 * Four defects were fixed while it was still in the hot path:
 *   1. the upstream fetch ran BEFORE the cache lookup, so a cache hit still paid
 *      a full Cloudinary round-trip and buffered the whole image
 *   2. fs.existsSync + fs.readFileSync blocked the event loop
 *   3. local paths were resolved against the project root, so "/assets/..."
 *      never existed and every local request 404'd
 *   4. any absolute URL was fetched server-side — an open SSRF relay into
 *      whatever the host can reach, including cloud metadata endpoints
 */

/* Hosts this proxy may fetch from. Anything else is refused, not relayed. */
const ALLOWED_REMOTE_HOSTS = new Set([
    'res.cloudinary.com',
    'images.unsplash.com',
    'media.istockphoto.com',
    'assets.myntassets.com'
]);

const isAllowedRemote = (src) => {
    let url;
    try { url = new URL(src); } catch (err) { return false; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return ALLOWED_REMOTE_HOSTS.has(url.hostname.toLowerCase());
};

const PROJECT_ROOT = path.join(__dirname, '..');
/* Local assets live under public/ in development and build/ after a frontend
   build. */
const LOCAL_ASSET_ROOTS = [
    path.join(PROJECT_ROOT, 'public'),
    path.join(PROJECT_ROOT, 'build'),
    PROJECT_ROOT
];

const resolveLocalAsset = async (src) => {
    const relative = src.replace(/^\//, '');

    for (const root of LOCAL_ASSET_ROOTS) {
        const candidate = path.join(root, relative);
        /* keep the resolved path inside the root — no ../../ escapes */
        if (!candidate.startsWith(root)) continue;
        try {
            return await fsp.readFile(candidate);
        } catch (err) { /* try the next root */ }
    }

    return null;
};

const sendImage = (res, buffer, cacheState) => {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (cacheState) res.setHeader('X-Cache', cacheState);
    return res.send(buffer);
};

router.get('/', async (req, res) => {
    const src = String(req.query.src || '').trim();

    try {
        if (!src) return res.status(400).send('src parameter required');

        const width = Math.max(0, Number(req.query.w || 0));
        const quality = Math.min(100, Math.max(30, Number(req.query.q || 80)));
        const isRemote = /^https?:\/\//i.test(src);

        if (isRemote && !isAllowedRemote(src)) {
            return res.status(400).send('src host not allowed');
        }

        /* Cache first. This lookup used to sit after the download. */
        const cacheKey = `__express__/img?src=${src}&w=${width}&q=${quality}&webp=true`;
        try {
            const cached = await getCacheValue(cacheKey);
            if (cached) return sendImage(res, Buffer.from(cached, 'base64'), 'HIT');
        } catch (err) {
            console.warn('Image cache read error:', err && err.message);
        }

        let inputBuffer = null;
        if (isRemote) {
            /* 30s was long enough for a slow upstream to pin a socket and a
               full-size buffer for half a minute. */
            const resp = await axios.get(src, { responseType: 'arraybuffer', timeout: 8000, maxContentLength: 25 * 1024 * 1024 });
            inputBuffer = Buffer.from(resp.data);
        } else {
            inputBuffer = await resolveLocalAsset(src);
            if (!inputBuffer) return res.status(404).send('Image not found');
        }

        let transformer = sharp(inputBuffer, { animated: false });
        if (width > 0) transformer = transformer.resize({ width, withoutEnlargement: true });
        /* effort 6 costs 3-5x the CPU of effort 4 for a few percent of size, and it
           runs on libuv's 4-thread pool — the same pool bcrypt and fs use, so image
           encoding was adding latency to logins. */
        transformer = transformer.webp({ quality, effort: 4 });

        const output = await transformer.toBuffer();

        /* Short TTL on purpose. This was 30 days of base64 (+33% over binary) in
           the same heap that serves requests; the browser/CDN headers above
           already carry the long-lived caching. */
        try {
            await setCacheValue(cacheKey, output.toString('base64'), 60 * 60 * 24);
        } catch (err) {
            console.warn('Image cache write error:', err && err.message);
        }

        return sendImage(res, output, 'MISS');
    } catch (err) {
        if (/^https?:\/\//i.test(src) && isAllowedRemote(src)) {
            console.warn('Image proxy remote fetch failed, redirecting to origin:', err && err.message ? err.message : err);
            return res.redirect(302, src);
        }
        console.error('Image proxy error:', err && err.message ? err.message : err);
        return res.status(500).send('Image processing failed');
    }
});

module.exports = router;
