# EShopper — Full-Stack E-Commerce Platform

A production-grade e-commerce web application built with React and Node.js, featuring payment processing, order management, a returns workflow, coupon engine, premium memberships, real-time notifications, and an admin analytics dashboard.

**🔗 Live Demo:** https://eshopperr.me

---
## 📖 Overview

eShopper is a complete online fashion retail platform covering the entire commercial lifecycle: catalogue discovery, cart and coupon pricing, Razorpay checkout, order fulfilment with delivery OTP verification, customer-initiated returns with automated refunds, and a membership tier system that rewards repeat buyers.

The repository is a single Node.js project that produces three runnable processes from one dependency tree — a Create React App single-page storefront (built through `react-app-rewired`), an Express REST API in `server.js`, and a BullMQ worker in `worker.js`. The frontend deploys to Vercel; the API deploys to Render through a GitHub Actions deploy hook.

What makes the codebase substantial is the operational depth rather than the CRUD surface: 16 Mongoose models, a Redis-backed cache with automatic in-memory fallback when the managed Redis quota is exhausted, server-derived Socket.IO identity so no client can join the admin room by claiming to, a `sharp`-powered WebP image proxy, cron-driven auto-refunds with idempotent refund jobs, Gemini-powered catalogue chat, and SEO plumbing that includes generated sitemaps plus a Vercel Edge middleware that injects per-route canonical tags and JSON-LD into the SPA shell before crawlers see it.

## ✨ Key Features

**Storefront & Discovery**

- Category-scoped shop pages (`/shop/:maincat`), product detail pages, and faceted search with pagination via `GET /product/search`
- Persistent cart and wishlist plus a save-for-later shelf, a virtualised product grid (`react-window`), lazy images, skeleton loaders, and route-level code splitting with chunk-load recovery after deploys
- Per-route SEO through `react-helmet-async` + JSON-LD, generated `sitemap.xml` / `sitemap-static.xml` / `sitemap-products.xml`, and a Vercel Edge middleware for crawler-visible canonicals

**Accounts & Authentication**

- Email + password signup gated by an emailed OTP (`OTPRecord` documents auto-expire after 5 minutes), bcrypt hashing with password history
- Optional two-factor login (`POST /api/login-2fa`) and account lockout for 15 minutes after 5 failed attempts
- Firebase sign-in (Google / phone) reconciled into MongoDB via `POST /api/auth-sync`, with Firebase Admin verifying ID tokens server-side
- Address book CRUD plus granular notification, privacy, security and communication preferences

**Cart, Coupons & Checkout**

- Server-computed order summary: subtotal, GST, shipping, gift wrap, protection fee, eco charge, payment fee and coupon discount are all persisted on the order
- Coupon engine supporting flat/percent value, `minCartValue`, `maxDiscount`, `perUserOnce`, `totalUsageCap`, `firstOrderOnly` and validity windows
- Pincode-based delivery estimate, delivery-speed and insurance options, per-item gift wrap
- Membership tiers (Silver / Gold / Elite) derived from lifetime order count, with a manual admin override flag

**Payments, Returns & Refunds**

- Razorpay order creation, client config endpoint, HMAC signature verification on capture, and a signature-validated webhook that reconciles refund events back onto the order
- Full status machine from *Order Placed* through *Delivered*, *Return Initiated* and *Refund Completed*, with a stored `statusHistory` timeline, delivery OTP verification and a delivery schedule payload (agent, rider phone, coordinates, ETA)
- Customer return requests inside a configurable window (default 7 days); admin approve / reject / pickup / in-transit transitions, then a 24-hour auto-refund once the return is marked received
- A cron job sweeps pending refunds every 5 minutes with manual trigger and retry endpoints; `RefundJob` records carry an idempotency key, attempt counter and last error so refunds are never double-issued
- Invoice PDFs generated with `jspdf` + `jspdf-autotable` including a QR code, downloadable per order and in bulk from the admin invoices view

**Admin, Notifications & Realtime**

