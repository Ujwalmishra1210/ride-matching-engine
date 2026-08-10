require("dotenv").config();

const redis = require("../src/config/redis");
const {
    reserveDriver
} = require("../src/matching/reservationService");

const DRIVER_STATE_PREFIX = "driver:";

const NUM_DRIVERS = 5;
const NUM_RIDES = 30;

async function seedDrivers() {

    for (let i = 0; i < NUM_DRIVERS; i++) {

        const driverId = `test-driver-${i}`;

        await redis.hset(
            `${DRIVER_STATE_PREFIX}${driverId}`,
            {
                status: "AVAILABLE",
                currentRideId: "",
                lastUpdate: Date.now()
            }
        );
    }
}

async function cleanup() {

    for (let i = 0; i < NUM_DRIVERS; i++) {

        await redis.del(
            `${DRIVER_STATE_PREFIX}test-driver-${i}`
        );
    }
}

async function run() {

    console.log(
        `Seeding ${NUM_DRIVERS} drivers...`
    );

    await seedDrivers();

    console.log(
        `Firing ${NUM_RIDES} concurrent reservation attempts...`
    );

    /*
     * All rides try to reserve drivers concurrently.
     *
     * We deliberately make every ride consider
     * drivers in the same order so that contention
     * is high.
     */

    const attempts = [];

    for (let i = 0; i < NUM_RIDES; i++) {

        const rideId = `test-ride-${i}`;

        const driverId =
            `test-driver-${i % NUM_DRIVERS}`;

        attempts.push(
            reserveDriver(
                driverId,
                rideId
            ).then(success => ({
                rideId,
                driverId,
                success
            }))
        );
    }

    const results =
        await Promise.all(attempts);

    const successful =
        results.filter(
            result => result.success
        );

    console.log(
        `\nSuccessful reservations: ${successful.length}`
    );

    console.log(
        `Failed reservations: ${results.length - successful.length}`
    );

    /*
     * Verify Redis state.
     */

    const assignmentsByDriver =
        new Map();

    for (let i = 0; i < NUM_DRIVERS; i++) {

        const driverId =
            `test-driver-${i}`;

        const driver =
            await redis.hgetall(
                `${DRIVER_STATE_PREFIX}${driverId}`
            );

        console.log(
            `${driverId}: status=${driver.status}, currentRideId=${driver.currentRideId}`
        );

        if (driver.currentRideId) {

            if (
                !assignmentsByDriver.has(
                    driverId
                )
            ) {
                assignmentsByDriver.set(
                    driverId,
                    []
                );
            }

            assignmentsByDriver
                .get(driverId)
                .push(driver.currentRideId);
        }
    }

    /*
     * Verify no driver was reserved twice.
     */

    let doubleReserved = false;

    for (
        const [driverId, rideIds]
        of assignmentsByDriver
    ) {

        if (rideIds.length > 1) {

            doubleReserved = true;

            console.error(
                `DOUBLE-RESERVED: ${driverId} -> ${rideIds.join(", ")}`
            );
        }
    }

    /*
     * Since there are 5 drivers and every driver
     * is initially AVAILABLE, exactly 5 reservations
     * should succeed.
     */

    const correctReservationCount =
        successful.length === NUM_DRIVERS;

    if (
        doubleReserved ||
        !correctReservationCount
    ) {

        console.error(
            "\nFAIL: concurrency invariant violated."
        );

        await cleanup();

        process.exit(1);
    }

    console.log(
        "\nPASS: no driver was double-reserved."
    );

    console.log(
        "PASS: exactly one reservation won per driver."
    );

    await cleanup();

    process.exit(0);
}

run().catch(err => {

    console.error(err);

    process.exit(1);
});