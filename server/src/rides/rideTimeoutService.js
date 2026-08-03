const {
    getAllRideIds,
    getRide,
    updateRide
} = require("./rideService");

const {
    releaseDriver
} = require("../matching/matchingEngine");

const ASSIGNMENT_TIMEOUT_MS =
    Number(process.env.ASSIGNMENT_TIMEOUT_MS) || 120000;

async function checkRideTimeouts() {

    const rideIds = await getAllRideIds();

    for (const rideId of rideIds) {

        const ride = await getRide(rideId);

        if (ride.status !== "DRIVER_ASSIGNED") {
            continue;
        }

        const assignedAt = Number(ride.assignedAt);

        if (
            Date.now() - assignedAt <
            ASSIGNMENT_TIMEOUT_MS
        ) {
            continue;
        }

        await releaseDriver(
            ride.assignedDriverId
        );

        await updateRide(rideId, {
            status: "ASSIGNMENT_EXPIRED",
            assignedDriverId: "",
            assignedAt: ""
        });

        console.log(
            `Assignment expired for ride ${rideId}`
        );
    }
}

function startRideTimeoutMonitor() {

    setInterval(
        checkRideTimeouts,
        5000
    );

}

module.exports = {
    startRideTimeoutMonitor
};