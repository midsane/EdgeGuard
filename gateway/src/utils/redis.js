import Redis from 'ioredis';

const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: 1,   
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('👀 Redis Error:', err.message);
});

redis.on('connect', () => {
  console.log('𝔾𝕆𝕆𝔻 𝔹𝕆𝕐 Redis connected');
});

export default redis;