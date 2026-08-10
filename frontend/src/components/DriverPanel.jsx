function DriverPanel({ drivers }) {
    return (
        <div className="driver-panel">

            <div className="driver-panel-header">
                <h2>Drivers</h2>

                <span>
                    {drivers.length} total
                </span>
            </div>

            <div className="driver-list">

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

                        <div className="driver-status">
                            {driver.status}
                        </div>

                    </div>
                ))}

            </div>

        </div>
    );
}

export default DriverPanel;