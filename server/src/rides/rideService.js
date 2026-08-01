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

module.exports={createRideRequest,getRide,updateRide};
