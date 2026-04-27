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

import redis from '../../../common/redis.js'
import { incrementMetric } from '../services/metricService.js'

const STREAM = 'events_stream';
const GROUP = 'event_group';
const CONSUMER = 'consumer_1';

async function initGroup() {
  try {
    await redis.xgroup(
      'CREATE',
      STREAM,
      GROUP,
      '0',
      'MKSTREAM'
    );
    console.log('✅ Consumer group created');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}

export async function processEvents() {
  await initGroup();

  console.log('🚀 Worker started');

  while (true) {
    const data = await redis.xreadgroup(
      'GROUP',
      GROUP,
      CONSUMER,
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

        // ACK after success
        await redis.xack(STREAM, GROUP, id);

      } catch (err) {
        console.error('Worker error:', err);
      }
    }
  }
}


/*
Why Streams over Pub/Sub?
What happens if worker crashes?
Why use consumer groups?
What is ACK?

*/