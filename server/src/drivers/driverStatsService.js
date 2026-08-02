const redis = require("../config/redis");

function getStatsKey(driverId) {
    return `driver:${driverId}:stats`;
}

async function incrementAcceptedTrips(driverId) {
    await redis.hincrby(getStatsKey(driverId), "acceptedTrips", 1);
}

async function incrementRejectedTrips(driverId) {
    await redis.hincrby(getStatsKey(driverId), "rejectedTrips", 1);
}

async function incrementCompletedTrips(driverId) {
    await redis.hincrby(getStatsKey(driverId), "completedTrips", 1);
}

async function incrementCancelledTrips(driverId) {
    await redis.hincrby(getStatsKey(driverId), "cancelledTrips", 1);
}

async function getDriverStats(driverId) {
    return await redis.hgetall(getStatsKey(driverId));
}

module.exports = {
    incrementAcceptedTrips,
    incrementRejectedTrips,
    incrementCompletedTrips,
    incrementCancelledTrips,
    getDriverStats
};