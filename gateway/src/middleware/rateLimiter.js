import {
  getBucket,
  consumeLocal,
  shouldPrefetch,
  tryStartFetch,
  finishFetch,
  failFetch
} from '../rateLimiter/localTokenCache.js';

import { checkRateLimit } from '../rateLimiter/tokenBucket.js';

const CAPACITY = 20000;
const REFILL_RATE = 10000;
const LEASE_SIZE = 5000;

export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';

  const key = `rate_limit:{${tenantId}}:${userId}`;
  const bucket = getBucket(key);

  // ⚡ FAST PATH
  if (consumeLocal(bucket)) {

    // 🔁 background refill
    if (shouldPrefetch(bucket) && tryStartFetch(bucket)) {
      checkRateLimit(key, CAPACITY, REFILL_RATE)
        .then(() => finishFetch(bucket, LEASE_SIZE))
        .catch(() => failFetch(bucket));
    }

    return;
  }

  // 🔥 FALLBACK PATH (IMPORTANT — THIS FIXES YOUR SYSTEM)
  try {
    const { allowed } = await checkRateLimit(key, CAPACITY, REFILL_RATE);

    if (!allowed) {
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }
``
    finishFetch(bucket, LEASE_SIZE);
    return;

  } catch (err) {
    // fail-open (production strategy)
    return;
  }
}