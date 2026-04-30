import redis from '../../../common/redis.js';
// import redisNodes from '../../../common/redisPool.js';
// import { hash } from './hash.js';

export function getRedisClient() {
    // const index = hash(tenantId) % redisNodes.length;
    // return redisNodes[index];
    return redis
}

