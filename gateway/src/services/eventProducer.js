import redis from '../utils/redis.js';

// For failure isolation, we can set a timeout for the pushEvent function. 
// If it takes too long, we can log the error and move on 
// without affecting the main flow of the application.

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ]);
}

// Circuit Breaker Configuration 
const FAILURE_THRESHOLD = 3;  // Number of failures before opening the circuit
const RESET_TIMEOUT = 5000;   // How long to stay OPEN before trying again (5 seconds)

let cbState = 'CLOSED';       // 'CLOSED', 'OPEN', 'HALF_OPEN'
let failureCount = 0;
let nextAttemptTime = 0;

export async function pushEvent(tenantId, status) {
  if (cbState === 'OPEN') {
    if (Date.now() > nextAttemptTime) {
      // Time has passed, let's test if Redis is back up
      cbState = 'HALF_OPEN';
    } else {
      // Circuit is still open, fail fast and skip the Redis call
      return;
    }
  }

  try {
    const result = await withTimeout(
      redis.xadd('events_stream', '*', 'tenant', tenantId, 'status', status),
      50 // ms
    );

    if (cbState === 'HALF_OPEN') {
      console.log("Redis recovered. Circuit is now CLOSED.");
    }
    cbState = 'CLOSED';
    failureCount = 0; // Reset failures on a successful push

    return result;

  } catch (error) {
    failureCount++;
    console.warn(`Redis push failed (count: ${failureCount}): ${error.message}`);

    // If we were testing the connection, or if we hit the failure limit
    if (cbState === 'HALF_OPEN' || failureCount >= FAILURE_THRESHOLD) {
      cbState = 'OPEN';
      nextAttemptTime = Date.now() + RESET_TIMEOUT;
      console.error(`Circuit is now OPEN. Skipping Redis pushes for ${RESET_TIMEOUT}ms.`);
    }

    // Return undefined so the main application flow is unaffected
    return;
  }
}