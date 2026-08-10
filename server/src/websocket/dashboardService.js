const redis = require("../config/redis");

const DRIVER_STATE_PREFIX = "driver:";

async function getAllDrivers() {
    const keys = await redis.keys(`${DRIVER_STATE_PREFIX}*`);

    const driverKeys = keys.filter((key) => {
        const suffix = key.slice(DRIVER_STATE_PREFIX.length);

        return (
            suffix.length > 0 &&
            !suffix.includes(":")
        );
    });

    const drivers = [];

    for (const key of driverKeys) {
        const driverId =
            key.slice(DRIVER_STATE_PREFIX.length);

        const driver =
            await redis.hgetall(key);

        if (Object.keys(driver).length === 0) {
            continue;
        }

        drivers.push({
            driverId,
            lat: Number(driver.lat),
            lng: Number(driver.lng),
            heading: Number(driver.heading),
            speed: Number(driver.speed),
            status: driver.status,
            currentRideId:
                driver.currentRideId || null,
            lastUpdate:
                Number(driver.lastUpdate || 0)
        });
    }

    return drivers;
}

async function getDashboardState() {
    const drivers = await getAllDrivers();

    return {
        drivers,
        generatedAt: Date.now()
    };
}

module.exports = {
    getAllDrivers,
    getDashboardState
};