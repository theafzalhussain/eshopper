const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// GET /img?src=/assets/productimages/abc.jpg&w=400&q=80
router.get('/', async (req, res) => {
    try {
        const src = String(req.query.src || '').trim();
        if (!src) return res.status(400).send('src parameter required');

        const width = Math.max(0, Number(req.query.w || 0));
        const quality = Math.min(100, Math.max(30, Number(req.query.q || 80)));
        const accept = String(req.headers.accept || '').toLowerCase();
        const wantWebp = accept.includes('image/webp');

        let inputBuffer = null;
        if (/^https?:\/\//i.test(src)) {
            const resp = await axios.get(src, { responseType: 'arraybuffer', timeout: 10000 });
            inputBuffer = Buffer.from(resp.data);
        } else {
            // Treat as local path under public or build assets
            const localPath = path.join(__dirname, '..', src.replace(/^\//, ''));
            if (!fs.existsSync(localPath)) return res.status(404).send('Image not found');
            inputBuffer = fs.readFileSync(localPath);
        }

        let transformer = sharp(inputBuffer, { animated: false });
        if (width > 0) transformer = transformer.resize({ width, withoutEnlargement: true });
        transformer = transformer.webp({ quality, effort: 6 });

        const output = await transformer.toBuffer();
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return res.send(output);
    } catch (err) {
        console.error('Image proxy error:', err && err.message ? err.message : err);
        return res.status(500).send('Image processing failed');
    }
});

module.exports = router;
