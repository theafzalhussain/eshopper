import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const res1 = http.get(`${BASE}/api/products?limit=6`);
  check(res1, { 'products 200': (r) => r.status === 200 });

  // simulate a random user orders fetch
  const userId = __ENV.TEST_USER_ID || '';
  if (userId) {
    const res2 = http.get(`${BASE}/api/orders/${userId}`);
    check(res2, { 'orders 200': (r) => r.status === 200 || r.status === 404 });
  }

  sleep(Math.random() * 2 + 0.5);
}
