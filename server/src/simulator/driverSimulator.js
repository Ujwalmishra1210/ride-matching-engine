const WebSocket=require('ws');
const crypto = require('crypto');
const { type } = require('os');

const MUMBAI_BOUNDS={
   lat:{
      min:18.90,
      max:19.20
   },
   lng:{
      min:72.78,
      max:72.98
   }


};
function randomInRange(min,max){
     return min+Math.random()*(max-min);
}
function createDriver(){
     
     return {
      driverId:`drv_${crypto.randomUUID().slice(0,8)}`,
      lat:randomInRange(MUMBAI_BOUNDS.lat.min,MUMBAI_BOUNDS.lat.max),
      lng:randomInRange(MUMBAI_BOUNDS.lng.min,MUMBAI_BOUNDS.lng.max),
      heading:Math.floor(Math.random()*360),
      speed:20+Math.random()*(40)


     };


}
function movePosition(lat,lng,heading,speedKmh){

       const distKm=(speedKmh/3600)*2;
       const headingrad=heading*(Math.PI/180);
       const R=6371;
       let newlat=lat+(distKm/R)*(180/Math.PI)*(Math.cos(headingrad));
       let newlng=lng+(distKm/R)*(180/Math.PI)*(Math.sin(headingrad));
       let bounced=false;
      //  clamping
       if(newlat<MUMBAI_BOUNDS.lat.min){
         newlat=MUMBAI_BOUNDS.lat.min;
         bounced=true;
       }
       if(newlat>MUMBAI_BOUNDS.lat.max){
         newlat=MUMBAI_BOUNDS.lat.max;
         bounced=true;
       }
       if(newlng<MUMBAI_BOUNDS.lng.min){
         newlng=MUMBAI_BOUNDS.lng.min;
         bounced=true;
       }
       if(newlng>MUMBAI_BOUNDS.lng.max){
         newlng=MUMBAI_BOUNDS.lng.max;
         bounced=true;
       }
       const newheading=bounced?(heading+180)%360:heading;
       return {
         lat:newlat,
         lng:newlng,
         heading:newheading,

       };
       

}


async function runSimulator(numDrivers=5){
     console.log(`Started simulation with ${numDrivers} drivers`);

     for(let i=0;i<numDrivers;i++){
        const ws=new WebSocket('ws://localhost:8080');
        
        ws.on('open',()=>{
            const driver=createDriver();
            ws.send(JSON.stringify({
               type:'REGISTER',
               driverId:driver.driverId
            }));
             
         setInterval(()=>{
              const moved=movePosition(driver.lat,driver.lng,driver.heading,driver.speed);

              
             ws.send(JSON.stringify(
               {
                  type:'LOCATION_UPDATE',
                  driverId:driver.driverId,
                  lat:moved.lat,
                  lng:moved.lng,
                  heading:moved.heading,
                  speed:driver.speed
               }
             ));


         },2000);

        });


     }


}
module.exports={runSimulator};