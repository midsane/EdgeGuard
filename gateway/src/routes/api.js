import rateLimiter from '../middleware/rateLimiter.js';
import { pushEvent } from '../services/eventProducer.js';

export default async function (fastify, opts) {
  fastify.get(
    '/api',
    { preHandler: rateLimiter },
    async (req, reply) => {
      const tenantId = req.headers['x-tenant-id'] || 'default';

      await pushEvent(tenantId, "success");

      return { success: true };
    }
  );
}