function statusClass(status) {
    switch (status) {
        case "SEARCHING":
            return "searching";

        case "DRIVER_ASSIGNED":
            return "reserved";

        case "ON_TRIP":
            return "on-trip";

        case "COMPLETED":
            return "available";

        case "NO_DRIVERS_FOUND":
        case "CANCELLED":
        case "ASSIGNMENT_EXPIRED":
            return "offline";

        default:
            return "offline";
    }
}

function RidePanel({ rides }) {
    return (
        <div className="ride-panel">
            <div className="panel-header">
                <h2>Rides</h2>
                <span>{rides.length} recent</span>
            </div>

            <div className="ride-list">
                {rides.length === 0 && (
                    <div className="ride-empty">
                        No rides yet — request one to see live dispatch.
                    </div>
                )}

                {rides.map((ride) => (
                    <div
                        className="ride-card"
                        key={ride.rideId}
                    >
                        <div className="ride-card-top">
                            <strong className="ride-id">
                                {ride.rideId.slice(0, 8)}
                            </strong>

                            <span
                                className={`status ${statusClass(
                                    ride.status
                                )}`}
                            >
                                {ride.status}
                            </span>
                        </div>

                        {ride.assignedDriverId && (
                            <div className="ride-driver">
                                Driver: {ride.assignedDriverId}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RidePanel;