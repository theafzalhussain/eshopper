# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Razorpay Payment Setup

The checkout flow supports Razorpay for `UPI` and `Card / NetBanking` payments. `COD` still uses the existing direct order path.

### Required environment variables

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Keep both values in the backend environment only. Do not expose the secret to the frontend.

### How it works

1. The frontend loads the Razorpay checkout script when a paid payment method is selected.
2. The backend creates a Razorpay order using the final checkout amount.
3. Razorpay returns `order_id`, `payment_id`, and `signature`.
4. The backend verifies the signature before the order is placed.
5. The order record stores the Razorpay references for tracking and audit.

### Test mode checklist

- Use Razorpay test credentials.
- Make sure the backend server is running with the payment env vars set.
- Test one UPI flow and one card flow from the checkout page.
- Confirm the order appears in order tracking with the payment reference.

### Notes

- If Razorpay checkout does not open, verify that the browser can load `https://checkout.razorpay.com/v1/checkout.js`.
- If payment verification fails, rotate the secret if it has been exposed and recheck the signature logic.

## BullMQ Queueing

The backend uses an in-memory fallback queue for email, refund, and report jobs. No Redis configuration is required for local development.

## Redis & BullMQ (Caching and Queues)

This project supports Redis-backed HTTP response caching and BullMQ queues for background jobs. When Redis is configured, the app will:
- Cache GET responses for product listings, searches, and processed images (via `/img` proxy).
- Use BullMQ for email/refund/report/image jobs with a separate Redis connection for workers (recommended).

Recommended environment variables:
- `REDIS_URL` — your Redis host (e.g. faithful-microsteady-sweater-59212.db.redis.io:15258)
- `REDIS_PASSWORD` — Redis password
- `REDIS_WORKER_URL` (optional) — separate Redis URL for workers/schedulers
- `REDIS_WORKER_PASSWORD` (optional) — password for worker Redis
- `BULLMQ_ENABLED` — set to `false` to disable queues
- `BULLMQ_WORKERS_ENABLED` — set to `false` to disable in-process workers

Example `.env` entries:

```
REDIS_URL=faithful-microsteady-sweater-59212.db.redis.io:15258
REDIS_PASSWORD=your_redis_password_here
REDIS_WORKER_URL=faithful-microsteady-sweater-59212.db.redis.io:15258
REDIS_WORKER_PASSWORD=your_redis_password_here
BULLMQ_ENABLED=true
BULLMQ_WORKERS_ENABLED=true
```

Smoke tests (curl) to verify cache HIT/MISS and BullMQ connectivity:

- Check product list (first should be MISS, second should be HIT):

```bash
curl -i http://localhost:5000/product
# repeat:
curl -i http://localhost:5000/product
```

- Check image proxy (first MISS, second HIT):

```bash
curl -i "http://localhost:5000/img?src=/assets/productimages/example.jpg&w=400&q=80" > /dev/null
curl -i "http://localhost:5000/img?src=/assets/productimages/example.jpg&w=400&q=80" > /dev/null
```

- Check BullMQ queues (enqueue test job via API or server bootstrap logs):

If `BULLMQ_ENABLED=true` and `REDIS_URL` is set, server logs will show "BullMQ initialized with Redis backend" on startup. To test enqueue from Node REPL:

```bash
node -e "const { enqueueJob, QUEUE_NAMES } = require('./utils/queues'); enqueueJob('report', { days:7 }).then(console.log).catch(console.error)"
```

If you enable workers in production, prefer a separate `REDIS_WORKER_URL` to isolate scheduler and worker connections.

Caching notes:
- Product create/update/delete flows invalidate relevant caches automatically.
- Image proxy caches transformed images for 30 days (stored in Redis as base64).

Security: never commit real Redis credentials. Use `.env` or your hosting provider's secret management.