- Admin JWT login plus a legacy `x-admin-secret` header path, both guarded by `middleware/verifyAdmin.js`
- Dashboard aggregations for revenue (cancelled orders excluded), day-over-day orders and new customers, order/payment status breakdown, low-stock and top products — cached in-process and in Redis with a configurable TTL
- CRUD screens for products, categories, subcategories, brands, coupons, users, contacts and newsletter subscribers, plus return management, activity log, refund reporting and a deploy-checks page
- Handlebars templates in `views/emails` for every order state (placed, confirmed, packed, shipped, out for delivery, delivered, failed) and OTP mail, sent over SMTP via Nodemailer or the Brevo API; optional WhatsApp notifications via an Evolution API instance
- Socket.IO rooms (`user:<id>`, `admin:dashboard`) with identity derived on the server, emitting `orderUpdate`, `statusUpdate`, `newOrder`, `dashboardUpdate`, `cart:updated`, `cart:summary-updated` and `orderRefundProcessed`
- Gemini-backed shopping assistant (`POST /api/chat`) with a cached knowledge endpoint, intent engine and catalogue search

**Reliability & Observability**

- Sentry on both client and server; Datadog RUM and Core Web Vitals loaded only after the page is interactive
- Helmet security headers, CORS allow-list with Vercel preview support, global (2000/15 min) and auth (10/15 min) rate limiters, gzip compression
- Redis cache with memory fallback, a Mongoose query-cache plugin, slow-query profiler, optional clustering, and a keep-alive pinger for cold-starting hosts
- `node:test` suites for models/utils/config, React Testing Library suites for chatbot, wishlist, sockets and toasts, plus a k6 load script and a memory-leak detector

**Accounts & Authentication**

- Email + password signup gated by an emailed OTP (`OTPRecord` documents auto-expire after 5 minutes), bcrypt hashing with password history
- Optional two-factor login (`POST /api/login-2fa`) and account lockout for 15 minutes after 5 failed attempts
- Firebase sign-in (Google / phone) reconciled into MongoDB via `POST /api/auth-sync`, with Firebase Admin verifying ID tokens server-side
- Address book CRUD plus granular notification, privacy, security and communication preferences

**Cart, Coupons & Checkout**

- Server-computed order summary: subtotal, GST, shipping, gift wrap, protection fee, eco charge, payment fee and coupon discount are all persisted on the order
- Coupon engine supporting flat/percent value, `minCartValue`, `maxDiscount`, `perUserOnce`, `totalUsageCap`, `firstOrderOnly` and validity windows
- Pincode-based delivery estimate, delivery-speed and insurance options, per-item gift wrap
- Membership tiers (Silver / Gold / Elite) derived from lifetime order count, with a manual admin override flag

**Payments, Returns & Refunds**

- Razorpay order creation, client config endpoint, HMAC signature verification on capture, and a signature-validated webhook that reconciles refund events back onto the order
- Full status machine from *Order Placed* through *Delivered*, *Return Initiated* and *Refund Completed*, with a stored `statusHistory` timeline, delivery OTP verification and a delivery schedule payload (agent, rider phone, coordinates, ETA)
- Customer return requests inside a configurable window (default 7 days); admin approve / reject / pickup / in-transit transitions, then a 24-hour auto-refund once the return is marked received
- A cron job sweeps pending refunds every 5 minutes with manual trigger and retry endpoints; `RefundJob` records carry an idempotency key, attempt counter and last error so refunds are never double-issued
- Invoice PDFs generated with `jspdf` + `jspdf-autotable` including a QR code, downloadable per order and in bulk from the admin invoices view

**Admin, Notifications & Realtime**

- Admin JWT login plus a legacy `x-admin-secret` header path, both guarded by `middleware/verifyAdmin.js`
- Dashboard aggregations for revenue (cancelled orders excluded), day-over-day orders and new customers, order/payment status breakdown, low-stock and top products — cached in-process and in Redis with a configurable TTL
- CRUD screens for products, categories, subcategories, brands, coupons, users, contacts and newsletter subscribers, plus return management, activity log, refund reporting and a deploy-checks page
- Handlebars templates in `views/emails` for every order state (placed, confirmed, packed, shipped, out for delivery, delivered, failed) and OTP mail, sent over SMTP via Nodemailer or the Brevo API; optional WhatsApp notifications via an Evolution API instance
- Socket.IO rooms (`user:<id>`, `admin:dashboard`) with identity derived on the server, emitting `orderUpdate`, `statusUpdate`, `newOrder`, `dashboardUpdate`, `cart:updated`, `cart:summary-updated` and `orderRefundProcessed`
- Gemini-backed shopping assistant (`POST /api/chat`) with a cached knowledge endpoint, intent engine and catalogue search

**Reliability & Observability**

