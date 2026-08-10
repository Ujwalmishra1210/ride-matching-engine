function statusClass(status) {
    switch (status) {
        case "AVAILABLE":
            return "available";

        case "RESERVED":
            return "reserved";

        case "ON_TRIP":
            return "on-trip";

        case "OFFLINE":
            return "offline";

        default:
            return "offline";
    }
}

function DriverPanel({ drivers }) {
    return (
        <div className="driver-panel">

            <div className="driver-panel-header">
                <div className="panel-header">
                    <h2>Drivers</h2>

                    <span>
                        {drivers.length} total
                    </span>
                </div>
            </div>

            <div className="driver-list">

                {drivers.length === 0 && (
                    <div className="ride-empty">
                        No drivers connected.
                    </div>
                )}

                {drivers.map((driver) => (
                    <div
                        className="driver-card"
                        key={driver.driverId}
                    >

                        <div className="driver-info">

                            <strong className="driver-id">
                                {driver.driverId}
                            </strong>

                            <div className="driver-location">
                                {Number(driver.lat).toFixed(4)}
                                {" , "}
                                {Number(driver.lng).toFixed(4)}
                            </div>

                        </div>

                        <div
                            className={`driver-status ${statusClass(
                                driver.status
                            )}`}
                        >
                            {driver.status}
                        </div>

                    </div>
                ))}

            </div>

        </div>
    );
}

export default DriverPanel;