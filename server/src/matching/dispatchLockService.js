const crypto = require("crypto");
const redis = require("../config/redis");

const DISPATCH_LOCK_PREFIX = "dispatch-lock:";
const DISPATCH_LOCK_TTL_MS = 30000;

async function acquireDispatchLock(rideId) {

    const lockKey =
        `${DISPATCH_LOCK_PREFIX}${rideId}`;

    const token =
        crypto.randomUUID();

    const result = await redis.set(
        lockKey,
        token,
        "PX",
        DISPATCH_LOCK_TTL_MS,
        "NX"
    );

    if (result !== "OK") {
        return null;
    }

    return {
        lockKey,
        token
    };
}

async function renewDispatchLock(lock) {

    const result = await redis.eval(
        `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        end

        return 0
        `,
        1,
        lock.lockKey,
        lock.token,
        DISPATCH_LOCK_TTL_MS
    );

    return result === 1;
}

async function releaseDispatchLock(lock) {

    if (!lock) {
        return;
    }

    await redis.eval(
        `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        end

        return 0
        `,
        1,
        lock.lockKey,
        lock.token
    );
}

module.exports = {
    acquireDispatchLock,
    renewDispatchLock,
    releaseDispatchLock
};