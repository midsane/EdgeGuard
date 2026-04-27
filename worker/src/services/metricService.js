import redis from '../../../common/redis.js';

export async function incrementMetric(tenantId) {
  const minute = Math.floor(Date.now() / 60000);
  const key = `metrics:${tenantId}:${minute}`;
  console.log(`Incrementing metric for tenant ${tenantId} at minute ${minute}`);

  await redis.incr(key);
  console.log("key:", key, "added in redis")
}