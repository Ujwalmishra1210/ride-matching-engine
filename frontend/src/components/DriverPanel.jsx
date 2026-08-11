import {
    Car,
    MapPin
} from "lucide-react";

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

            <div className="panel-header">

                <div>
                    <div className="panel-title">
                        <Car size={15} />

                        <h2>
                            Drivers
                        </h2>
                    </div>

                    <span className="panel-subtitle">
                        Live fleet status
                    </span>
                </div>

                <span className="panel-count">
                    {drivers.length}
                </span>

            </div>

            <div className="driver-list">

                {drivers.length === 0 && (
                    <div className="panel-empty">
                        <Car size={22} />

                        <span>
                            No drivers connected
                        </span>

                        <small>
                            Start the simulator
                            to populate the
                            fleet.
                        </small>
                    </div>
                )}

                {drivers.map(
                    (driver) => (
                        <div
                            className="driver-card"
                            key={
                                driver.driverId
                            }
                        >

                            <div className="driver-avatar">
                                <Car size={13} />
                            </div>

                            <div className="driver-info">

                                <strong className="driver-id">
                                    {
                                        driver.driverId
                                    }
                                </strong>

                                <div className="driver-location">
                                    <MapPin
                                        size={9}
                                    />

                                    {Number(
                                        driver.lat
                                    ).toFixed(
                                        4
                                    )}
                                    {" , "}
                                    {Number(
                                        driver.lng
                                    ).toFixed(
                                        4
                                    )}
                                </div>

                            </div>

                            <div
                                className={`driver-status ${statusClass(
                                    driver.status
                                )}`}
                            >
                                <span />
                                {
                                    driver.status ||
                                    "OFFLINE"
                                }
                            </div>

                        </div>
                    )
                )}

            </div>

        </div>
    );
}

export default DriverPanel;