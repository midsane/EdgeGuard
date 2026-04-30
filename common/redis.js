import Redis from "ioredis";

const redis = new Redis.Cluster(
  [{
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  }],
  {
    redisOptions: {
      tls: {}
    }
  }
);

redis.on("error", (err) => {
  console.error("👀 Redis Error:", err.message);
});

redis.on("connect", () => {
  console.log("𝔾𝕆𝕆𝔻 𝔹𝕆𝕐 Redis connected");
});

export default redis;
