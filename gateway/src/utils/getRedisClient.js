import redisNodes from '../../../common/redisPool.js';
import { hash } from './hash.js';

export function getRedisClient(tenantId) {
    const index = hash(tenantId) % redisNodes.length;
    return redisNodes[index];
}

