import { getBucket, consumeLocal, refillLocal } from '../rateLimiter/localTokenCache.js';
import { checkRateLimit } from '../rateLimiter/tokenBucket.js';
export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';
  const key = `rate_limit:${tenantId}:${userId}`;
  const bucket = getBucket(key);

  //check if allowed in local cache
  if (consumeLocal(bucket)) {
    return;
  }

  const { allowed, latency } = await checkRateLimit(key, 100, 5, tenantId);
  reply.header('X-RateLimit-Latency', latency);

  if (!allowed) {
    return reply
      .code(429)
      .send({ error: 'Rate limit exceeded', redisLatency: latency });
  }

  refillLocal(bucket, 10); // lease 10 tokens

  // attach debug info
  req.rateLimitMeta = { latency };
}

