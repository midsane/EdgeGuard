const cache = new Map();

// how many tokens to lease per Redis sync
const LEASE_SIZE = 10;

// safety: expire stale entries
const TTL = 2000; // ms

export function getBucket(key) {
  let bucket = cache.get(key);

  const now = Date.now();

  if (!bucket) {
    bucket = {
      tokens: 0,
      lastSync: 0
    };
    cache.set(key, bucket);
  }

  // cleanup stale entries
  if (now - bucket.lastSync > TTL) {
    bucket.tokens = 0;
  }

  return bucket;
}

export function consumeLocal(bucket) {
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }
  return false;
}

export function refillLocal(bucket, leasedTokens) {
  bucket.tokens = leasedTokens;
  bucket.lastSync = Date.now();
}