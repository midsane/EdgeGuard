import Redis from "ioredis";

let cluster;

export function getRedisClient() {
  if (cluster) return cluster;

  cluster = new Redis.Cluster(
    [
      {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    ],
    {
      dnsLookup: (address, callback) => callback(null, address),

      redisOptions: {
        tls: {},                  // REQUIRED
        enableReadyCheck: false,  // IMPORTANT
        maxRetriesPerRequest: 1,
      },

      slotsRefreshTimeout: 2000,
      slotsRefreshInterval: 2000,

      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 100,
      retryDelayOnTryAgain: 100,

      maxRetriesPerRequest: 2,
    }
  );

  cluster.on("error", (err) => {
    console.error("👀 Redis Cluster Error:", err.message);
  });

  cluster.on("connect", () => {
    console.log("Redis cluster connected");
  });

  return cluster;
}