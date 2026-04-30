import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
const BASE_URL = 'http://3.109.139.243';

const successCount = new Counter('success_requests');
const rateLimitedCount = new Counter('rate_limited_requests');

export let options = {
  stages: [
    { duration: '10s', target: 800 },
    { duration: '20s', target: 1000 },
    { duration: '20s', target: 2000 },
    { duration: '20s', target: 0 },
  ],
};

export default function () {
  const selectedPort = 3000;
  const res = http.get(`${BASE_URL}:${selectedPort}/api`, {
    headers: {
      'x-tenant-id': 'tenant-' + Math.floor(Math.random() * 300),
      'x-user-id': 'user-' + Math.floor(Math.random() * 10),
    },
  });

  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status === 429) {
    rateLimitedCount.add(1);
  }

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}