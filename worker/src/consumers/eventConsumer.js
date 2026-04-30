import { getRedisClient } from '../../../common/redis.js';
import { incrementMetric } from '../services/metricService.js';

const STREAM = 'events_stream';
const GROUP = 'event_group';
const CONSUMER = `consumer_${process.pid}`;

async function ensureGroup(redis) {
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '0', 'MKSTREAM');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error('Group init error:', err.message);
    }
  }
}

async function processStream(redis) {
  await ensureGroup(redis);

  while (true) {
    try {
      const data = await redis.xreadgroup(
        'GROUP',
        GROUP,
        CONSUMER,
        'BLOCK',
        5000,
        'COUNT',
        100,
        'STREAMS',
        STREAM,
        '>'
      );

      if (!data) continue;

      const [, messages] = data[0];

      for (const [id, fields] of messages) {
        const tenantId = fields[1];

        try {
          await incrementMetric(tenantId);
          await redis.xack(STREAM, GROUP, id);
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
  await processStream(redis);
}