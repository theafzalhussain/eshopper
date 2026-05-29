Summary of performance improvements added:

1) Server-side
- Enabled Brotli + gzip compression (`shrink-ray-current` + `compression`).
- Clustered workers using Node `cluster` (already present) and graceful restart handling.
- Static assets served with long cache headers for production (`app.use(express.static(...))`).
- Image optimization proxy added at `/img` (resizes + converts to WebP using `sharp`).
- Prometheus metrics endpoint added at `/metrics` (uses `prom-client`).

2) Caching
- In-memory helpers provide `cacheMiddleware`, `clearCache` and safe wrappers.
- Product APIs and other read endpoints use `cacheMiddleware` for short TTL caching.
- Cache invalidation added in product controller flows (`controllers/productController.js`).

3) Database
- Added useful MongoDB indexes in `models/Product.js` and `models/Order.js` for common queries.

4) Load Testing & Monitoring
- `scripts/k6-load-test.js` provides a simple k6 script to simulate traffic.
- `/metrics` exposes Prometheus metrics for scraping.

Deployment / Run Checklist

- Install new dependency and rebuild:

```powershell
npm install
npm run build
npm run server
```

- Set environment variables in production:
  - `NODE_ENV=production`
  - `PORT` (e.g., 5000)
  - `FRONTEND_URL` / `BRAND_SITE_URL`
  - `ADMIN_SECRET`, `MONGO_URI`, other secrets as before

- Recommended infra:
  - Put static `build/` behind a CDN (Cloudflare, Fastly, AWS CloudFront). Use origin caching and purge via cache keys when deploying.
  - Configure Prometheus to scrape `<your-host>/metrics`.
  - Run k6 load test from a separate machine: `k6 run scripts/k6-load-test.js --env BASE_URL=https://your.api`.

Next steps I can take for you (pick one):
- Run code-splitting audit and convert key routes/components to dynamic imports in `src/Component`.
- Add CDN rewrite/purge hooks in CI to invalidate caches on deploy.
- Add more cached endpoints (e.g., homepage, category pages) with safe invalidation.

If you want me to proceed, say which next step to implement.