import {
    Activity,
    Car,
    CheckCircle2,
    Clock3,
    Search,
    XCircle
} from "lucide-react";

function statusClass(status) {
    switch (status) {
        case "SEARCHING":
            return "reserved";

        case "DRIVER_ASSIGNED":
            return "assigned";

        case "ON_TRIP":
            return "on-trip";

        case "COMPLETED":
            return "completed";

        case "NO_DRIVERS_FOUND":
        case "CANCELLED":
        case "ASSIGNMENT_EXPIRED":
            return "offline";

        default:
            return "offline";
    }
}

function statusIcon(status) {
    switch (status) {
        case "SEARCHING":
            return (
                <Search size={11} />
            );

        case "DRIVER_ASSIGNED":
            return (
                <Car size={11} />
            );

        case "ON_TRIP":
            return (
                <Activity size={11} />
            );

        case "COMPLETED":
            return (
                <CheckCircle2
                    size={11}
                />
            );

        case "CANCELLED":
        case "NO_DRIVERS_FOUND":
        case "ASSIGNMENT_EXPIRED":
            return (
                <XCircle size={11} />
            );

        default:
            return (
                <Clock3 size={11} />
            );
    }
}

function RidePanel({ rides }) {
    return (
        <div className="ride-panel">

            <div className="panel-header">

                <div>
                    <div className="panel-title">
                        <Activity size={15} />

                        <h2>
                            Recent Rides
                        </h2>
                    </div>

                    <span className="panel-subtitle">
                        Latest dispatch requests
                    </span>
                </div>

                <span className="panel-count">
                    {rides.length}
                </span>

            </div>

            <div className="ride-list">

                {rides.length === 0 && (
                    <div className="panel-empty">
                        <Activity size={22} />

                        <span>
                            No rides yet
                        </span>

                        <small>
                            Request a demo ride
                            to see live
                            dispatch.
                        </small>
                    </div>
                )}

                {rides.map((ride) => (
                    <div
                        className="ride-card"
                        key={ride.rideId}
                    >

                        <div className="ride-card-top">

                            <div className="ride-main">

                                <strong className="ride-id">
                                    {ride.rideId.slice(
                                        0,
                                        8
                                    )}
                                </strong>

                                <span className="ride-route-label">
                                    RIDE REQUEST
                                </span>

                            </div>

                            <span
                                className={`status ${statusClass(
                                    ride.status
                                )}`}
                            >
                                {statusIcon(
                                    ride.status
                                )}

                                {
                                    ride.status
                                }
                            </span>

                        </div>

                        {ride.assignedDriverId && (
                            <div className="ride-driver">

                                <Car size={12} />

                                <span>
                                    {
                                        ride.assignedDriverId
                                    }
                                </span>

                            </div>
                        )}

                    </div>
                ))}

            </div>

        </div>
    );
}

export default RidePanel;