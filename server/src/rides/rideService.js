const redis=require('../config/redis');
const crypto = require("crypto");
const {
    canTransitionRideState
} = require("./rideState");
async function createRideRequest({
    riderId,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng

}){
     const rideId = crypto.randomUUID();
        const ride={
           rideId,
           riderId,
           pickupLat,
           pickupLng,
           dropLat,
           dropLng,
           status:"SEARCHING",
           assignedDriverId:"",
           attemptedDriverIds: JSON.stringify([]),
           createdAt:Date.now()

        };
       await redis.hset(`ride:${rideId}`,ride);

       return ride;

}
async function getRide(rideId){
     return redis.hgetall(`ride:${rideId}`);
}

async function updateRide(rideId, updates) {

    const ride = await getRide(rideId);

    if (Object.keys(ride).length === 0) {
        throw new Error("RIDE_NOT_FOUND");
    }

    if (updates.status) {

        const valid = canTransitionRideState(
            ride.status,
            updates.status
        );

        if (!valid) {
            throw new Error(
                `INVALID_RIDE_TRANSITION: ${ride.status} -> ${updates.status}`
            );
        }
    }

    await redis.hset(
        `ride:${rideId}`,
        updates
    );
}
async function cancelRide(rideId) {

     const ride = await getRide(rideId);
 
     if (Object.keys(ride).length === 0) {
         return null;
     }
 
     await updateRide(rideId, {
         status: "CANCELLED"
     });
 
     return {
         ...ride,
         status: "CANCELLED"
     };
 }
 
 async function rideExists(rideId) {
 
     const exists = await redis.exists(`ride:${rideId}`);
 
     return exists === 1;
 }

 async function getAllRideIds() {

    const keys = await redis.keys("ride:*");

    return keys.map(key => key.replace("ride:", ""));

}
module.exports = {
    createRideRequest,
    getRide,
    updateRide,
    cancelRide,
    rideExists,
    getAllRideIds
};