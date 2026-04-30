import { getRedisClient } from '../../../gateway/src/utils/getRedisClient.js';
import { incrementMetric } from '../services/metricService.js';

const GROUP = 'event_group';
const CONSUMER = `consumer_${process.pid}`;

async function ensureGroup(redis, stream) {
  try {
    await redis.xgroup('CREATE', stream, GROUP, '0', 'MKSTREAM');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error('Group init error:', err.message);
    }
  }
}

async function processStream(redis, tenantId) {
  const stream = `events_stream:{${tenantId}}`;

  await ensureGroup(redis, stream);

  while (true) {
    try {
      const data = await redis.xreadgroup(
        'GROUP',
        GROUP,
        CONSUMER,
        'BLOCK',
        5000,
        'COUNT',
        10,
        'STREAMS',
        stream,
        '>'
      );

      if (!data) continue;

      const [, messages] = data[0];

      for (const [id, fields] of messages) {
        const tenantId = fields[1];

        try {
          await incrementMetric(tenantId);
          await redis.xack(stream, GROUP, id);
        } catch (err) {
          console.error(`Processing error (${tenantId}):`, err.message);
        }
      }
    } catch (err) {
      console.error('Stream read error:', err.message);
    }
  }
}

export async function processEvents() {
  const redis = getRedisClient();
  console.log('Worker started (cluster mode)');
  const tenants = Array.from({ length: 300 }, (_, i) => `tenant-${i}`);

  tenants.forEach((tenantId) => {
    processStream(redis, tenantId);
  });
}