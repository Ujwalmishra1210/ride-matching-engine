import DriverMap from "./DriverMap";
import DriverPanel from "./DriverPanel";
import RidePanel from "./RidePanel";
import StatsBar from "./StatsBar";

function Dashboard({ drivers, rides, connected, onRequestRide, requesting }) {
    return (
        <div className="dashboard">

            <header className="dashboard-header">

                <div>
                    <h1>Ride Engine</h1>
                    <p>Real-Time Dispatch Dashboard</p>
                </div>

                <div className="header-actions">

                    <button
                        className="request-ride-button"
                        onClick={onRequestRide}
                        disabled={requesting}
                    >
                        {requesting ? "Requesting..." : "Request Ride"}
                    </button>

                    <div className="connection-status">

                        <span
                            className="status-dot"
                            style={{
                                background: connected ? "#22c55e" : "#ef4444",
                                boxShadow: connected
                                    ? "0 0 8px #22c55e"
                                    : "0 0 8px #ef4444"
                            }}
                        />

                        {connected ? "LIVE" : "DISCONNECTED"}

                    </div>

                </div>

            </header>

            <StatsBar drivers={drivers} />

            <div className="dashboard-content">

                <div className="map-container">
                    <DriverMap drivers={drivers} />
                </div>

                <div className="side-column">

                    <div className="driver-panel-container">
                        <DriverPanel drivers={drivers} />
                    </div>

                    <div className="ride-panel-container">
                        <RidePanel rides={rides} />
                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;