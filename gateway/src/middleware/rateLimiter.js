import {
  getBucket,
  consumeLocal,
  shouldPrefetch,
  tryStartFetch,
  finishFetch
} from '../rateLimiter/localTokenCache.js';

import { checkRateLimit } from '../rateLimiter/tokenBucket.js';

const CAPACITY = 100;
const REFILL_RATE = 5;
const LEASE_SIZE = 40;

export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';

  // IMPORTANT: hash tag ensures same shard per tenant
  const key = `rate_limit:{${tenantId}}:${userId}`;

  const bucket = getBucket(key);

  // FAST PATH (no Redis hit)
  if (consumeLocal(bucket)) {

    // background refill
    if (shouldPrefetch(bucket) && tryStartFetch(bucket)) {

      checkRateLimit(key, CAPACITY, REFILL_RATE)
        .then(({ allowed }) => {
          if (allowed) {
            finishFetch(bucket, LEASE_SIZE);
          } else {
            bucket.isFetching = false;
          }
        })
        .catch(() => {
          bucket.isFetching = false;
        });
    }

    return;
  }

  // SLOW PATH (Redis sync)
  const { allowed } = await checkRateLimit(
    key,
    CAPACITY,
    REFILL_RATE
  );

  if (!allowed) {
    return reply.code(429).send({ error: 'Rate limit exceeded' });
  }

  // refill local cache after successful sync
  finishFetch(bucket, LEASE_SIZE);
}