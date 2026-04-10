import redis from '../../gateway/src/utils/redis.js';
import { incrementMetric } from '../services/metricsService.js';

export async function processEvents() {
  while (true) {
    const data = await redis.xread(
      'BLOCK', 0,
      'STREAMS', 'events_stream', '$'
    );

    if (data) {
      const [, messages] = data[0];

      for (const message of messages) {
        const [, fields] = message;

        const tenantId = fields[1];

        await incrementMetric(tenantId);

        console.log('Processed event:', fields);
      }
    }
  }
}