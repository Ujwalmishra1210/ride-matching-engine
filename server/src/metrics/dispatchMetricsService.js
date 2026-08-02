const redis = require("../config/redis");

const METRICS_KEY = "dispatch:metrics";

async function recordRideRequest() {
    await redis.hincrby(
        METRICS_KEY,
        "totalRideRequests",
        1
    );
}

async function recordSuccessfulMatch() {
    await redis.hincrby(
        METRICS_KEY,
        "successfulMatches",
        1
    );
}

async function recordFailedMatch() {
    await redis.hincrby(
        METRICS_KEY,
        "failedMatches",
        1
    );
}

async function recordRideCompleted() {
    await redis.hincrby(
        METRICS_KEY,
        "completedRides",
        1
    );
}

async function recordRideCancelled() {
    await redis.hincrby(
        METRICS_KEY,
        "cancelledRides",
        1
    );
}

async function recordDispatchTime(ms) {

    await redis.hincrbyfloat(
        METRICS_KEY,
        "totalDispatchTimeMs",
        ms
    );

    await redis.hincrby(
        METRICS_KEY,
        "dispatchCount",
        1
    );

}

async function recordDriverResponseTime(ms) {

    await redis.hincrbyfloat(
        METRICS_KEY,
        "totalDriverResponseTimeMs",
        ms
    );

    await redis.hincrby(
        METRICS_KEY,
        "driverResponseCount",
        1
    );

}

async function getMetrics() {

    const data = await redis.hgetall(
        METRICS_KEY
    );

    const dispatchCount =
        Number(data.dispatchCount || 0);

    const responseCount =
        Number(data.driverResponseCount || 0);

    return {

        totalRideRequests:
            Number(data.totalRideRequests || 0),

        successfulMatches:
            Number(data.successfulMatches || 0),

        failedMatches:
            Number(data.failedMatches || 0),

        completedRides:
            Number(data.completedRides || 0),

        cancelledRides:
            Number(data.cancelledRides || 0),

        averageDispatchTimeMs:

            dispatchCount === 0
                ? 0
                : Number(data.totalDispatchTimeMs) /
                  dispatchCount,

        averageDriverResponseTimeMs:

            responseCount === 0
                ? 0
                : Number(data.totalDriverResponseTimeMs) /
                  responseCount

    };

}

module.exports = {
    recordRideRequest,
    recordSuccessfulMatch,
    recordFailedMatch,
    recordRideCompleted,
    recordRideCancelled,
    recordDispatchTime,
    recordDriverResponseTime,
    getMetrics
};