- Sentry on both client and server; Datadog RUM and Core Web Vitals loaded only after the page is interactive
- Helmet security headers, CORS allow-list with Vercel preview support, global (2000/15 min) and auth (10/15 min) rate limiters, gzip compression
- Redis cache with memory fallback, a Mongoose query-cache plugin, slow-query profiler, optional clustering, and a keep-alive pinger for cold-starting hosts
- `node:test` suites for models/utils/config, React Testing Library suites for chatbot, wishlist, sockets and toasts, plus a k6 load script and a memory-leak detector

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, CRA via `react-app-rewired`, Bootstrap 4, MUI 5 + Emotion, Framer Motion, Recharts, lucide-react, react-window, react-loading-skeleton |
| State management | Redux Toolkit, Redux Saga, React Redux, TanStack React Query (catalogue queries) |
| Backend | Node.js 20, Express 4 |
| Database | MongoDB with Mongoose 8 — 16 models, compound and text indexes |
| Cache / Queue | Redis (`ioredis`), BullMQ queues `eshopper-email` · `-refund` · `-report` · `-image`, in-memory fallback, `node-cron` |
| Auth | bcryptjs, jsonwebtoken, Firebase Auth + Firebase Admin, email OTP, optional 2FA |
| Payments / Media | Razorpay (orders, signature verification, refunds, webhook); Cloudinary + multer-storage-cloudinary; `sharp` WebP image proxy |
| Email / Realtime / AI | Nodemailer + Handlebars templates, `@getbrevo/brevo`; Socket.IO 4; Google Generative AI (Gemini) |
| Documents | jsPDF, jspdf-autotable, qrcode |
| Monitoring | Sentry (`@sentry/node`, `@sentry/react`), Datadog Browser RUM, web-vitals, prom-client |
| Build / Deploy | react-app-rewired + `config-overrides.js`, GitHub Actions, Vercel (`vercel.json`), Render, Railway config (`railway.json`) |

## 🏗️ Architecture

The browser talks to a single Express application over REST and a WebSocket. Express owns MongoDB access through Mongoose, uses Redis both as a response cache and as the BullMQ transport, and hands slow work (refunds, reports) to a separate worker process so request latency stays flat. When Redis is unavailable or its quota is spent, the cache silently degrades to an in-process `Map` and BullMQ falls back to local queues — the API keeps serving.

```text
  Browser ──▶ React SPA (Vercel)            Vercel Edge middleware.js
              Redux Saga · React Query      adds canonical + JSON-LD
              Socket.IO client              to the SPA shell
                   │  REST /api  +  WebSocket
                   ▼
              Express API (server.js) ─────▶ Cloudinary · Razorpay
              helmet · cors · rate limit     Brevo/SMTP · Gemini
              routes/ → controllers/
              Socket.IO server + rooms
                 │             │
        Mongoose │      cache /│ enqueue
                 ▼      queues ▼
             MongoDB     Redis + BullMQ ──▶ Worker (worker.js)
                                            node-cron auto-refunds
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x (see `.nvmrc`) and npm
- A MongoDB database (Atlas or local)
- Redis — optional; without it the app uses the in-memory cache and local queues
- Accounts for Razorpay, Cloudinary, Firebase, and an SMTP or Brevo email provider

### Installation

```bash
git clone https://github.com/theafzalhussain/eshopper.git
cd eshopper
npm install
```

### Environment Setup

Create a `.env` file in the project root. Backend keys are read by `server.js` and `worker.js`; `REACT_APP_*` keys are inlined into the frontend bundle at build time.

```env
# Core
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
FRONTEND_URL=http://localhost:3000

# Auth · Payments · Media · Email
JWT_SECRET=replace_me
ADMIN_JWT_SECRET=replace_me
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
CLOUD_NAME=xxx
CLOUD_API_KEY=xxx
CLOUD_API_SECRET=xxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx

# Frontend
REACT_APP_API_URL=http://localhost:5000
REACT_APP_USE_LOCAL_API=true
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxx
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
REACT_APP_FIREBASE_PROJECT_ID=xxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxx
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxx
REACT_APP_FIREBASE_APP_ID=xxx
```

Firebase Admin credentials come from either `FIREBASE_CONFIG_JSON` or a `firebase-admin.json` file in the project root (both git-ignored). If neither is present, `/api/auth-sync` stays disabled and the rest of the API still boots. `.npmrc` sets `legacy-peer-deps=true`, so a plain `npm install` resolves the peer graph without extra flags.

### Running Locally

Run each process in its own terminal, then run the test suites:

```bash
npm start      # React dev server on http://localhost:3000
npm run server # Express API on http://localhost:5000
npm run worker # BullMQ worker (refund + report processors)

