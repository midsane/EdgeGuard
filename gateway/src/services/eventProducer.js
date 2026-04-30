import { getRedisClient } from "../utils/getRedisClient.js";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ]);
}

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 5000;

let cbState = 'CLOSED';
let failureCount = 0;
let nextAttemptTime = 0;

export async function pushEvent(tenantId, status) {
  // shard stream by tenant (prevents hot shard)
  const streamKey = `events_stream:${tenantId}`;

  // Circuit breaker check
  if (cbState === 'OPEN') {
    if (Date.now() > nextAttemptTime) {
      cbState = 'HALF_OPEN';
    } else {
      return;
    }
  }

  const redis = getRedisClient();

  try {
    const result = await withTimeout(
      redis.xadd(streamKey, '*', 'tenant', tenantId, 'status', status),
      30 // tighter timeout → less event loop blocking
    );

    if (cbState === 'HALF_OPEN') {
      console.log("Redis recovered. Circuit CLOSED.");
    }

    cbState = 'CLOSED';
    failureCount = 0;

    return result;

  } catch (error) {
    failureCount++;

    console.warn(`Redis push failed (${failureCount}): ${error.message}`);

    if (failureCount >= FAILURE_THRESHOLD) {
      cbState = 'OPEN';
      nextAttemptTime = Date.now() + RESET_TIMEOUT;
      console.error(`Circuit OPEN for ${RESET_TIMEOUT}ms`);
    }

    return;
  }
}