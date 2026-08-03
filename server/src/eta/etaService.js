const {
    getDriverState
} = require("../location/locationService");

const AVERAGE_SPEED_KMPH = 30;

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function calculateDistanceKm(
    lat1,
    lng1,
    lat2,
    lng2
) {
    const R = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}

async function estimateDriverEta(
    driverId,
    pickupLat,
    pickupLng
) {

    const driver = await getDriverState(driverId);

    if (!driver) {
        return null;
    }

    const distanceKm = calculateDistanceKm(
        driver.lat,
        driver.lng,
        Number(pickupLat),
        Number(pickupLng)
    );

    const etaMinutes =
        Math.ceil(
            distanceKm /
            AVERAGE_SPEED_KMPH *
            60
        );

    return {
        distanceKm,
        etaMinutes
    };
}

module.exports = {
    estimateDriverEta
};