const redis = require("../config/redis");

const {
    DRIVER_STATES
} = require("../drivers/driverState");

const DRIVER_STATE_PREFIX = "driver:";

async function reserveDriver(driverId, rideId) {

    const driverKey =
        `${DRIVER_STATE_PREFIX}${driverId}`;

    while (true) {

        await redis.watch(driverKey);

        const driver =
            await redis.hgetall(driverKey);

        if (
            Object.keys(driver).length === 0 ||
            driver.status !== DRIVER_STATES.AVAILABLE
        ) {
            await redis.unwatch();
            return false;
        }

        const tx = redis.multi();

        tx.hset(driverKey, {
            status: DRIVER_STATES.RESERVED,
            currentRideId: rideId,
            lastUpdate: Date.now()
        });

        const result = await tx.exec();

        if (result !== null) {
            return true;
        }
    }
}


/*
 * Atomically converts:
 *
 * driver: RESERVED -> ON_TRIP
 * ride:   SEARCHING -> DRIVER_ASSIGNED
 *
 * Only succeeds if both are still in the expected state.
 */
async function finalizeDriverAssignment(
    rideId,
    driverId
) {

    const driverKey =
        `${DRIVER_STATE_PREFIX}${driverId}`;

    const rideKey =
        `ride:${rideId}`;

    while (true) {

        await redis.watch(
            driverKey,
            rideKey
        );

        const [
            driver,
            ride
        ] = await Promise.all([
            redis.hgetall(driverKey),
            redis.hgetall(rideKey)
        ]);

        if (
            Object.keys(driver).length === 0 ||
            Object.keys(ride).length === 0
        ) {
            await redis.unwatch();

            return {
                success: false,
                reason: "NOT_FOUND"
            };
        }

        /*
         * The driver must still be reserved
         * for THIS exact ride.
         */
        if (
            driver.status !== DRIVER_STATES.RESERVED ||
            driver.currentRideId !== rideId
        ) {
            await redis.unwatch();

            return {
                success: false,
                reason: "DRIVER_RESERVATION_LOST"
            };
        }

        /*
         * The ride must still be searchable.
         */
        if (ride.status !== "SEARCHING") {
            await redis.unwatch();

            return {
                success: false,
                reason: "RIDE_NOT_AVAILABLE"
            };
        }

        const assignedAt = Date.now();

        const tx = redis.multi();

        tx.hset(driverKey, {
            status: DRIVER_STATES.ON_TRIP,
            currentRideId: rideId,
            lastUpdate: assignedAt
        });

        tx.hset(rideKey, {
            status: "DRIVER_ASSIGNED",
            assignedDriverId: driverId,
            assignedAt
        });

        const result = await tx.exec();

        if (result !== null) {
            return {
                success: true,
                driverId
            };
        }

        /*
         * Somebody changed either key.
         * Retry after WATCH conflict.
         */
    }
}

module.exports = {
    reserveDriver,
    finalizeDriverAssignment
};