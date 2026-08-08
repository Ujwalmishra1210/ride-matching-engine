const WebSocket = require("ws");
const crypto = require("crypto");

const MUMBAI_BOUNDS = {
    lat: {
        min: 18.90,
        max: 19.20
    },
    lng: {
        min: 72.78,
        max: 72.98
    }
};

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function createDriver() {
    return {
        driverId: `drv_${crypto.randomUUID().slice(0, 8)}`,
        lat: randomInRange(
            MUMBAI_BOUNDS.lat.min,
            MUMBAI_BOUNDS.lat.max
        ),
        lng: randomInRange(
            MUMBAI_BOUNDS.lng.min,
            MUMBAI_BOUNDS.lng.max
        ),
        heading: Math.floor(Math.random() * 360),
        speed: 20 + Math.random() * 40
    };
}

function movePosition(lat, lng, heading, speedKmh) {

    const distKm = (speedKmh / 3600) * 2;

    const headingRad = heading * (Math.PI / 180);

    const R = 6371;

    let newLat =
        lat +
        (distKm / R) *
        (180 / Math.PI) *
        Math.cos(headingRad);

    let newLng =
        lng +
        ((distKm / R) *
            (180 / Math.PI) *
            Math.sin(headingRad)) /
        Math.cos(lat * Math.PI / 180);

    let bounced = false;

    if (newLat < MUMBAI_BOUNDS.lat.min) {
        newLat = MUMBAI_BOUNDS.lat.min;
        bounced = true;
    }

    if (newLat > MUMBAI_BOUNDS.lat.max) {
        newLat = MUMBAI_BOUNDS.lat.max;
        bounced = true;
    }

    if (newLng < MUMBAI_BOUNDS.lng.min) {
        newLng = MUMBAI_BOUNDS.lng.min;
        bounced = true;
    }

    if (newLng > MUMBAI_BOUNDS.lng.max) {
        newLng = MUMBAI_BOUNDS.lng.max;
        bounced = true;
    }

    const newHeading =
        bounced
            ? (heading + 180) % 360
            : heading;

    return {
        lat: newLat,
        lng: newLng,
        heading: newHeading
    };
}

async function runSimulator(numDrivers = 5) {

    console.log(
        `Started simulation with ${numDrivers} drivers`
    );

    for (let i = 0; i < numDrivers; i++) {

        await new Promise(res => setTimeout(res, 50));

        const ws =
            new WebSocket("ws://localhost:8080");

        let driver = null;
        let locationInterval = null;
        let stopHeartbeat = false;

        ws.on("open", () => {

            driver = createDriver();

            ws.send(JSON.stringify({
                type: "REGISTER",
                driverId: driver.driverId
            }));

            console.log(
                `Simulator connected: ${driver.driverId}`
            );

            locationInterval = setInterval(() => {

                if (stopHeartbeat) {
                    return;
                }

                const moved = movePosition(
                    driver.lat,
                    driver.lng,
                    driver.heading,
                    driver.speed
                );

                driver.lat = moved.lat;
                driver.lng = moved.lng;
                driver.heading = moved.heading;

                ws.send(JSON.stringify({
                    type: "LOCATION_UPDATE",
                    driverId: driver.driverId,
                    lat: moved.lat,
                    lng: moved.lng,
                    heading: moved.heading,
                    speed: driver.speed
                }));

            }, 2000);

            // Stop sending heartbeat/location updates
            // for the first simulated driver after 15 seconds.
            if (i === 0) {

                setTimeout(() => {

                    stopHeartbeat = true;

                    console.log(
                        `STOPPING HEARTBEAT FOR ${driver.driverId}`
                    );

                }, 15000);

            }

        });

        ws.on("message", raw => {

            const msg = JSON.parse(raw);

            if (msg.type !== "RIDE_OFFER") {
                return;
            }

            console.log(
                `${driver.driverId} received ride offer`
            );

            console.log(
                JSON.stringify(msg, null, 2)
            );

            const delay =
                1000 + Math.random() * 3000;

            setTimeout(() => {

                const randomNumber =
                    Math.random();

                if (randomNumber < 0.8) {

                    ws.send(JSON.stringify({
                        type: "ACCEPT_RIDE",
                        driverId: driver.driverId
                    }));

                } else {

                    ws.send(JSON.stringify({
                        type: "REJECT_RIDE",
                        driverId: driver.driverId
                    }));

                }

            }, delay);

        });

        ws.on("error", err => {

            console.error(
                `Driver socket error: ${err.message}`
            );

        });

        ws.on("close", () => {

            if (locationInterval) {
                clearInterval(locationInterval);
            }

            if (driver) {

                console.log(
                    `Disconnected: ${driver.driverId}`
                );

            }

        });
    }
}

module.exports = {
    runSimulator
};