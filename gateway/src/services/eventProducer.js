import redis from '../utils/redis.js';

export async function pushEvent(tenantId, status) {
  await redis.xadd(
    'events_stream',
    '*',
    'tenant', tenantId,
    'status', status
  );
}