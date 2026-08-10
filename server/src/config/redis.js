const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
    console.log("Redis connected ");
});

redis.on('error', (err) => {
    console.error('Redis Error:', err);
});

// NEW: gives WATCH/MULTI/EXEC blocks their own connection so they
// can't be clobbered by another concurrent transaction on the shared client.
redis.getTransactionClient = () => redis.duplicate();

module.exports = redis;