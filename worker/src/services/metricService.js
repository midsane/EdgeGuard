import { getRedisClient } from '../../../common/redis.js';

export async function incrementMetric(tenantId) {
  const redis = getRedisClient()
  const minute = Math.floor(Date.now() / 60000);
  const key = `rate_limit:{${tenantId}}:${userId}`;
  await redis.incr(key);
}