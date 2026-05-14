const WebSocket = require('ws');
const { updateDriverLocation } =require('../location/locationService');
const connectedDrivers = new Map();

function createWebSocketServer(httpServer) {

  const wss = new WebSocket.Server({
    server: httpServer
  });

  wss.on('connection', (ws) => {

    console.log('New socket connection');

    ws.on('message', async (rawMessage) => {

      try {

        const msg = JSON.parse(rawMessage);

        if (msg.type === 'REGISTER') {

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

      } catch (err) {

        console.error(err.message);

      }

    });

  });

}

module.exports = {
  createWebSocketServer
};