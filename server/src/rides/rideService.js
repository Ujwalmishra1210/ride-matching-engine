const redis = require('../config/redis');
const crypto = require("crypto");
const dashboardEventBus = require("../websocket/dashboardEventBus");
const {
    canTransitionRideState
} = require("./rideState");


async function createRideRequest({
    riderId,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng
}) {

    const rideId = crypto.randomUUID();

    const ride = {
        rideId,
        riderId,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        status: "SEARCHING",
        assignedDriverId: "",
        attemptedDriverIds: JSON.stringify([]),
        createdAt: Date.now()
    };

    await redis.hset(
        `ride:${rideId}`,
        ride
    );
    dashboardEventBus.emit("RIDE_UPDATED", ride);

    
    return ride;
}


async function getRide(rideId) {

    return redis.hgetall(
        `ride:${rideId}`
    );

}


async function updateRide(rideId, updates) {

    const rideKey =
        `ride:${rideId}`;

    const conn = redis.getTransactionClient();

    try {
        while (true) {

            await conn.watch(
                rideKey
            );

            const ride =
                await conn.hgetall(
                    rideKey
                );

            if (
                Object.keys(ride).length === 0
            ) {

                await conn.unwatch();

                throw new Error(
                    "RIDE_NOT_FOUND"
                );
            }


            if (updates.status) {

                const valid =
                    canTransitionRideState(
                        ride.status,
                        updates.status
                    );

                if (!valid) {

                    await conn.unwatch();

                    throw new Error(
                        `INVALID_RIDE_TRANSITION: ${ride.status} -> ${updates.status}`
                    );
                }
            }


            const tx =
                conn.multi();

            tx.hset(
                rideKey,
                updates
            );


            const result =
                await tx.exec();


                if (result !== null) {

                    dashboardEventBus.emit("RIDE_UPDATED", {
                        ...ride,
                        ...updates,
                        rideId
                    });
    
                    return true;
                }

            /*
             * Another process changed
             * the ride after WATCH.
             *
             * Retry using the latest state.
             */
        }
    } finally {
        conn.disconnect();
    }
}


async function cancelRide(rideId) {

    const ride =
        await getRide(rideId);

    if (
        Object.keys(ride).length === 0
    ) {

        return null;
    }


    await updateRide(
        rideId,
        {
            status: "CANCELLED"
        }
    );


    return {
        ...ride,
        status: "CANCELLED"
    };

}


async function rideExists(rideId) {

    const exists =
        await redis.exists(
            `ride:${rideId}`
        );

    return exists === 1;

}


async function getAllRideIds() {

    const keys = await redis.keys("ride:*");

    return keys
        .filter(key => !key.startsWith("ride:dispatch-lock:"))
        .map(key => key.replace("ride:", ""));
}


module.exports = {
    createRideRequest,
    getRide,
    updateRide,
    cancelRide,
    rideExists,
    getAllRideIds
};