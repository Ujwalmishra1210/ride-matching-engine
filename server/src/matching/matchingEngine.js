const redis=require('../config/redis');

const {DRIVER_STATES}=require('../drivers/driverState');
const {
    acquireDispatchLock,
    renewDispatchLock,
    releaseDispatchLock
} = require("./dispatchLockService");
const {
    incrementCompletedTrips,
    incrementCancelledTrips
} = require("../drivers/driverStatsService");
const {
    recordRideRequest,
    recordSuccessfulMatch,
    recordFailedMatch,
    recordRideCompleted,
    recordRideCancelled,
    recordDispatchTime
} = require("../metrics/dispatchMetricsService");
const {
    updateRide,
    getRide,
    cancelRide
} = require("../rides/rideService");

const DRIVERS_GEO_KEY = "drivers:locations";
const DRIVER_STATE_PREFIX = "driver:";   
const {
    reserveDriver,
    finalizeDriverAssignment,
    startTrip
} = require("./reservationService");

const {
    waitForDriverResponse,
    removePendingOffer
} = require("./offerService");
const {
    sendRideOffer
} = require('../websocket/wsServer');
const {
    updateDriverState
} = require("../location/locationService");
async function findCandidateDrivers(lat,lng,radiusKm = 5,
    excludedDriverIds = []){
       
    const nearbyDrivers=await redis.georadius(
        DRIVERS_GEO_KEY,
        lng,
        lat,
        radiusKm,
        "km",
        "WITHDIST",
        "ASC",
        "COUNT",
        20
    );
    const candidates=[];
    const excluded = new Set(excludedDriverIds);
    for(const [driverId,distStr] of nearbyDrivers){
        if (excluded.has(driverId)) {
            continue;
        }
        const driverData=await redis.hgetall(
            `${DRIVER_STATE_PREFIX}${driverId}`
        );
        if(Object.keys(driverData).length===0){
            continue;
        }
        if(driverData.status!==DRIVER_STATES.AVAILABLE){
            continue;
        }
        candidates.push({
            driverId,
            distanceKm:parseFloat(distStr)
        });
    }

       return candidates;

}



async function completeRide(rideId){

       const ride = await getRide(rideId);
       if(Object.keys(ride).length===0){

            return {
                success:false,
                reason:"RIDE_NOT_FOUND"
            };
       }
       if (ride.status !== "ON_TRIP") {
        return {
            success: false,
            reason: "INVALID_RIDE_STATE"
        };
    }
       await updateRide(rideId,{
        status:"COMPLETED"
       });
       const driverId=ride.assignedDriverId;
       await releaseDriver(driverId, rideId);
       await incrementCompletedTrips(driverId);
       await recordRideCompleted();
       return{
        success:true,
        rideId,
        driverId
       };
}

