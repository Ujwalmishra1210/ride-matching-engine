require("dotenv").config();

const redis = require("../src/config/redis");

const {
    finalizeDriverAssignment
} = require("../src/matching/reservationService");

const DRIVER_STATE_PREFIX = "driver:";
const RIDE_PREFIX = "ride:";

const DRIVER_ID = "test-driver-finalize";
const RIDE_ID = "test-ride-finalize";

const NUM_ATTEMPTS = 30;

async function seedState() {

    /*
     * Driver must already be RESERVED for this ride.
     */

    await redis.hset(
        `${DRIVER_STATE_PREFIX}${DRIVER_ID}`,
        {
            status: "RESERVED",
            currentRideId: RIDE_ID,
            lastUpdate: Date.now()
        }
    );

    /*
     * Ride must still be SEARCHING.
     */

    await redis.hset(
        `${RIDE_PREFIX}${RIDE_ID}`,
        {
            rideId: RIDE_ID,
            riderId: "test-rider",
            pickupLat: "19.07",
            pickupLng: "72.87",
            dropLat: "19.10",
            dropLng: "72.90",
            status: "SEARCHING",
            assignedDriverId: "",
            assignedAt: ""
        }
    );
}

async function cleanup() {

    await redis.del(
        `${DRIVER_STATE_PREFIX}${DRIVER_ID}`
    );

    await redis.del(
        `${RIDE_PREFIX}${RIDE_ID}`
    );
}

async function run() {

    console.log(
        "Seeding RESERVED driver and SEARCHING ride..."
    );

    await seedState();

    console.log(
        `Firing ${NUM_ATTEMPTS} concurrent finalization attempts...`
    );

    /*
     * All 30 calls attempt to finalize the
     * exact same driver + ride simultaneously.
     */

    const attempts = Array.from(
        { length: NUM_ATTEMPTS },
        (_, index) => {

            return finalizeDriverAssignment(
                RIDE_ID,
                DRIVER_ID
            ).then(result => ({
                attempt: index + 1,
                result
            }));
        }
    );

    const results =
        await Promise.all(attempts);

    const successful =
        results.filter(
            ({ result }) => result.success
        );

    const failed =
        results.filter(
            ({ result }) => !result.success
        );

    console.log(
        `\nSuccessful finalizations: ${successful.length}`
    );

    console.log(
        `Failed finalizations: ${failed.length}`
    );

    /*
     * Show failure reasons.
     */

    const failureReasons = {};

    for (const { result } of failed) {

        failureReasons[result.reason] =
            (failureReasons[result.reason] || 0) + 1;
    }

    console.log(
        "\nFailure reasons:",
        failureReasons
    );

    /*
     * Read final driver state.
     */

    const driver =
        await redis.hgetall(
            `${DRIVER_STATE_PREFIX}${DRIVER_ID}`
        );

    /*
     * Read final ride state.
     */

    const ride =
        await redis.hgetall(
            `${RIDE_PREFIX}${RIDE_ID}`
        );

    console.log("\nFinal driver state:");
    console.log(driver);

    console.log("\nFinal ride state:");
    console.log(ride);

    /*
     * Concurrency invariants.
     */

    let passed = true;

    if (successful.length !== 1) {

        console.error(
            `FAIL: expected exactly 1 successful finalization, got ${successful.length}`
        );

        passed = false;
    }

    if (driver.status !== "ON_TRIP") {

        console.error(
            `FAIL: expected driver status ON_TRIP, got ${driver.status}`
        );

        passed = false;
    }

    if (driver.currentRideId !== RIDE_ID) {

        console.error(
            `FAIL: driver currentRideId is incorrect`
        );

        passed = false;
    }

    if (ride.status !== "DRIVER_ASSIGNED") {

        console.error(
            `FAIL: expected ride status DRIVER_ASSIGNED, got ${ride.status}`
        );

        passed = false;
    }

    if (ride.assignedDriverId !== DRIVER_ID) {

        console.error(
            `FAIL: ride assignedDriverId is incorrect`
        );

        passed = false;
    }

    if (passed) {

        console.log(
            "\nPASS: exactly one concurrent finalization succeeded."
        );

        console.log(
            "PASS: driver transitioned RESERVED -> ON_TRIP exactly once."
        );

        console.log(
            "PASS: ride transitioned SEARCHING -> DRIVER_ASSIGNED exactly once."
        );

        await cleanup();

        process.exit(0);
    }

    await cleanup();

    process.exit(1);
}

run().catch(err => {

    console.error(err);

    process.exit(1);
});