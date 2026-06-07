const redis =require('../config/redis');

const {DRIVER_STATES}=require('../drivers/driverState');

const DRIVER_STATE_PREFIX='driver:';

async function reserveDriver(driverId,rideId) {
    
      const driverKey=`${DRIVER_STATE_PREFIX}${driverId}`;

      while(true){
        
        await redis.watch(driverKey);
        
        const driver=await redis.hgetall(driverKey);

        if( Object.keys(driver).length === 0 || driver.status!==DRIVER_STATES.AVAILABLE){
            await redis.unwatch();
            return false;
        }

         const tx=redis.multi();
         tx.hset(driverKey,{
              status:DRIVER_STATES.RESERVED,
              currentRideId:rideId,
              lastUpdate:Date.now()
         });
         const result=await tx.exec();

        if(result!==null){
            return true;
        }


      }

     

}
// using optimistic concurrency control to avoid race conditions 
// watch -multi-exec
module.exports={reserveDriver};