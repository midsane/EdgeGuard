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

export function startFetch(bucket) {
  bucket.isFetching = true;
}

export function finishFetch(bucket, leasedTokens) {
  bucket.tokens += leasedTokens;
  bucket.lastSync = Date.now();
  bucket.isFetching = false;
}