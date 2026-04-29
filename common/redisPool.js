import Redis from 'ioredis';

const redisNodes = [
  new Redis({ port: 6379 }),
  new Redis({ port: 6380 }),
  new Redis({ port: 6381 }),
];

export default redisNodes;