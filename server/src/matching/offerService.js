const {
    incrementAcceptedTrips,
    incrementRejectedTrips
} = require("../drivers/driverStatsService");
const {
    recordDriverResponseTime
} = require("../metrics/dispatchMetricsService");
// using timers + map
const pendingOffers = new Map();

function waitForDriverResponse(driverId, timeoutMs = 10000) {

    return new Promise((resolve) => {

        const timer = setTimeout(() => {

            pendingOffers.delete(driverId);
            resolve(false);

        }, timeoutMs);

        const startTime = Date.now();

        pendingOffers.set(driverId, {
            resolve,
            timer,
            startTime
        });

    });

}

async function acceptOffer(driverId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {
        return;
    }

    await incrementAcceptedTrips(driverId);
    console.log(`${driverId} ACCEPTED`);
    clearTimeout(offer.timer);
    await recordDriverResponseTime(
        Date.now() - offer.startTime
    );
    offer.resolve(true);

    pendingOffers.delete(driverId);

}

async function rejectOffer(driverId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {
        return;
    }

    await incrementRejectedTrips(driverId);
    console.log(`${driverId} REJECTED`);
    clearTimeout(offer.timer);
    await recordDriverResponseTime(
        Date.now() - offer.startTime
    );
    offer.resolve(false);

    pendingOffers.delete(driverId);

}

module.exports = {
    waitForDriverResponse,
    acceptOffer,
    rejectOffer
};