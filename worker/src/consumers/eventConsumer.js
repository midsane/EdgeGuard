// import redis from '../../gateway/src/utils/redis.js';
// import { incrementMetric } from '../services/metricsService.js';

// export async function processEvents() {
//   while (true) {
//     const data = await redis.xread(
//       'BLOCK', 0,
//       'STREAMS', 'events_stream', '$'
//     );
//     if (data) {
//       const [, messages] = data[0];

//       for (const message of messages) {
//         const [, fields] = message;

//         const tenantId = fields[1];

//         await incrementMetric(tenantId);

//         console.log('Processed event:', fields);
//       }
//     }
//   }
// }
import redisNodes from '../../../common/redisPool.js';
import { incrementMetric } from '../services/metricService.js';

const STREAM = 'events_stream';
const GROUP = 'event_group';
const CONSUMER = 'consumer_1';

async function initGroup() {
  for (const redis of redisNodes) {
    try {
      await redis.xgroup(
        'CREATE',
        STREAM,
        GROUP,
        '0',
        'MKSTREAM'
      );
    } catch (err) {
      if (!err.message.includes('BUSYGROUP')) {
        console.error(err);
      }
    }
  }
}

async function processShard(redis, shardId) {
  console.log(`🚀 Worker started for shard ${shardId}`);

  while (true) {
    const data = await redis.xreadgroup(
      'GROUP',
      GROUP,
      `${CONSUMER}_${shardId}`, // unique consumer per shard
      'BLOCK',
      5000,
      'COUNT',
      10,
      'STREAMS',
      STREAM,
      '>'
    );

    if (!data) continue;

    const [, messages] = data[0];

    for (const message of messages) {
      const [id, fields] = message;

      const tenantId = fields[1];

      try {
        await incrementMetric(tenantId);

        await redis.xack(STREAM, GROUP, id);

      } catch (err) {
        console.error(`Worker error on shard ${shardId}:`, err);
      }
    }
  }
}

export async function processEvents() {
  await initGroup();

  // 🔥 start one worker per shard
  redisNodes.forEach((redis, index) => {
    processShard(redis, index);
  });
}

/*
Why Streams over Pub/Sub?
What happens if worker crashes?
Why use consumer groups?
What is ACK?

*/