async function releaseDriver(driverId, rideId) {

    const driverKey =
        `${DRIVER_STATE_PREFIX}${driverId}`;

    const conn = redis.getTransactionClient();

    try {
        while (true) {

            await conn.watch(driverKey);

            const driver =
                await conn.hgetall(driverKey);

            if (Object.keys(driver).length === 0) {
                await conn.unwatch();
                return false;
            }

            /*
             * Only the ride that currently owns the driver
             * is allowed to release it.
             */
            if (driver.currentRideId !== rideId) {
                await conn.unwatch();

                return false;
            }

            const tx = conn.multi();

            tx.hset(driverKey, {
                status: DRIVER_STATES.AVAILABLE,
                currentRideId: "",
                lastUpdate: Date.now()
            });

            const result = await tx.exec();

            if (result !== null) {
                return true;
            }

            /*
             * WATCH conflict.
             * Retry with fresh state.
             */
        }
    } finally {
        conn.disconnect();
    }
}
async function cancelRideRequest(rideId) {

    const ride = await getRide(rideId);

    if (Object.keys(ride).length === 0) {
        return {
            success: false,
            reason: "RIDE_NOT_FOUND"
        };
    }

    if (
        ride.status !== "SEARCHING" &&
        ride.status !== "DRIVER_ASSIGNED"
    ) {
        return {
            success: false,
            reason: "INVALID_RIDE_STATE"
        };
    }

    if (ride.assignedDriverId) {

        await releaseDriver(
            ride.assignedDriverId,
            rideId
        );
    
        await incrementCancelledTrips(
            ride.assignedDriverId
        );
    
    }

    await cancelRide(rideId);
    await recordRideCancelled();
    return {
        success: true,
        rideId
    };
}
async function dispatchRide(ride) {

    const lock = await acquireDispatchLock(ride.rideId);

    if (!lock) {

        console.log(
            `Dispatch already in progress for ride ${ride.rideId}`
        );

        return {
            success: false,
            reason: "DISPATCH_IN_PROGRESS"
        };
    }

    const lockRenewalInterval = setInterval(
        async () => {

            try {

                const renewed =
                    await renewDispatchLock(lock);

                if (!renewed) {

                    console.warn(
                        `Dispatch lock lost for ride ${ride.rideId}`
                    );

                }

            } catch (error) {

                console.error(
                    `Failed to renew dispatch lock for ride ${ride.rideId}:`,
                    error.message
                );

            }

        },
        10000
    );

    try {

        await recordRideRequest();

        const dispatchStartTime = Date.now();

        const attemptedDriverIds =
            ride.attemptedDriverIds
                ? JSON.parse(ride.attemptedDriverIds)
                : [];

        const candidates = await findCandidateDrivers(
            ride.pickupLat,
            ride.pickupLng,
            5,
            attemptedDriverIds
        );

        if (candidates.length === 0) {

            await updateRide(ride.rideId, {
                status: "NO_DRIVERS_FOUND"
            });

            await recordFailedMatch();

            await recordDispatchTime(
                Date.now() - dispatchStartTime
            );

            return {
                success: false,
                reason: "NO_DRIVERS"
            };
        }

        for (const candidate of candidates) {

            const reserved = await reserveDriver(
                candidate.driverId,
                ride.rideId
            );

            if (!reserved) {
                continue;
            }

            attemptedDriverIds.push(
                candidate.driverId
            );

            await updateRide(ride.rideId, {
                attemptedDriverIds:
                    JSON.stringify(attemptedDriverIds)
            });

            console.log(
                `Offering ride ${ride.rideId} to ${candidate.driverId}`
            );

            const responsePromise = waitForDriverResponse(
                candidate.driverId,
                ride.rideId
            );
            
            const sent = await sendRideOffer(
                candidate.driverId,
                ride
            );
            
            if (!sent) {

                removePendingOffer(
                    candidate.driverId
                );
            
                await releaseDriver(
                    candidate.driverId,
                    ride.rideId
                );
            
                continue;
            }
            
            const accepted = await responsePromise;

            console.log(
                `${candidate.driverId} response: ${accepted}`
            );

            if (!accepted) {

                await releaseDriver(
                    candidate.driverId,
                    ride.rideId
                );

                continue;
            }

            const latestRide =
                await getRide(ride.rideId);

            if (latestRide.status !== "SEARCHING") {

                await releaseDriver(
                    candidate.driverId,
                    ride.rideId
                );

                await recordFailedMatch();

                await recordDispatchTime(
                    Date.now() - dispatchStartTime
                );

                return {
                    success: false,
                    reason: "RIDE_NOT_AVAILABLE"
                };
            }

            const result =
                await finalizeDriverAssignment(
                    ride.rideId,
                    candidate.driverId
                );

            if (!result.success) {

                console.log(
                    `Assignment failed for ride ${ride.rideId}: ${result.reason}`
                );

                if (
                    result.reason === "RIDE_NOT_AVAILABLE" ||
                    result.reason === "DRIVER_RESERVATION_LOST"
                ) {

                    await recordFailedMatch();

                    await recordDispatchTime(
                        Date.now() - dispatchStartTime
                    );

                    return {
                        success: false,
                        reason: result.reason
                    };
                }

                await releaseDriver(
                    candidate.driverId,
                    ride.rideId
                );

                continue;
            }

            await recordSuccessfulMatch();

            await recordDispatchTime(
                Date.now() - dispatchStartTime
            );

            return result;
        }

        await updateRide(ride.rideId, {
            status: "NO_DRIVERS_FOUND"
        });
        
        await recordFailedMatch();
        
        await recordDispatchTime(
            Date.now() - dispatchStartTime
        );
        
        return {
            success: false,
            reason: "NO_AVAILABLE_DRIVER"
        };

    } finally {

        clearInterval(
            lockRenewalInterval
        );

        await releaseDispatchLock(lock);
    }
}


module.exports = {
    dispatchRide,
    findCandidateDrivers,
    completeRide,
    cancelRideRequest,
    releaseDriver,
    startTrip
};