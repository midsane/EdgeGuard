export default async function (fastify, opts) {
  fastify.get('/debug/health', async (req, reply) => {
    return {
      status: "ok",
      timestamp: Date.now()
    };
  });
}