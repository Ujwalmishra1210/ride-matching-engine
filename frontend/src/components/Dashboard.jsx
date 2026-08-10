import {
    Activity,
    Car,
    CheckCircle2,
    Clock3,
    Radio,
    Route,
    Users,
    Zap
} from "lucide-react";

import DriverMap from "./DriverMap";
import DriverPanel from "./DriverPanel";
import RidePanel from "./RidePanel";
import StatsBar from "./StatsBar";

function Dashboard({
    drivers,
    rides,
    activities,
    connected,
    onRequestRide,
    requesting
}) {
    const activeRides = rides.filter(
        (ride) =>
            ride.status === "SEARCHING" ||
            ride.status === "DRIVER_ASSIGNED" ||
            ride.status === "ON_TRIP"
    ).length;

    const completedRides = rides.filter(
        (ride) =>
            ride.status === "COMPLETED"
    ).length;

    const onTripDrivers = drivers.filter(
        (driver) =>
            driver.status === "ON_TRIP"
    ).length;

    const reservedDrivers = drivers.filter(
        (driver) =>
            driver.status === "RESERVED"
    ).length;

    const utilization =
        drivers.length === 0
            ? 0
            : Math.round(
                  ((onTripDrivers +
                      reservedDrivers) /
                      drivers.length) *
                      100
              );

    return (
        <div className="dashboard">

            <header className="dashboard-header">

                <div className="brand">

                    <div className="brand-mark">
                        <Route size={19} />
                    </div>

                    <div>
                        <h1>Ride Engine</h1>

                        <p>
                            Real-Time Dispatch Control
                        </p>
                    </div>

                </div>

                <div className="header-actions">

                    <div className="system-status">

                        <span
                            className={`status-dot ${
                                connected
                                    ? "online"
                                    : "offline"
                            }`}
                        />

                        <span>
                            {connected
                                ? "SYSTEM LIVE"
                                : "DISCONNECTED"}
                        </span>

                    </div>

                    <button
                        className="request-ride-button"
                        onClick={onRequestRide}
                        disabled={requesting}
                    >
                        <span className="button-icon">
                            {requesting ? (
                                <Clock3 size={15} />
                            ) : (
                                <Zap size={15} />
                            )}
                        </span>

                        {requesting
                            ? "Requesting..."
                            : "Request Ride"}
                    </button>

                </div>

            </header>

            <StatsBar
                drivers={drivers}
                rides={rides}
            />

            <main className="dashboard-content">

                <section className="map-section">

                    <div className="section-heading">

                        <div>
                            <div className="section-title-row">
                                <Radio size={15} />
                                <h2>Live Fleet</h2>
                            </div>

                            <p>
                                Real-time driver positions
                            </p>
                        </div>

                        <div className="map-summary">
                            <Car size={13} />
                            {drivers.length} drivers
                        </div>

                    </div>

                    <div className="map-container">
                        <DriverMap
                            drivers={drivers}
                        />

                        <div className="map-overlay">

                            <div className="map-overlay-item">
                                <span className="legend-dot available" />
                                Available
                            </div>

                            <div className="map-overlay-item">
                                <span className="legend-dot reserved" />
                                Reserved
                            </div>

                            <div className="map-overlay-item">
                                <span className="legend-dot on-trip" />
                                On Trip
                            </div>

                            <div className="map-overlay-item">
                                <span className="legend-dot offline" />
                                Offline
                            </div>

                        </div>
                    </div>

                </section>

                <aside className="side-column">

                    <div className="panel-wrapper drivers-wrapper">
                        <DriverPanel
                            drivers={drivers}
                        />
                    </div>

                    <div className="panel-wrapper rides-wrapper">
                        <RidePanel
                            rides={rides}
                        />
                    </div>

                </aside>

            </main>

            <section className="bottom-grid">

                <div className="activity-panel">

                    <div className="section-heading">

                        <div>
                            <div className="section-title-row">
                                <Activity size={15} />
                                <h2>Live Activity</h2>
                            </div>

                            <p>
                                Real-time dispatch events
                            </p>
                        </div>

                        <span className="activity-live">
                            <span className="activity-live-dot" />
                            LIVE
                        </span>

                    </div>

                    <div className="activity-list">

                        {activities.length === 0 ? (
                            <div className="activity-empty">

                                <Activity size={20} />

                                <span>
                                    Waiting for live events...
                                </span>

                            </div>
                        ) : (
                            activities.map(
                                (activity) => (
                                    <div
                                        className="activity-item"
                                        key={activity.id}
                                    >

                                        <div
                                            className={`activity-icon ${
                                                activity.type ===
                                                "RIDE"
                                                    ? "ride"
                                                    : "driver"
                                            }`}
                                        >
                                            {activity.type ===
                                            "RIDE" ? (
                                                <Route size={13} />
                                            ) : (
                                                <Users size={13} />
                                            )}
                                        </div>

                                        <div className="activity-content">

                                            <div className="activity-message">
                                                {activity.message}
                                            </div>

                                            <div className="activity-time">
                                                {new Date(
                                                    activity.timestamp
                                                ).toLocaleTimeString(
                                                    [],
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit"
                                                    }
                                                )}
                                            </div>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>

                <div className="overview-panel">

                    <div className="section-heading">

                        <div>
                            <div className="section-title-row">
                                <Zap size={15} />
                                <h2>Operations</h2>
                            </div>

                            <p>
                                Current system overview
                            </p>
                        </div>

                    </div>

                    <div className="operation-grid">

                        <div className="operation-card">
                            <div className="operation-icon blue">
                                <Activity size={15} />
                            </div>

                            <div>
                                <span>
                                    Active Rides
                                </span>

                                <strong>
                                    {activeRides}
                                </strong>
                            </div>
                        </div>

                        <div className="operation-card">
                            <div className="operation-icon green">
                                <CheckCircle2 size={15} />
                            </div>

                            <div>
                                <span>
                                    Completed
                                </span>

                                <strong>
                                    {completedRides}
                                </strong>
                            </div>
                        </div>

                        <div className="operation-card">
                            <div className="operation-icon purple">
                                <Radio size={15} />
                            </div>

                            <div>
                                <span>
                                    Fleet Utilization
                                </span>

                                <strong>
                                    {utilization}%
                                </strong>
                            </div>
                        </div>

                        <div className="operation-card">
                            <div className="operation-icon orange">
                                <Car size={15} />
                            </div>

                            <div>
                                <span>
                                    Recent Rides
                                </span>

                                <strong>
                                    {rides.length}
                                </strong>
                            </div>
                        </div>

                    </div>

                </div>

            </section>

        </div>
    );
}

export default Dashboard;