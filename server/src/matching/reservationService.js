const redis = require("../config/redis");

const {
    DRIVER_STATES
} = require("../drivers/driverState");

const DRIVER_STATE_PREFIX = "driver:";
const dashboardEventBus =
    require("../websocket/dashboardEventBus");
async function reserveDriver(driverId, rideId) {

    const driverKey =
        `${DRIVER_STATE_PREFIX}${driverId}`;

    const conn = redis.getTransactionClient();

    try {
        while (true) {

            await conn.watch(driverKey);

            const driver =
                await conn.hgetall(driverKey);

            if (
                Object.keys(driver).length === 0 ||
                driver.status !== DRIVER_STATES.AVAILABLE
            ) {
                await conn.unwatch();
                return false;
            }

            const tx = conn.multi();

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
    } finally {
        conn.disconnect();
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

    const conn = redis.getTransactionClient();

    try {
        while (true) {

            await conn.watch(
                driverKey,
                rideKey
            );

            const [
                driver,
                ride
            ] = await Promise.all([
                conn.hgetall(driverKey),
                conn.hgetall(rideKey)
            ]);

            if (
                Object.keys(driver).length === 0 ||
                Object.keys(ride).length === 0
            ) {
                await conn.unwatch();

                return {
                    success: false,
                    reason: "NOT_FOUND"
                };
            }

            if (
                driver.status !== DRIVER_STATES.RESERVED ||
                driver.currentRideId !== rideId
            ) {
                await conn.unwatch();

                return {
                    success: false,
                    reason: "DRIVER_RESERVATION_LOST"
                };
            }

            if (ride.status !== "SEARCHING") {
                await conn.unwatch();

                return {
                    success: false,
                    reason: "RIDE_NOT_AVAILABLE"
                };
            }

            const assignedAt = Date.now();

            const tx = conn.multi();

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

    dashboardEventBus.emit("RIDE_UPDATED", {
        ...ride,
        rideId,
        status: "DRIVER_ASSIGNED",
        assignedDriverId: driverId,
        assignedAt
    });

    dashboardEventBus.emit("DRIVER_UPDATED", {
        ...driver,
        driverId,
        status: DRIVER_STATES.ON_TRIP,
        currentRideId: rideId,
        lastUpdate: assignedAt
    });

    return {
        success: true,
        driverId
    };
}
        }
    } finally {
        conn.disconnect();
    }
}

module.exports = {
    reserveDriver,
    finalizeDriverAssignment
};