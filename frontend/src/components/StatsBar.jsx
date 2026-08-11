import {
    Car,
    CheckCircle2,
    CircleOff,
    Clock3,
    Navigation,
    Activity
} from "lucide-react";

function StatsBar({
    drivers,
    rides
}) {
    const totalDrivers =
        drivers.length;

    const availableDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                "AVAILABLE"
        ).length;

    const reservedDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                "RESERVED"
        ).length;

    const onTripDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                "ON_TRIP"
        ).length;

    const offlineDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                "OFFLINE"
        ).length;

    const activeRides =
        rides.filter(
            (ride) =>
                ride.status ===
                    "SEARCHING" ||
                ride.status ===
                    "DRIVER_ASSIGNED" ||
                ride.status === "ON_TRIP"
        ).length;

    const stats = [
        {
            label: "Total Drivers",
            value: totalDrivers,
            icon: Car,
            tone: "blue"
        },
        {
            label: "Available",
            value: availableDrivers,
            icon: CheckCircle2,
            tone: "green"
        },
        {
            label: "Reserved",
            value: reservedDrivers,
            icon: Clock3,
            tone: "orange"
        },
        {
            label: "On Trip",
            value: onTripDrivers,
            icon: Navigation,
            tone: "purple"
        },
        {
            label: "Offline",
            value: offlineDrivers,
            icon: CircleOff,
            tone: "gray"
        },
        {
            label: "Active Rides",
            value: activeRides,
            icon: Activity,
            tone: "cyan"
        }
    ];

    return (
        <div className="stats-bar">

            {stats.map((stat) => {
                const Icon =
                    stat.icon;

                return (
                    <div
                        className="stat-card"
                        key={stat.label}
                    >

                        <div className="stat-card-top">

                            <div
                                className={`stat-icon ${stat.tone}`}
                            >
                                <Icon
                                    size={15}
                                />
                            </div>

                            <span className="stat-label">
                                {
                                    stat.label
                                }
                            </span>

                        </div>

                        <div className="stat-value">
                            {stat.value}
                        </div>

                    </div>
                );
            })}

        </div>
    );
}

export default StatsBar;