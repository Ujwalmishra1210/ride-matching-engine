const WebSocket=require('ws');
const crypto = require('crypto');
const { type } = require('os');
function randomLat(){
   return 19.0 +Math.random()*0.2;
}
function randomLng(){
   return 72.8+Math.random()*0.2;
}
async function runSimulator(numDrivers=5){
     console.log(`Started simulation with ${numDrivers} drivers`);

     for(let i=0;i<numDrivers;i++){
        const ws=new WebSocket('ws://localhost:8080');
        
        ws.on('open',()=>{
            const driverId=`drv_${crypto.randomUUID().slice(0,8)}`;
            ws.send(JSON.stringify({
               type:'REGISTER',
               driverId
            }));
             
         setInterval(()=>{
             ws.send(JSON.stringify(
               {
                  type:'LOCATION_UPDATE',
                  driverId,
                  lat:randomLat(),
                  lng:randomLng()
               }
             ));


         },2000);

        });


     }


}
module.exports={runSimulator};