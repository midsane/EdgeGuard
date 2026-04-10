import redis from '../utils/redis.js';

const luaScript = `
local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "timestamp")

local tokens = tonumber(data[1])
local last_time = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last_time = now
end

local delta = math.max(0, now - last_time)
local refill = delta * refill_rate

tokens = math.min(capacity, tokens + refill)

local allowed = tokens >= 1

if allowed then
  tokens = tokens - 1
end

redis.call("HMSET", key,
  "tokens", tokens,
  "timestamp", now
)

redis.call("EXPIRE", key, 60)

return allowed and 1 or 0
`;

export async function checkRateLimit(key, capacity, refillRate) {
  const now = Math.floor(Date.now() / 1000);

  const start = Date.now();

  const result = await redis.eval(
    luaScript,
    1,
    key,
    capacity,
    refillRate,
    now
  );

  const latency = Date.now() - start;

  return {
    allowed: result === 1,
    latency
  };
}