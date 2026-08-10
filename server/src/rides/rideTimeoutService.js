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

                /*
                 * Only monitor rides that are currently assigned.
                 */
                if (ride.status !== "DRIVER_ASSIGNED") {
                    continue;
                }

                const assignedAt =
                    Number(ride.assignedAt);

                if (!assignedAt) {
                    continue;
                }

                /*
                 * Assignment timeout is currently only
                 * a safety mechanism.
                 *
                 * We do NOT automatically redispatch here.
                 */
                if (
                    Date.now() - assignedAt <
                    ASSIGNMENT_TIMEOUT_MS
                ) {
                    continue;
                }

                console.warn(
                    `Assignment timeout reached for ride ${rideId}`
                );

                /*
                 * For now, leave the ride assigned.
                 *
                 * Automatic redispatch will be implemented
                 * once START_TRIP / driver arrival lifecycle
                 * is implemented.
                 */

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