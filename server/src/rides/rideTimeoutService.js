const {
    getAllRideIds,
    getRide,
    updateRide
} = require("./rideService");

const {
    releaseDriver,
    dispatchRide
} = require("../matching/matchingEngine");

const ASSIGNMENT_TIMEOUT_MS =
    Number(process.env.ASSIGNMENT_TIMEOUT_MS) || 120000;

let timeoutCheckRunning = false;


async function checkRideTimeouts() {

    if (timeoutCheckRunning) {
        return;
    }

    timeoutCheckRunning = true;

    try {

        const rideIds = await getAllRideIds();

        for (const rideId of rideIds) {

            try {

                const ride = await getRide(rideId);

                if (Object.keys(ride).length === 0) {
                    continue;
                }

                if (ride.status !== "DRIVER_ASSIGNED") {
                    continue;
                }

                const assignedAt = Number(ride.assignedAt);

                if (!assignedAt) {
                    continue;
                }

                if (
                    Date.now() - assignedAt <
                    ASSIGNMENT_TIMEOUT_MS
                ) {
                    continue;
                }

                const driverId = ride.assignedDriverId;

                if (driverId) {
                    await releaseDriver(driverId, rideId);
                }

                await updateRide(rideId, {
                    status: "ASSIGNMENT_EXPIRED"
                });

                console.log(
                    `Assignment expired for ride ${rideId}`
                );

                await updateRide(rideId, {
                    status: "SEARCHING",
                    assignedDriverId: "",
                    assignedAt: "",
                    attemptedDriverIds: JSON.stringify([])
                });

                const updatedRide = await getRide(rideId);

                const result = await dispatchRide(updatedRide);

                console.log(
                    `Redispatch result for ride ${rideId}:`,
                    result
                );

            } catch (error) {

                console.error(
                    `Error processing ride timeout for ${rideId}:`,
                    error.message
                );

            }
        }

    } finally {

        timeoutCheckRunning = false;

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