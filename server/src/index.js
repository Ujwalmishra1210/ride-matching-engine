require('dotenv').config();

const express=require('express');
const http=require('http');
const redis = require('./config/redis');
const {createWebSocketServer}=require("./websocket/wsServer");
const {getNearbyDrivers,getDriverState,updateDriverState}=require('./location/locationService');
const {dispatchRide}=require('./matching/matchingEngine');
const {createRideRequest,getRide}=require('./rides/rideService');
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
app.post('api/rides/request',async (req,res)=>{
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
const server=http.createServer(app);
createWebSocketServer(server);
const PORT=process.env.PORT||8080;

server.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});



