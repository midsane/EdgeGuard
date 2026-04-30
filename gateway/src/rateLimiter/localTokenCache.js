const cache = new Map();

const TTL = 30000; // 30 sec
MAX_LOCAL_TOKENS = 3000
PREFETCH_THRESHOLD = 500

export function getBucket(key) {
  let bucket = cache.get(key);
  const now = Date.now();

  if (!bucket) {
    bucket = {
      tokens: 2000, // 🔥 warm start (VERY IMPORTANT)
      lastSync: now,
      isFetching: false,
    };
    cache.set(key, bucket);
  }

  // expire stale bucket
  if (now - bucket.lastSync > TTL) {
    bucket.tokens = 200; // 🔥 partial reset instead of 0
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
  if (bucket.isFetching) return false;
  bucket.isFetching = true;
  return true;
}

export function finishFetch(bucket, leasedTokens) {
  bucket.tokens = Math.min(
    bucket.tokens + leasedTokens,
    MAX_LOCAL_TOKENS
  );
  bucket.lastSync = Date.now();
  bucket.isFetching = false;
}

export function failFetch(bucket) {
  bucket.isFetching = false;
}