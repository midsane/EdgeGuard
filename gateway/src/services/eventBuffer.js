import { getRedisClient } from "../../../common/redis.js";

/**
 * CONFIG — tune these
 */
const MAX_BUFFER_SIZE = 5000;     // safety cap
const BATCH_SIZE = 100;           // flush trigger
const FLUSH_INTERVAL = 100;       // ms
const TIMEOUT_MS = 50;            // Redis timeout

/**
 * INTERNAL STATE
 */
const buffer = [];
let isFlushing = false;

/**
 * CIRCUIT BREAKER
 */
let cbState = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
let failureCount = 0;
let nextAttemptTime = 0;

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 5000;

/**
 * PUBLIC API — called from request handler
 */
export function addEvent(event) {
  // Prevent unbounded memory growth
  if (buffer.length >= MAX_BUFFER_SIZE) {
    // Drop oldest (or you can drop newest)
    buffer.shift();
  }

  buffer.push(event);

  // Trigger flush if batch full
  if (buffer.length >= BATCH_SIZE) {
    triggerFlush();
  }
}

/**
 * NON-BLOCKING flush trigger
 */
function triggerFlush() {
  if (!isFlushing) {
    setImmediate(flush);
  }
}

/**
 * MAIN FLUSH FUNCTION
 */
async function flush() {
  if (isFlushing) return;
  if (buffer.length === 0) return;

  isFlushing = true;

  // Circuit breaker check
  if (cbState === 'OPEN') {
    if (Date.now() > nextAttemptTime) {
      cbState = 'HALF_OPEN';
    } else {
      isFlushing = false;
      return;
    }
  }

  // Take batch
  const batch = buffer.splice(0, BATCH_SIZE);

  const redis = getRedisClient();
  const pipeline = redis.pipeline();

  for (const e of batch) {
    pipeline.xadd(
      `events_stream:${e.tenant}`,
      '*',
      'tenant', e.tenant,
      'status', e.status
    );
  }

  try {
    await Promise.race([
      pipeline.exec(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      )
    ]);

    // Success
    cbState = 'CLOSED';
    failureCount = 0;

  } catch (err) {
    failureCount++;

    console.warn(`Event flush failed (${failureCount}): ${err.message}`);

    if (failureCount >= FAILURE_THRESHOLD) {
      cbState = 'OPEN';
      nextAttemptTime = Date.now() + RESET_TIMEOUT;
      console.error(`Circuit OPEN for ${RESET_TIMEOUT}ms`);
    }

    // IMPORTANT: put batch back (retry later)
    buffer.unshift(...batch);
  }

  isFlushing = false;

  // If more data remains → continue flushing
  if (buffer.length >= BATCH_SIZE) {
    triggerFlush();
  }
}

/**
 * PERIODIC FLUSH (handles low traffic)
 */
setInterval(() => {
  if (buffer.length > 0) {
    triggerFlush();
  }
}, FLUSH_INTERVAL);