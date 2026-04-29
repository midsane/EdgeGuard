import {
  getBucket,
  consumeLocal,
  shouldPrefetch,
  startFetch,
  finishFetch
} from '../rateLimiter/localTokenCache.js';

import { checkRateLimit } from '../rateLimiter/tokenBucket.js';

export default async function rateLimiter(req, reply) {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anon';

  const key = `rate_limit:${tenantId}:${userId}`;

  const bucket = getBucket(key);

  if (consumeLocal(bucket)) {
    // trigger background refill if needed
    if (shouldPrefetch(bucket)) {
      startFetch(bucket);

      // async prefetch (no await)
      checkRateLimit(key, 100, 5, tenantId)
        .then(({ allowed }) => {
          if (allowed) {
            finishFetch(bucket, 10); // lease
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

  const { allowed } = await checkRateLimit(
    key,
    100,
    5,
    tenantId
  );

  if (!allowed) {
    return reply.code(429).send({ error: 'Rate limit exceeded' });
  }

  // refill after sync
  finishFetch(bucket, 10);
}