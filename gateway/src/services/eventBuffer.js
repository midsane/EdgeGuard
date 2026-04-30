import { getRedisClient } from "../../../common/redis.js";

const MAX_BUFFER_SIZE = 5000;     
const BATCH_SIZE = 100;           
const FLUSH_INTERVAL = 100;
const TIMEOUT_MS = 50;            

const buffer = [];
let isFlushing = false;

let cbState = 'CLOSED'; 
let failureCount = 0;
let nextAttemptTime = 0;

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 5000;

export function addEvent(event) {
  if (buffer.length >= MAX_BUFFER_SIZE) {
    // drop oldest 
    buffer.shift();
  }

  buffer.push(event);

  // Trigger flush if batch full
  if (buffer.length >= BATCH_SIZE) {
    triggerFlush();
  }
}

function triggerFlush() {
  if (!isFlushing) {
    setImmediate(flush);
  }
}

async function flush() {
  if (isFlushing) return;
  if (buffer.length === 0) return;

  isFlushing = true;

  if (cbState === 'OPEN') {
    if (Date.now() > nextAttemptTime) {
      cbState = 'HALF_OPEN';
    } else {
      isFlushing = false;
      return;
    }
  }

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

    buffer.unshift(...batch);
  }

  isFlushing = false;

  if (buffer.length >= BATCH_SIZE) {
    triggerFlush();
  }
}

// periodic flush in case of low traffic
setInterval(() => {
  if (buffer.length > 0) {
    triggerFlush();
  }
}, FLUSH_INTERVAL);