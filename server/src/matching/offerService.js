const {
    incrementAcceptedTrips,
    incrementRejectedTrips
} = require("../drivers/driverStatsService");

const {
    recordDriverResponseTime
} = require("../metrics/dispatchMetricsService");

const pendingOffers = new Map();

/*
    pendingOffers:

    driverId -> {
        rideId,
        resolve,
        timer,
        startTime
    }
*/

function waitForDriverResponse(
    driverId,
    rideId,
    timeoutMs = 10000
) {

    return new Promise((resolve) => {

        const existingOffer = pendingOffers.get(driverId);

        if (existingOffer) {

            clearTimeout(existingOffer.timer);

            existingOffer.resolve(false);

            pendingOffers.delete(driverId);
        }

        const startTime = Date.now();

        const timer = setTimeout(() => {

            const currentOffer =
                pendingOffers.get(driverId);

            if (
                !currentOffer ||
                currentOffer.rideId !== rideId
            ) {
                return;
            }

            pendingOffers.delete(driverId);

            console.log(
                `${driverId} offer timed out for ride ${rideId}`
            );

            resolve(false);

        }, timeoutMs);

        pendingOffers.set(driverId, {
            rideId,
            resolve,
            timer,
            startTime
        });

    });

}

async function acceptOffer(driverId, rideId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {

        console.warn(
            `Ignoring ACCEPT_RIDE from ${driverId}: no pending offer`
        );

        return false;
    }

    if (offer.rideId !== rideId) {

        console.warn(
            `Ignoring ACCEPT_RIDE from ${driverId}: wrong ride`
        );

        return false;
    }

    pendingOffers.delete(driverId);

    clearTimeout(offer.timer);

    await incrementAcceptedTrips(driverId);

    await recordDriverResponseTime(
        Date.now() - offer.startTime
    );

    console.log(
        `${driverId} ACCEPTED ride ${rideId}`
    );

    offer.resolve(true);

    return true;
}

async function rejectOffer(driverId, rideId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {

        console.warn(
            `Ignoring REJECT_RIDE from ${driverId}: no pending offer`
        );

        return false;
    }

    if (offer.rideId !== rideId) {

        console.warn(
            `Ignoring REJECT_RIDE from ${driverId}: wrong ride`
        );

        return false;
    }

    pendingOffers.delete(driverId);

    clearTimeout(offer.timer);

    await incrementRejectedTrips(driverId);

    await recordDriverResponseTime(
        Date.now() - offer.startTime
    );

    console.log(
        `${driverId} REJECTED ride ${rideId}`
    );

    offer.resolve(false);

    return true;
}

function removePendingOffer(driverId) {

    const offer = pendingOffers.get(driverId);

    if (!offer) {
        return false;
    }

    clearTimeout(offer.timer);

    pendingOffers.delete(driverId);

    offer.resolve(false);

    return true;
}

module.exports = {
    waitForDriverResponse,
    acceptOffer,
    rejectOffer,
    removePendingOffer
};