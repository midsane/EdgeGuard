/*Was needed to simulate multi redis nodes in local machine,
not needed anymore since we are using redis cluster via
ElastiCache (AWS) */


// import Redis from 'ioredis';

// const redisNodes = [
//   new Redis({
//     port: 6379,
//     host: "127.0.0.1",
//     maxRetriesPerRequest: 1,
//     enableReadyCheck: true,
//   }),
//   new Redis({
//     port: 6380,
//     host: "127.0.0.1",
//     maxRetriesPerRequest: 1,
//     enableReadyCheck: true,
//   }),
//   new Redis({
//     port: 6381,
//     host: "127.0.0.1",
//     maxRetriesPerRequest: 1,
//     enableReadyCheck: true,
//   }),
// ];

// export default redisNodes;