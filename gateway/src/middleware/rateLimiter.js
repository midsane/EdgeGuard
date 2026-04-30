import {
  getBucket,
  consumeLocal,
  shouldPrefetch,
  tryStartFetch,
  finishFetch,
  failFetch
} from '../rateLimiter/localTokenCache.js';

import { checkRateLimit } from '../rateLimiter/tokenBucket.js';

CAPACITY = 5000
REFILL_RATE = 2000
LEASE_SIZE = 1000

export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';

  const key = `rate_limit:{${tenantId}}:${userId}`;
  const bucket = getBucket(key);

  //first check local token cache, and refill with token below threshold
  if (consumeLocal(bucket)) {

    if (shouldPrefetch(bucket) && tryStartFetch(bucket)) {
      checkRateLimit(key, CAPACITY, REFILL_RATE)
        .then(() => finishFetch(bucket, LEASE_SIZE))
        .catch(() => failFetch(bucket));
    }
    return;
  }

  //fallback path, have to check with redis
  try {
    const { allowed } = await checkRateLimit(key, CAPACITY, REFILL_RATE);

    if (!allowed) {
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    finishFetch(bucket, LEASE_SIZE);
    return;

  } catch (err) {
    return;
  }
}