# EShopper — Full-Stack E-Commerce Platform

A production-grade e-commerce web application built with React and Node.js, featuring payment processing, order management, a returns workflow, coupon engine, premium memberships, real-time notifications, and an admin analytics dashboard.

**🔗 Live Demo:** https://eshopperr.me

---

## Overview

EShopper is a complete online shopping platform covering the full commercial lifecycle — product discovery, cart, checkout with live payments, order fulfilment, returns and refunds, and customer retention through coupons and premium memberships.

The project is built as a single repository containing a React single-page frontend, an Express REST API, and a background worker process for asynchronous jobs.

---

## Features

### Storefront
- Product catalogue with search, category filtering, and sorting
- Product detail pages with image galleries served through a CDN
- Persistent shopping cart and wishlist
- Virtualised product lists for smooth scrolling over large catalogues
- Skeleton loading states and optimistic UI updates
- Fully responsive across mobile, tablet, and desktop

### Authentication & Accounts
- Email/password registration and login with hashed credentials
- JWT-based session handling with protected routes
- Firebase authentication integration
- User profile and address book management
- Role-based access control separating customer and admin capabilities

### Checkout & Payments
- Razorpay payment gateway integration for live transactions
- Server-side order total calculation with a detailed pricing breakdown
- Coupon and discount engine with per-user redemption limits
- Automatic PDF invoice generation and QR codes for orders
- Order confirmation emails sent through a transactional email provider

### Orders & Returns
- Full order lifecycle tracking from placement to delivery
- Customer-initiated return and refund request workflow
- Admin approval and rejection flow for returns
- Order history with status timeline

### Premium Membership
- Subscription tier granting member-only pricing and benefits
- Subscription lifecycle handling and renewal logic

### Admin Dashboard
- Product, order, user, and coupon management
- Sales and revenue analytics with interactive charts
- Data grid views with server-side pagination

### Real-Time & Background Processing
- Socket.io for live order status updates and notifications
- Redis-backed job queue for email, invoice, and other deferred work
- Scheduled cron jobs for recurring tasks
- Separate worker process so heavy jobs never block API requests

### Production Engineering
- Error tracking on both client and server
- Real user monitoring and Core Web Vitals reporting
- Prometheus metrics endpoint for operational visibility
- API rate limiting and security headers
- Response compression and in-process caching
- Idempotent data-migration scripts with `--dry-run` and `--apply` modes
- Memory-leak detection tooling

---

## Tech Stack

**Frontend**
| Area | Technology |
|---|---|
| Framework | React |
| State management | Redux Toolkit, Redux Saga |
| Server state | TanStack React Query |
| Routing | React Router |
| UI | Material UI, Emotion, Bootstrap |
| Animation | Framer Motion |
| Charts | Recharts |
| Performance | react-window, web-vitals |
| Testing | React Testing Library |

**Backend**
| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB with Mongoose |
| Cache & queues | Redis, BullMQ |
| Real-time | Socket.io |
| Auth | JSON Web Tokens, bcrypt, Firebase Admin |
| Payments | Razorpay |
| Media | Cloudinary |
| Email | Nodemailer, Brevo |
| Documents | jsPDF, QR code generation |
| Scheduling | node-cron |

**Operations**
| Area | Technology |
|---|---|
| Monitoring | Sentry, Datadog RUM, Prometheus |
| Security | Helmet, CORS, express-rate-limit |
| Deployment | Vercel (frontend), Railway (API) |
| Containerisation | Docker |

---

## Architecture

```
Browser (React SPA)
   │
   │  REST over HTTPS  +  WebSocket
   ▼
Express API ──────────────┐
   │                      │
   │  Mongoose            │  enqueue jobs
   ▼                      ▼
MongoDB              Redis / BullMQ
                          │
                          ▼
                    Worker process
                 (email, invoices, cron)
```

The API stays responsive by pushing slow work — sending mail, generating invoices, syncing third-party services — onto a Redis-backed queue consumed by a separate worker process.

---

## Project Structure

```
├── src/                 React frontend application
├── routes/              Express route definitions
├── controllers/         Request handlers
├── models/              Mongoose schemas
├── middleware/          Auth, validation, error handling
├── utils/               Shared helpers
├── config/              Environment and service configuration
├── scripts/             Maintenance and diagnostic tooling
├── views/               Email templates
├── public/              Static assets
├── server.js            API entry point
└── worker.js            Background job consumer
```

---

## Getting Started

### Prerequisites
- Node.js (see `.nvmrc` for the target version)
- MongoDB instance
- Redis instance
- Razorpay, Cloudinary, and email provider accounts

### Installation

```bash
git clone https://github.com/theafzalhussain/eshopper.git
cd eshopper
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string

# Cache & queues
REDIS_URL=your_redis_connection_string

# Auth
JWT_SECRET=your_jwt_secret

# Payments
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Running Locally

```bash
npm start      # React dev server
npm run server # Express API
npm run worker # Background worker
```

The frontend runs on `http://localhost:3000` and the API on `http://localhost:5000`.

### Testing

```bash
npm test            # Frontend component tests
npm run test:server # Backend unit tests
```

### Maintenance Scripts

Every migration supports a dry run before it writes anything:

```bash
npm run fix:order-qty:dry        # Preview changes
npm run fix:order-qty            # Apply changes
npm run fix:order-breakdown:dry
npm run fix:user-settings:dry
npm run mem:watch                # Memory leak detection
```

---

## Deployment

The React frontend deploys to Vercel via `vercel.json`. The Express API and worker deploy to Railway via `railway.json`. A Dockerfile-compatible setup is included for container-based hosting.

---

## Author

**Afzal Hussain** — Frontend Developer

- Portfolio: https://afzalhussain.tech
- GitHub: https://github.com/theafzalhussain
- Email: theafzalhussain786@gmail.com

---

## License

Available for review as part of my development portfolio.