npm test            # React Testing Library suites
npm run test:server # node:test suites in utils/, config/, models/
```

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | **Yes** |
| `JWT_SECRET` / `ADMIN_JWT_SECRET` | Signing secrets for user and admin tokens; the latter also backs Socket.IO admin identity | **Yes** |
| `FRONTEND_URL` | Public storefront origin; seeds the CORS allow-list and sitemap base URL | **Yes** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API credentials | **Yes** |
| `CLOUD_NAME` / `CLOUD_API_KEY` / `CLOUD_API_SECRET` | Cloudinary upload credentials | **Yes** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Transactional email transport | **Yes** |
| `PORT` / `NODE_ENV` | Listen port (default `5000`); `production` enables static build serving, rate limiting and the SPA guard | No |
| `DB_NAME` / `MONGO_MAX_POOL` / `MONGO_MIN_POOL` | Database name (default `eshoper`) and Mongoose pool bounds | No |
| `CORS_ALLOWED_ORIGINS` | Extra comma-separated allowed origins | No |
| `ADMIN_JWT_EXPIRES` / `ADMIN_SECRET` / `ADMIN_EMAILS` / `ADMIN_EMAIL` / `BCRYPT_SALT_ROUNDS` | Admin token lifetime (`12h`), legacy `x-admin-secret` value, admin login allow-list, hashing cost (`10`) | No |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies incoming Razorpay webhook signatures | No |
| `SENDER_EMAIL` / `SENDER_NAME` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | From identity on outbound mail | No |
| `BREVO_API_KEY` / `SENDINBLUE_API_KEY` | Brevo HTTP email provider, an alternative to SMTP | No |
| `FIREBASE_CONFIG_JSON` / `GEMINI_API_KEY` | Firebase Admin service account; enables the Gemini shopping assistant | No |
| `REDIS_URL` / `REDIS_PASSWORD` / `REDIS_USERNAME` / `REDIS_TLS` / `REDIS_ENABLED` | Redis cache + BullMQ connection; `REDIS_ENABLED=false` forces the in-memory cache | No |
| `REDIS_WORKER_URL` / `REDIS_WORKER_PASSWORD` / `REDIS_WORKER_USERNAME` | Dedicated worker Redis connection | No |
| `BULLMQ_ENABLED` / `BULLMQ_WORKERS_ENABLED` / `EMAIL_QUEUE_ENABLED` / `REFUND_WORKER_INTERVAL_MS` | Toggle queue creation, job processing and queued order email; refund poll interval (min 5000 ms) | No |
| `ORDER_RETURN_WINDOW_DAYS` / `DELIVERY_OTP_EXPIRY_MINUTES` | Return window (`7` days) and delivery OTP validity (`120` minutes) | No |
| `GLOBAL_RATE_LIMIT_MAX` / `DASHBOARD_CACHE_TTL_MS` / `SLOW_QUERY_MS` | Requests per 15 min (`2000`), dashboard cache TTL (`15000`), slow-query threshold (`200` ms) | No |
| `FEATURE_EMAIL_NOTIFICATIONS` / `FEATURE_INVOICE_SYSTEM` / `FEATURE_WHATSAPP_NOTIFICATIONS` | Feature flags | No |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `WHATSAPP_TOKEN` / `WHATSAPP_INSTANCE` / `BOT_PHONE_NUMBER` | WhatsApp notification transport | No |
| `SENTRY_DSN` / `SOCKET_DEBUG` / `ENABLE_CLUSTER` / `WEB_CONCURRENCY` | Server-side Sentry capture, verbose socket logging, multi-process clustering | No |
| `KEEP_ALIVE_URL` / `RENDER_EXTERNAL_URL` / `KEEP_ALIVE_DISABLED` | Self-ping to prevent host cold starts | No |
| `BRAND_SITE_URL` / `BRAND_LOGO_URL` / `SUPPORT_EMAIL` / `SUPPORT_PHONE` / `COMPANY_ADDRESS` / `COMPANY_GSTIN` / `COMPANY_CIN` | Branding and legal details on invoices and emails | No |
| `REACT_APP_API_URL` / `REACT_APP_BASE_URL` | Frontend API target | **Yes** |
| `REACT_APP_RAZORPAY_KEY_ID` | Razorpay publishable key for the checkout widget | **Yes** |
| `REACT_APP_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_STORAGE_BUCKET` / `_MESSAGING_SENDER_ID` / `_APP_ID` | Firebase web SDK config; all six are validated at startup | **Yes** |
| `REACT_APP_USE_LOCAL_API` / `REACT_APP_LOCAL_API_URL` / `REACT_APP_ADMIN_SECRET` | Point the dev build at a local API; admin secret sent from admin screens | No |
| `REACT_APP_SOCKET_TRANSPORTS` / `REACT_APP_FORCE_WEBSOCKET` / `REACT_APP_FORCE_MONITORING` / `REACT_APP_VERSION` | Socket transport strategy, force RUM in dev, release tag | No |
| `REACT_APP_BRAND_LOGO_URL` / `REACT_APP_BRAND_WATERMARK_URL` / `REACT_APP_BRAND_NAME` | Frontend branding assets | No |
| `DISABLE_ESLINT_PLUGIN` / `GENERATE_SOURCEMAP` | CRA build behaviour, set in `.env.production` | No |

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the React dev server (`react-app-rewired start`) |
| `npm run build` | Production frontend build into `build/` |
| `npm run server` | Start the Express API (`node server.js`) |
| `npm run worker` | Start the BullMQ worker (`node worker.js`) |
| `npm test` / `npm run test:server` | React component tests / `node --test` suites in `utils/`, `config/`, `models/` |
| `npm run mem:watch` | Memory-leak detector with `--expose-gc` |
| `npm run fix:order-qty:dry` / `npm run fix:order-qty` | Preview / apply the order-quantity repair migration |
| `npm run fix:order-breakdown:dry` / `npm run fix:order-breakdown` | Order pricing-breakdown backfill \* |
| `npm run fix:user-settings:dry` / `npm run fix:user-settings` | User-settings backfill \* |
| `npm run eject` | CRA eject (irreversible) |

\* `backfill-order-pricing-breakdown.js` and `backfill-user-settings.js` are referenced by those two script pairs but are not tracked in the repository. Other standalone utilities: `node seed.js`, `node seed-coupon-limits.js`, `node update-coupon-limits.js --list`, `node scripts/smoke-test.js`, `node scripts/print-user-stats.js`, `node scripts/recalculate-user-stats.js`, and `k6 run scripts/k6-load-test.js`.

## 📂 Project Structure

```text
eshopper/
├── src/                     React SPA — Component/, Store/ (Redux + sagas), queries/, hooks/, utils/
│   ├── Component/           Storefront pages, Admin/ dashboard, chatbot/ engine
│   └── Store/               ActionCreaters, Reducers, Sagas, Services, Store
├── routes/                  Express routers (order, admin, cart, product, user, wishlist, payment, review, seo, metrics, imageProxy)
├── controllers/             Auth, cart, order, product, wishlist and admin request handlers
├── models/                  16 Mongoose schemas (Order, Product, User, Cart, Coupon, RefundJob, …)
├── middleware/              verifyAdmin (JWT + header auth), Cloudinary upload, circuit breaker
├── utils/                   cache, queues, cronJobs, autoRefundScheduler, refundWorker, socketAuth, query cache/profiler
├── config/                  Redis and Firebase client factories
├── views/emails/            Handlebars order-lifecycle and OTP email templates
├── scripts/                 Smoke test, k6 load test, memory-leak detector, user-stat tools
├── server.js                Express API entry point (routes, Socket.IO, cron bootstrap)
├── worker.js                BullMQ worker entry point
├── middleware.js            Vercel Edge middleware for SEO meta/canonical/JSON-LD injection
├── config-overrides.js      CRA webpack overrides (Node polyfills, COOP header for Firebase popups)
└── .github/workflows/       ci.yml (build + verify) and deploy.yml (Render + Vercel)
```

## 🔌 API Overview

| Group | Representative endpoints |
|---|---|
| Health | `GET /` · `GET /healthz` |
| Auth | `POST /login` · `POST /api/login-2fa` · `POST /api/send-otp` · `POST /api/verify-otp` · `POST /api/reset-password` · `POST /api/check-username` · `POST /api/auth-sync` |
| Catalogue | `GET /product` · `GET /product/search` · `GET /product/:id` · `POST /product/add` · `PUT /product/:id` · `DELETE /product/:id` · `GET /api/products` |
| Taxonomy | `GET|POST /maincategory` · `PUT|DELETE /maincategory/:id` (same shape for `/subcategory` and `/brand`) |
| Cart | `GET|POST /api/cart` · `PUT /api/cart/update-quantity/:itemId` · `DELETE /api/cart/remove-item/:itemId` · `POST /api/cart/save-for-later/:itemId` · `POST /api/cart/delivery-estimate` · `GET /api/cart/order-summary` · `POST /api/cart/options` |
| Coupons & wishlist | `GET /api/cart/coupons` · `POST /api/cart/apply-coupon` · `GET|POST|PUT|DELETE /coupon` · `GET|POST /api/wishlist` · `DELETE /api/wishlist/:id` |
| Orders | `POST /api/place-order` · `GET /api/user/orders` · `GET /api/orders/:orderId` · `POST /api/orders/:orderId/cancel` · `POST /api/orders/:orderId/return` · `GET /api/order/:orderId/invoice` |
| Payments | `GET /api/razorpay/config` · `POST /api/razorpay/create-order` · `POST /api/razorpay/verify-payment` · `POST /api/payments/razorpay/webhook` |
| Reviews & membership | `POST /api/review` · `GET /api/review/:productId` · `PUT /api/review/:id` · `PUT /api/review/:id/helpful` · `DELETE /api/review/:id` · `GET /api/membership/check` |
| Users | `GET|POST /api/user` · `GET /api/user/:id` · `GET|POST /api/user/:id/addresses` · `PUT|DELETE /api/user/:id/addresses/:addressId` |
| Admin | `POST /api/admin/login` · `GET /api/admin/dashboard` · `GET /api/admin/dashboard-analytics` · `GET /api/admin/orders` · `GET /api/admin/users` · `GET /api/admin/activities` · `POST /api/admin/update-order-status` · `GET /api/admin/invoices` · `PUT /api/admin/users/:id/membership` |
| Returns & refunds | `GET /api/admin/returns` · `GET /api/admin/returns/stats` · `PUT /api/admin/returns/:orderId/status` · `POST /api/admin/returns/:orderId/mark-received` · `POST /api/admin/returns/:orderId/refund` · `POST /api/admin/scheduler/trigger-refunds` · `GET /api/admin/scheduler/refund-report` |
| Assistant | `POST /api/chat` · `GET /api/chatbot/knowledge` · `GET /product/chatbot-metadata` |
| Misc | `GET /img?src=&w=&q=` (WebP proxy) · `GET /api/footer-data` · `POST /api/activity-log` · `POST /contact` · `POST /newslatter` · `GET /sitemap.xml` |

## 🖼️ Screenshots

<!-- Replace with your screenshot -->
![Storefront home](docs/screenshots/home.png)

<!-- Replace with your screenshot -->
![Cart and coupon summary](docs/screenshots/cart.png)

<!-- Replace with your screenshot -->
![Admin dashboard](docs/screenshots/admin-dashboard.png)

## 🗺️ Roadmap

- [ ] Mount the existing `routes/metrics.js` Prometheus router so `prom-client` metrics are actually scrapeable
- [ ] Commit the `backfill-order-pricing-breakdown.js` and `backfill-user-settings.js` migrations referenced by npm scripts
- [ ] Split `server.js` fully into `routes/` + `controllers/` and retire the legacy compatibility REST aliases
- [ ] Move the hard-coded Sentry DSN in `server.js` behind `SENTRY_DSN`
- [ ] Add integration test coverage for the checkout → payment → refund path
- [ ] Add a Dockerfile to match the existing `.dockerignore` for container-based deploys

## 🤝 Contributing

1. Fork the repository and create a branch: `git checkout -b feature/your-feature`
2. Install dependencies with `npm install` and set the `.env` values for the services you need
3. Make your change and keep both suites green: `npm test` and `npm run test:server`
4. Commit with a descriptive message: `git commit -m "feat: add ..."`
5. Push (`git push origin feature/your-feature`) and open a pull request against `main`

CI runs `npm ci` and `npm run build` on every push and pull request, so confirm the production build succeeds locally first.

## 📄 License

No license file is currently present in this repository. Until one is added, all rights are reserved by the author. The MIT License is a good default if the intent is to allow reuse — add it as a `LICENSE` file at the repository root.

## 👤 Author

**Afzal Hussain**

- GitHub: [@theafzalhussain](https://github.com/theafzalhussain)
- Portfolio: [afzalhussain.tech](https://afzalhussain.tech)
- Email: theafzalhussain786@gmail.com
