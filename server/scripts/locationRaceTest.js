require("dotenv").config();

const redis = require("../src/config/redis");
const {
    reserveDriver
} = require("../src/matching/reservationService");
const {
    updateDriverLocation
} = require("../src/location/locationService");

const DRIVERS_GEO_KEY = "drivers:locations";
const DRIVER_ID = "test-driver-race";
const DRIVER_KEY = `driver:${DRIVER_ID}`;

const ITERATIONS = 300;     // reservations attempted per implementation
const UPDATERS = 4;         // concurrent "phones" sending location updates

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * Faithful copy of the ORIGINAL updateDriverLocation logic:
 * read status/currentRideId, geoadd, then write them back from
 * the earlier read (non-atomic read-modify-write).
 */
async function legacyUpdateDriverLocation(
    driverId, lat, lng, heading, speed
) {
    const driverKey = `driver:${driverId}`;

    const existing = await redis.hgetall(driverKey);

    const status = existing.status || "AVAILABLE";
    const currentRideId = existing.currentRideId || "";
    const lastUpdate = Date.now();

    await redis.geoadd(DRIVERS_GEO_KEY, lng, lat, driverId);

    await redis.hset(driverKey, {
        lat,
        lng,
        heading,
        speed,
        status,
        currentRideId,
        lastUpdate
    });
}

async function seedDriver() {
    await redis.del(DRIVER_KEY);

    await redis.geoadd(DRIVERS_GEO_KEY, 72.87, 19.07, DRIVER_ID);

    await redis.hset(DRIVER_KEY, {
        lat: 19.07,
        lng: 72.87,
        heading: 0,
        speed: 0,
        status: "AVAILABLE",
        currentRideId: "",
        lastUpdate: Date.now()
    });
}

async function cleanup() {
    await redis.del(DRIVER_KEY);
    await redis.zrem(DRIVERS_GEO_KEY, DRIVER_ID);
}

/*
 * Runs ITERATIONS rounds. Each round: several "phones" keep sending
 * location updates while a ride reserves the driver. After the
 * reservation succeeds, the driver must still be RESERVED for that
 * ride. If not, a location update overwrote the reservation.
 */
async function runScenario(label, updateFn) {
    let corrupted = 0;

    for (let i = 0; i < ITERATIONS; i++) {

        const rideId = `race-ride-${i}`;

        await seedDriver();

        let stop = false;

        const updaters = Array.from(
            { length: UPDATERS },
            async () => {
                while (!stop) {
                    await updateFn(
                        DRIVER_ID, 19.07, 72.87, 90, 30
                    );
                    await sleep(Math.random() * 2);
                }
            }
        );

        // let the updaters spin up
        await sleep(5);

        const reserved = await reserveDriver(DRIVER_ID, rideId);

        stop = true;
        await Promise.all(updaters);

        if (!reserved) {
            continue;
        }

        const driver = await redis.hgetall(DRIVER_KEY);

        if (
            driver.status !== "RESERVED" ||
            driver.currentRideId !== rideId
        ) {
            corrupted++;
        }
    }

    console.log(
        `${label}: ${corrupted} / ${ITERATIONS} reservations were overwritten by a location update`
    );

    return corrupted;
}

async function run() {
    console.log(
        `Running ${ITERATIONS} rounds per implementation with ${UPDATERS} concurrent location updaters...\n`
    );

    const legacyCorrupted = await runScenario(
        "ORIGINAL updateDriverLocation",
        legacyUpdateDriverLocation
    );

    const currentCorrupted = await runScenario(
        "CURRENT  updateDriverLocation",
        updateDriverLocation
    );

    await cleanup();

    console.log("");

    if (legacyCorrupted === 0) {
        console.log(
            "NOTE: the original logic did not trigger the race this run " +
            "(timing dependent). Run again or raise ITERATIONS/UPDATERS."
        );
    } else {
        console.log(
            "CONFIRMED: the original logic can overwrite a reservation."
        );
    }

    if (currentCorrupted > 0) {
        console.error(
            "FAIL: the current updateDriverLocation still overwrote a reservation."
        );
        process.exit(1);
    }

    console.log(
        "PASS: the current updateDriverLocation never overwrote a reservation."
    );
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});