const RIDE_STATES = {
    SEARCHING: "SEARCHING",
    DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    NO_DRIVERS_FOUND: "NO_DRIVERS_FOUND",
    ASSIGNMENT_EXPIRED: "ASSIGNMENT_EXPIRED"
};

const RIDE_TRANSITIONS = {
    [RIDE_STATES.SEARCHING]: [
        RIDE_STATES.DRIVER_ASSIGNED,
        RIDE_STATES.CANCELLED,
        RIDE_STATES.NO_DRIVERS_FOUND
    ],

    [RIDE_STATES.DRIVER_ASSIGNED]: [
        RIDE_STATES.COMPLETED,
        RIDE_STATES.CANCELLED,
        RIDE_STATES.ASSIGNMENT_EXPIRED
    ],

    [RIDE_STATES.ASSIGNMENT_EXPIRED]: [
        RIDE_STATES.SEARCHING
    ],

    [RIDE_STATES.COMPLETED]: [],

    [RIDE_STATES.CANCELLED]: [],

    [RIDE_STATES.NO_DRIVERS_FOUND]: []
};

function canTransitionRideState(from, to) {

    if (from === to) {
        return true;
    }

    return (
        RIDE_TRANSITIONS[from] &&
        RIDE_TRANSITIONS[from].includes(to)
    );
}

module.exports = {
    RIDE_STATES,
    RIDE_TRANSITIONS,
    canTransitionRideState
};