const cache = new Map();

const LEASE_SIZE = 10;
const PREFETCH_THRESHOLD = 3;
const TTL = 2000;

export function getBucket(key) {
  let bucket = cache.get(key);

  const now = Date.now();

  if (!bucket) {
    bucket = {
      tokens: 0,
      lastSync: 0,
      isFetching: false
    };
    cache.set(key, bucket);
  }

  // expire stale bucket
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

export function shouldPrefetch(bucket) {
  return bucket.tokens <= PREFETCH_THRESHOLD && !bucket.isFetching;
}

export function tryStartFetch(bucket) {
  //locking to avoid race condition, avoiding multiple concurrent req from prefetching
  if (bucket.isFetching) return false;
  bucket.isFetching = true;
  return true;
}

export function finishFetch(bucket, leasedTokens) {
  bucket.tokens = Math.min(bucket.tokens + leasedTokens, 50);
  bucket.lastSync = Date.now();
  bucket.isFetching = false;
}