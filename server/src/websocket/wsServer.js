const WebSocket = require("ws");

const {
    updateDriverLocation
} = require("../location/locationService");
const dashboardEventBus =
    require("./dashboardEventBus");
const connectedDrivers = new Map();

const {
    acceptOffer,
    rejectOffer,
    removePendingOffer
} = require("../matching/offerService");

const {
    estimateDriverEta
} = require("../eta/etaService");


function createWebSocketServer(httpServer) {

    const wss = new WebSocket.Server({
        server: httpServer
    });
    const dashboardClients = new Set();

    dashboardEventBus.on(
    "DRIVER_UPDATED",
    (driver) => {
        const message =
            JSON.stringify({
                type: "DRIVER_UPDATED",
                driver
            });

        for (const client of dashboardClients) {
            if (
                client.readyState === WebSocket.OPEN
            ) {
                client.send(message);
            }
        }
    }
    );
    dashboardEventBus.on(
        "RIDE_UPDATED",
        (ride) => {
            const message =
                JSON.stringify({
                    type: "RIDE_UPDATED",
                    ride
                });
    
            for (const client of dashboardClients) {
                if (
                    client.readyState === WebSocket.OPEN
                ) {
                    client.send(message);
                }
            }
        }
        );
    wss.on("connection", (ws) => {

        let driverId = null;

        console.log("New socket connection");


        ws.on("message", async (rawMessage) => {

            try {

                const msg = JSON.parse(rawMessage);


                // =========================
                // DRIVER REGISTRATION
                // =========================

                if (msg.type === "REGISTER") {

                    if (msg.role === "DASHBOARD") {
                
                        dashboardClients.add(ws);
                
                        console.log(
                            `Dashboard connected. Total dashboards: ${dashboardClients.size}`
                        );
                
                        return;
                    }
                
                    driverId = msg.driverId;
                
                    connectedDrivers.set(
                        driverId,
                        ws
                    );
                
                    console.log(
                        `Driver registered: ${driverId}`
                    );
                
                    console.log(
                        `Total drivers: ${connectedDrivers.size}`
                    );
                
                    return;
                }


                // =========================
                // LOCATION UPDATE
                // =========================

                if (msg.type === "LOCATION_UPDATE") {

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

                    return;
                }


                // =========================
                // ACCEPT RIDE
                // =========================

                if (msg.type === "ACCEPT_RIDE") {

                    if (
                        !msg.driverId ||
                        !msg.rideId
                    ) {

                        console.warn(
                            "Invalid ACCEPT_RIDE message"
                        );

                        return;
                    }

                    await acceptOffer(
                        msg.driverId,
                        msg.rideId
                    );

                    return;
                }


                // =========================
                // REJECT RIDE
                // =========================

                if (msg.type === "REJECT_RIDE") {

                    if (
                        !msg.driverId ||
                        !msg.rideId
                    ) {

                        console.warn(
                            "Invalid REJECT_RIDE message"
                        );

                        return;
                    }

                    await rejectOffer(
                        msg.driverId,
                        msg.rideId
                    );

                    return;
                }


            } catch (err) {

                console.error(
                    "WebSocket message error:",
                    err.message
                );

            }

        });


        // =========================
        // DRIVER DISCONNECTED
        // =========================

        ws.on("close", () => {

            if (!driverId) {
                dashboardClients.delete(ws);
                return;
            }
        
            connectedDrivers.delete(driverId);
        
            removePendingOffer(driverId);
        
            console.log(
                `Driver disconnected: ${driverId}`
            );
        
            console.log(
                `Remaining drivers: ${connectedDrivers.size}`
            );
        });


        ws.on("error", (err) => {

            console.error(
                `WebSocket error for ${driverId || "unknown driver"}:`,
                err.message
            );

        });

    });

}


// =========================
// SEND RIDE OFFER
// =========================

async function sendRideOffer(driverId, ride) {

    const ws =
        connectedDrivers.get(driverId);

    if (!ws) {
        return false;
    }

    if (ws.readyState !== WebSocket.OPEN) {
        return false;
    }

    const eta =
        await estimateDriverEta(
            driverId,
            ride.pickupLat,
            ride.pickupLng
        );

    ws.send(
        JSON.stringify({
            type: "RIDE_OFFER",
            ride,
            eta
        })
    );

    return true;
}


module.exports = {
    createWebSocketServer,
    connectedDrivers,
    sendRideOffer
};