const redis=require('../config/redis');

const {DRIVER_STATES}=require('../drivers/driverState');

const {updateDriverState}=require('../location/locationService');

const {updateRide}=require('../rides/rideService');

const DRIVERS_GEO_KEY = "drivers:locations";
const DRIVER_STATE_PREFIX = "driver:";   
const {
reserveDriver
} = require("./reservationService");

const {waitForDriverResponse}=require('./offerService');
const {
    sendRideOffer
} = require('../websocket/wsServer');
async function findCandidateDrivers(lat,lng,radiusKm=5){
       
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

    for(const [driverId,distStr] of nearbyDrivers){

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

async function assignDrivertoRide(ride,driverId){

        await redis.hset(
            `${DRIVER_STATE_PREFIX}${driverId}`,
            {
                status:DRIVER_STATES.ON_TRIP,
                currentRideId:ride.rideId,
                lastUpdate:Date.now()

            }
        );
     
        await updateRide(ride.rideId,{
            status:"DRIVER_ASSIGNED",
            assignedDriverId:driverId
        });

        return {
            success: true,
            driverId
          };

}

async function completeRide(rideId){

       const ride=await redis.hgetall(`ride:${rideId}`);
       if(Object.keys(ride).length===0){

            return {
                success:false,
                reason:"RIDE_NOT_FOUND"
            };
       }
       await updateRide(rideId,{
        status:"COMPLETED"
       });
       const driverId=ride.assignedDriverId;
       await redis.hset(`driver:${driverId}`,{
           status:DRIVER_STATES.AVAILABLE,
           currentRideId:"",
           lastUpdate:Date.now()
       });
       return
       {
        success:true,
        rideId,
        driverId
       };
}

async function releaseDriver(driverId){
        await redis.hset(
             `${DRIVER_STATE_PREFIX}${driverId}`,
             {
                status:DRIVER_STATES.AVAILABLE,
                currentRideId:"",
                lastUpdate:Date.now()
             }
        );
}
async function dispatchRide(ride){
        const candidates=await findCandidateDrivers(ride.pickupLat,ride.pickupLng);
        if(candidates.length==0){
             
            await updateRide(ride.rideId,{
                  status:"NO_DRIVERS_FOUND"
            });
            return{
                success:false,
                reason:"NO_DRIVERS"
            };
        }
         for(const candidate of candidates){
            const reserved=await reserveDriver(candidate.driverId,ride.rideId);

            if(!reserved){
                continue;
            }
            const sent=sendRideOffer(candidate.driverId,ride);
            if(!sent){
                await releaseDriver(candidate.driverId);
                continue;
            }
            const accepted=await waitForDriverResponse(candidate.driverId);
            if(!accepted){
                await releaseDriver(candidate.driverId);
                continue;
            }
            



            
            return assignDrivertoRide(ride,candidate.driverId);
         }
         return {
             success:false,
             reason:"NO_AVAILABLE_DRIVER"
         };

}



module.exports = {
    dispatchRide,
    findCandidateDrivers,
    completeRide
  };