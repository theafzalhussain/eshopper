const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const SITE_URL = (process.env.FRONTEND_URL || 'https://eshopperr.me').replace(/\/$/, '');

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shop/All', changefreq: 'daily', priority: '0.9' },
  { path: '/shop/Men', changefreq: 'daily', priority: '0.8' },
  { path: '/shop/Women', changefreq: 'daily', priority: '0.8' },
  { path: '/shop/Kids', changefreq: 'daily', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/faq', changefreq: 'monthly', priority: '0.5' },
  { path: '/return-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date) {
  try {
    return new Date(date || Date.now()).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function urlEntry({ loc, lastmod, changefreq, priority, image }) {
  const parts = [
    '<url>',
    `<loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : '',
    changefreq ? `<changefreq>${changefreq}</changefreq>` : '',
    priority ? `<priority>${priority}</priority>` : '',
  ];
  if (image) {
    parts.push(
      '<image:image>',
      `<image:loc>${xmlEscape(image)}</image:loc>`,
      '</image:image>'
    );
  }
  parts.push('</url>');
  return parts.filter(Boolean).join('');
}

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const now = formatDate();
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${xmlEscape(`${SITE_URL}/sitemap-static.xml`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${xmlEscape(`${SITE_URL}/sitemap-products.xml`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(body);
  } catch (err) {
    res.status(500).send('<!-- sitemap error -->');
  }
});

router.get('/sitemap-static.xml', (_req, res) => {
  const now = formatDate();
  const urls = STATIC_PAGES.map((page) =>
    urlEntry({
      loc: `${SITE_URL}${page.path}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
    })
  ).join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.status(200).send(body);
});

router.get('/sitemap-products.xml', async (_req, res) => {
  try {
    const products = await Product.find({})
      .select('_id name pic1 updatedAt createdAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const urls = products
      .map((p) => {
        const id = p._id;
        if (!id) return '';
        let image = p.pic1 || '';
        if (image && !/^https?:\/\//i.test(image)) {
          image = image.startsWith('/') ? `${SITE_URL}${image}` : `${SITE_URL}/${image}`;
        }
        return urlEntry({
          loc: `${SITE_URL}/single-product/${id}`,
          lastmod: formatDate(p.updatedAt || p.createdAt),
          changefreq: 'weekly',
          priority: '0.7',
          image: image || undefined,
        });
      })
      .filter(Boolean)
      .join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=1800');
    res.status(200).send(body);
  } catch (err) {
    console.error('sitemap-products error:', err && err.message);
    res.status(500).send('<!-- product sitemap error -->');
  }
});

module.exports = router;
