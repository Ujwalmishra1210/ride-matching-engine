
const { parse } = require("dotenv");
const redis=require("../config/redis");

const DRIVERS_GEO_KEY='drivers:locations';
const DRIVER_STATE_PREFIX='driver:';

async function updateDriverLocation(driverId,lat,lng,heading,speed){
     
    await redis.geoadd(
        DRIVERS_GEO_KEY,
        lng,
        lat,
        driverId

    );
    console.log('HSET RUNNING');
    await redis.hset(
        `${DRIVER_STATE_PREFIX}${driverId}`,
        {
          lat,
          lng,
          heading,
          speed,
          status:'AVAILABLE',
          lastupdate:Date.now()
        }
    );
    console.log('HASH SAVED');
    
}

async function getNearbyDrivers(lat,lng,radiusKm=5){
   
      const results=await redis.call(
        'GEORADIUS',
        DRIVERS_GEO_KEY,
        lng,
        lat,
        radiusKm,
        'km',
        'WITHDIST',
        'WITHCOORD',
        'ASC',
        'COUNT',
        20

      );
      return results.map(([driverId,distStr,[lngStr,latStr]])=>(
                  {
                    driverId,
                    distanceKm:parseFloat(distStr),
                    lat:parseFloat(latStr),
                    lng:parseFloat(lngStr)
                  }


      ));
}
async function getDriverState(driverId){
        const data=await redis.hgetall(
          `${DRIVER_STATE_PREFIX}${driverId}`
        );
        if(Object.keys(data).length==0){
          return null;
        }
        return{
           lat:parseFloat(data.lat),
           lng:parseFloat(data.lng),
           heading:parseFloat(data.heading),
           speed:parseFloat(data.speed),
           status:data.status,
           lastupdate:Number(data.lastupdate)
        };
}

module.exports={updateDriverLocation,getNearbyDrivers,getDriverState};