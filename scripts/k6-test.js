import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '20s', target: 100 },   // ramp up
    { duration: '40s', target: 300 },   // stress
    { duration: '20s', target: 0 },     // ramp down
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api', {
    headers: {
      'x-tenant-id': 'tenant1',
      'x-user-id': `user-${Math.random()}`
    },
  });

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}