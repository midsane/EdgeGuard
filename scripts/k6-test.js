import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = 'http://rate-limiter-lb-12005547.ap-south-1.elb.amazonaws.com';

const successCount = new Counter('success_requests');
const rateLimitedCount = new Counter('rate_limited_requests');

export let options = {
  stages: [
    { duration: '10s', target: 800 },
    { duration: '20s', target: 1500 },
    { duration: '20s', target: 2000 },
    { duration: '20s', target: 0 },
  ],
};

export default function () {
  const res = http.get(`${BASE_URL}/api`, {
    headers: {
      'x-tenant-id': 'tenant-' + Math.floor(Math.random() * 5000),
      'x-user-id': 'user-' + Math.floor(Math.random() * 10),
    },
    timeout: '2s', 
  });

  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status === 429) {
    rateLimitedCount.add(1);
  }
check(res, {
  'status ok': (r) => r.status === 200 || r.status === 429,
  'no timeout': (r) => r.timings.duration < 2000,
});
}``