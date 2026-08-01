const redis=require('../config/redis');
const crypto = require("crypto");

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
           createdAt:Date.now()

        };
       await redis.hset(`ride:${rideId}`,ride);

       return ride;

}
async function getRide(rideId){
     return redis.hgetall(`ride:${rideId}`);
}

async function updateRide(rideId,updates){
     await redis.hset(`ride:${rideId}`,updates);
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
 module.exports = {
     createRideRequest,
     getRide,
     updateRide,
     cancelRide,
     rideExists
 };
