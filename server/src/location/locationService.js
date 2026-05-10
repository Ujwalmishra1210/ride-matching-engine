
const redis=require("../config/redis");

const DRIVERS_GEO_KEY='drivers:locations';


async function updateDriverLocation(driverId,lat,lng){
     
    await redis.geoadd(
        DRIVERS_GEO_KEY,
        lng,
        lat,
        driverId

    );
    
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

module.exports={updateDriverLocation,getNearbyDrivers};