import redis from '../../gateway/src/utils/redis.js';

export async function incrementMetric(tenantId) {
  const minute = Math.floor(Date.now() / 60000);
  const key = `metrics:${tenantId}:${minute}`;

  await redis.incr(key);
}