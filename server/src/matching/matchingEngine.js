const redis=require('../config/redis');

const {DRIVER_STATES}=require('../drivers/driverState');

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
    finalizeDriverAssignment
} = require("./reservationService");

const {waitForDriverResponse}=require('./offerService');
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
       if (ride.status !== "DRIVER_ASSIGNED") {
        return {
            success: false,
            reason: "INVALID_RIDE_STATE"
        };
    }
       await updateRide(rideId,{
        status:"COMPLETED"
       });
       const driverId=ride.assignedDriverId;
       await releaseDriver(driverId);
       await incrementCompletedTrips(driverId);
       await recordRideCompleted();
       return{
        success:true,
        rideId,
        driverId
       };
}

async function releaseDriver(driverId) {

    const driver = await redis.hgetall(
        `${DRIVER_STATE_PREFIX}${driverId}`
    );

    if (Object.keys(driver).length === 0) {
        return false;
    }

    await redis.hset(
        `${DRIVER_STATE_PREFIX}${driverId}`,
        {
            status: DRIVER_STATES.AVAILABLE,
            currentRideId: "",
            lastUpdate: Date.now()
        }
    );

    return true;
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

        await releaseDriver(ride.assignedDriverId);
    
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
async function dispatchRide(ride){
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
        if(candidates.length==0){
             
            await updateRide(ride.rideId,{
                  status:"NO_DRIVERS_FOUND"
            });
            await recordFailedMatch();

            await recordDispatchTime(
                Date.now() - dispatchStartTime
            );
            return{
                success:false,
                reason:"NO_DRIVERS"
            };
        }
         for(const candidate of candidates){
            const reserved = await reserveDriver(
                candidate.driverId,
                ride.rideId
            );
        
            if(!reserved){
                continue;
            }
        
            attemptedDriverIds.push(candidate.driverId);
        
            await updateRide(ride.rideId, {
                attemptedDriverIds:
                    JSON.stringify(attemptedDriverIds)
            });

            if(!reserved){
                continue;
            }
            console.log(`Offering ride ${ride.rideId} to ${candidate.driverId}`);
            const sent = await sendRideOffer(
                candidate.driverId,
                ride
            );
            
            if(!sent){
                await releaseDriver(candidate.driverId);
                continue;
            }
            
            const accepted = await waitForDriverResponse(candidate.driverId);
            console.log(`${candidate.driverId} response: ${accepted}`);

if(!accepted){
    await releaseDriver(candidate.driverId);
    continue;
}


// Check latest ride state before assignment
const latestRide = await getRide(ride.rideId);

if (latestRide.status !== "SEARCHING") {

    await releaseDriver(candidate.driverId);

    await recordFailedMatch();

    await recordDispatchTime(
        Date.now() - dispatchStartTime
    );

    return {
        success: false,
        reason: "RIDE_NOT_AVAILABLE"
    };
}


const result = await finalizeDriverAssignment(
    ride.rideId,
    candidate.driverId
);

if (!result.success) {

    console.log(
        `Assignment failed for ride ${ride.rideId}: ${result.reason}`
    );

    /*
     * The reservation may have been lost because
     * the ride was cancelled or another operation
     * changed the driver.
     *
     * Do not blindly release the driver here.
     * The atomic assignment operation already verified
     * ownership of the reservation.
     */
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
        candidate.driverId
    );

    continue;
}

await recordSuccessfulMatch();

await recordDispatchTime(
    Date.now() - dispatchStartTime
);

return result;
            



            
           
         }
        await recordFailedMatch();

        await recordDispatchTime(
            Date.now() - dispatchStartTime
        );
         return {
             success:false,
             reason:"NO_AVAILABLE_DRIVER"
         };

}



module.exports = {
    dispatchRide,
    findCandidateDrivers,
    completeRide,
    cancelRideRequest,
    releaseDriver
};