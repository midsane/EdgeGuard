import { checkRateLimit } from '../rateLimiter/tokenBucket.js';

export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';

  const key = `rate_limit:${tenantId}:${userId}`;

  const { allowed, latency } = await checkRateLimit(key, 100, 5);
  reply.header('X-RateLimit-Latency', latency);

  if (!allowed) {
    return reply
      .code(429)
      .send({ error: 'Rate limit exceeded', redisLatency: latency });
  }

  // attach debug info
  req.rateLimitMeta = { latency };
}