import Fastify from 'fastify';
import apiRoutes from './src/routes/api.js';
import debugRoutes from './src/routes/debug.js';

const fastify = Fastify({ logger: true });

fastify.register(apiRoutes);
fastify.register(debugRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();