import rateLimiter from '../middleware/rateLimiter.js';
import { addEvent } from '../services/eventBuffer.js';

export default async function (fastify, opts) {
  fastify.get(
    '/api',
    { preHandler: rateLimiter },
    async (req, reply) => {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      // addEvent({ tenant: tenantId, status: 'success' });
      return { success: true };
    }
  );
}