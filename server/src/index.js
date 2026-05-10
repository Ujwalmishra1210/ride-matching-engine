require('dotenv').config();

const express=require('express');
const http=require('http');
require('./config/redis');
const {createWebSocketServer}=require("./websocket/wsServer");
const {getNearbyDrivers}=require('./location/locationService');
const app=express();

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
const server=http.createServer(app);
createWebSocketServer(server);
const PORT=process.env.PORT||8080;

server.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});

