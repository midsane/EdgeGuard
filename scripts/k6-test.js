import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const successCount = new Counter('success_requests');
const rateLimitedCount = new Counter('rate_limited_requests');

export let options = {
  stages: [
    { duration: '20s', target: 300 },
    { duration: '40s', target: 800 },   // 🔥 increase
    { duration: '40s', target: 1200 },  // 🔥 push harder
    { duration: '20s', target: 0 },
  ],
};

export default function () {
  const selectedPort = Math.floor(Math.random() * 3) + 3000;
  const res = http.get(`http://localhost:${selectedPort}/api`, {
    headers: {
      'x-tenant-id': 'tenant1',
      'x-user-id': 'user-1'// hot key
    },
  });

  // classify responses
  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status === 429) {
    rateLimitedCount.add(1);
  }

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}