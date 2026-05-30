const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getCacheValue, setCacheValue } = require('../utils/cache');
// GET /img?src=/assets/productimages/abc.jpg&w=400&q=80
router.get('/', async (req, res) => {
    try {
        const src = String(req.query.src || '').trim();
        if (!src) return res.status(400).send('src parameter required');

        const width = Math.max(0, Number(req.query.w || 0));
        const quality = Math.min(100, Math.max(30, Number(req.query.q || 80)));
        // Always output WebP from the proxy for better compression
        const wantWebp = true;

        let inputBuffer = null;
        if (/^https?:\/\//i.test(src)) {
            const resp = await axios.get(src, { responseType: 'arraybuffer', timeout: 30000 });
            inputBuffer = Buffer.from(resp.data);
        } else {
            // Treat as local path under public or build assets
            const localPath = path.join(__dirname, '..', src.replace(/^\//, ''));
            if (!fs.existsSync(localPath)) return res.status(404).send('Image not found');
            inputBuffer = fs.readFileSync(localPath);
        }

        const cacheKey = `__express__/img?src=${src}&w=${width}&q=${quality}&webp=${wantWebp}`;
        // Try cache first
        try {
            const cached = await getCacheValue(cacheKey);
            if (cached) {
                const buf = Buffer.from(cached, 'base64');
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('X-Cache', 'HIT');
                return res.send(buf);
            }
        } catch (err) {
            // ignore cache errors
            console.warn('Image cache read error:', err && err.message);
        }

        let transformer = sharp(inputBuffer, { animated: false });
        if (width > 0) transformer = transformer.resize({ width, withoutEnlargement: true });
        transformer = transformer.webp({ quality, effort: 6 });

        const output = await transformer.toBuffer();
        // store in cache as base64 for binary safety; TTL 30 days
        try {
            await setCacheValue(cacheKey, output.toString('base64'), 60 * 60 * 24 * 30);
        } catch (err) {
            console.warn('Image cache write error:', err && err.message);
        }
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.send(output);
    } catch (err) {
        const src = String(req.query.src || '').trim();
        if (/^https?:\/\//i.test(src)) {
            console.warn('Image proxy remote fetch failed, redirecting to origin:', err && err.message ? err.message : err);
            return res.redirect(302, src);
        }
        console.error('Image proxy error:', err && err.message ? err.message : err);
        return res.status(500).send('Image processing failed');
    }
});

module.exports = router;
