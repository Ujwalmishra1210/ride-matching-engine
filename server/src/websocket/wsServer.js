const WebSocket = require('ws');
const { updateDriverLocation } =require('../location/locationService');
const connectedDrivers = new Map();
const {acceptOffer,rejectOffer}=require('../matching/offerService');
function createWebSocketServer(httpServer) {

  const wss = new WebSocket.Server({
    server: httpServer
  });

  wss.on('connection', (ws) => {
     let driverId=null;
    console.log('New socket connection');

    ws.on('message', async (rawMessage) => {

      try {

        const msg = JSON.parse(rawMessage);

        if (msg.type === 'REGISTER') {
          driverId=msg.driverId;
          connectedDrivers.set(msg.driverId, ws);

          console.log(
            `Driver registered: ${msg.driverId}`
          );

          console.log(
            `Total drivers: ${connectedDrivers.size}`
          );
        }
        if (msg.type === 'LOCATION_UPDATE') {

            await updateDriverLocation(
              msg.driverId,
              msg.lat,
              msg.lng,
              msg.heading,
              msg.speed
            );
          
            console.log(
              `Location updated for ${msg.driverId}`
            );
          
          }
          if(msg.type=='ACCEPT_RIDE'){
             acceptOffer(msg.driverId);
          }
          if(msg.type=='REJECT_RIDE'){
             rejectOffer(msg.driverId);
          }

      } catch (err) {

        console.error(err.message);

      }

    }
    
    );
  ws.on('close', () => {

    if(driverId){
 
       connectedDrivers.delete(driverId);
 
       console.log(
          `Driver disconnected: ${driverId}`
       );
 
       console.log(
          `Remaining drivers: ${connectedDrivers.size}`
       );
 
    }
 
 });
  });

}

function sendRideOffer(driverId,ride){

     const ws=connectedDrivers.get(driverId);

     if(!ws){
      return false;
     }
     ws.send(
      JSON.stringify({
         type:"RIDE_OFFER",
         ride
      }
      )
     );
     return true;


}

module.exports = {
  createWebSocketServer,connectedDrivers, sendRideOffer
};