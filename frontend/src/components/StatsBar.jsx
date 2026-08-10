function StatsBar({ drivers }) {
    const totalDrivers = drivers.length;

    const availableDrivers = drivers.filter(
        driver => driver.status === "AVAILABLE"
    ).length;

    const reservedDrivers = drivers.filter(
        driver => driver.status === "RESERVED"
    ).length;

    const onTripDrivers = drivers.filter(
        driver => driver.status === "ON_TRIP"
    ).length;

    const offlineDrivers = drivers.filter(
        driver => driver.status === "OFFLINE"
    ).length;

    const stats = [
        {
            label: "Total Drivers",
            value: totalDrivers
        },
        {
            label: "Available",
            value: availableDrivers
        },
        {
            label: "Reserved",
            value: reservedDrivers
        },
        {
            label: "On Trip",
            value: onTripDrivers
        },
        {
            label: "Offline",
            value: offlineDrivers
        }
    ];

    return (
        <div className="stats-bar">
            {stats.map((stat) => (
                <div
                    className="stat-card"
                    key={stat.label}
                >
                    <div className="stat-label">
                        {stat.label}
                    </div>

                    <div className="stat-value">
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default StatsBar;