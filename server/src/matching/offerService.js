const {
    incrementAcceptedTrips,
    incrementRejectedTrips
} = require("../drivers/driverStatsService");

// using timers + map
const pendingOffers = new Map();

function waitForDriverResponse(driverId, timeoutMs = 10000) {

    return new Promise((resolve) => {

        const timer = setTimeout(() => {

            pendingOffers.delete(driverId);
            resolve(false);

        }, timeoutMs);

        pendingOffers.set(driverId, {
            resolve,
            timer
        });

    });

}

async function acceptOffer(driverId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {
        return;
    }

    await incrementAcceptedTrips(driverId);

    clearTimeout(offer.timer);

    offer.resolve(true);

    pendingOffers.delete(driverId);

}

async function rejectOffer(driverId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {
        return;
    }

    await incrementRejectedTrips(driverId);

    clearTimeout(offer.timer);

    offer.resolve(false);

    pendingOffers.delete(driverId);

}

module.exports = {
    waitForDriverResponse,
    acceptOffer,
    rejectOffer
};