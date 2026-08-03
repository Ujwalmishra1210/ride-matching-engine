require('dotenv').config();

const express=require('express');
const http=require('http');
const redis = require('./config/redis');
const {createWebSocketServer}=require("./websocket/wsServer");
const {getNearbyDrivers,getDriverState,updateDriverState}=require('./location/locationService');
const {
    dispatchRide,
    completeRide,
    cancelRideRequest
} = require("./matching/matchingEngine");
const {createRideRequest,getRide}=require('./rides/rideService');
const { startHeartbeatMonitor } = require("./heartbeat/heartbeatService");
const {
    getDriverStats
} = require("./drivers/driverStatsService");
const {
    startRideTimeoutMonitor
} = require("./rides/rideTimeoutService");
const app=express();
app.use(express.json());
app.get('/',(req,res)=>{
    res.send("Ride Engine Running");
});
app.get('/api/nearby',async (req,res)=>{
 const {lat=19.07,lng=72.87,radius=5}=req.query;
 const start=Date.now();

 const drivers=await getNearbyDrivers(parseFloat(lat),parseFloat(lng),parseFloat(radius));
 const latencyMs=Date.now()-start;
 res.json({
    count:drivers.length,
    latencyMs,
    drivers

 });

});

app.get('/api/driver/:id',async (req,res)=>{

    const driver=await getDriverState(req.params.id);
    if(!driver){
        return res.status(404).json({error:"Driver not found"});
    }
    res.json(driver);
}
    
);
app.get('/api/driver/:id/stats', async (req, res) => {

    const stats = await getDriverStats(req.params.id);

    res.json({
        acceptedTrips: Number(stats.acceptedTrips || 0),
        rejectedTrips: Number(stats.rejectedTrips || 0),
        completedTrips: Number(stats.completedTrips || 0),
        cancelledTrips: Number(stats.cancelledTrips || 0)
    });

});
app.get('/debug/keys', async (req,res)=>{

    const keys = await redis.keys('*');
 
    res.json(keys);
 
 });
 app.get('/debug/flush', async (req,res)=>{

    await redis.flushall();
 
    res.json({
       success:true
    });
 
 });
app.post('/api/driver/:id/state',async (req,res)=>{
     const {state}=req.body;
     await updateDriverState(req.params.id,state);
     res.json({
        success:true,
        driverId:req.params.id,
        newState:state
     });
});
app.post('/api/rides/request',async (req,res)=>{
  try {
       const {
        riderId,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
       }=req.body;

       const ride=await createRideRequest(
        {
            riderId,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
        }
       );

       const result=await dispatchRide(ride);

       const updatedRide=await getRide(ride.rideId);

       res.json({
        dispatchResult:result,
        ride:updatedRide
       });


  } catch (error) {
     res.status(500).json(
        {
            error:"Internal error"
        }
     );
  }

});

app.post('/api/rides/:rideId/complete',async (req,res)=>{
         try {
             const result=await completeRide(req.params.rideId);

  if(!result.success){
         return res.status(404).json(result);
  }

  res.json(result);


         } catch (err) {
            return res.status(500).json({
                error:"Internal error"
            });
         }


});
app.post("/api/rides/:rideId/cancel", async (req, res) => {

    try {

        const result = await cancelRideRequest(req.params.rideId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (err) {

        res.status(500).json({
            error: "Internal error"
        });

    }

});
app.get('/api/rides/:rideId', async (req,res)=>{

    const ride = await getRide(req.params.rideId);

    if(Object.keys(ride).length === 0){
        return res.status(404).json({
            error:"Ride not found"
        });
    }

    res.json(ride);

});
const server=http.createServer(app);
createWebSocketServer(server);
startHeartbeatMonitor();
startRideTimeoutMonitor();
const PORT=process.env.PORT||8080;

server.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});



