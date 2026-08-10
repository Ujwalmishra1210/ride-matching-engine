import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const MUMBAI_CENTER = [
    19.0760,
    72.8777
];

function createDriverIcon(status) {

    let color = "#6b7280";

    if (status === "AVAILABLE") {
        color = "#16a34a";
    } else if (status === "RESERVED") {
        color = "#f59e0b";
    } else if (status === "ON_TRIP") {
        color = "#2563eb";
    } else if (status === "OFFLINE") {
        color = "#6b7280";
    }

    return L.divIcon({
        className: "driver-marker-wrapper",

        html: `
            <div
                class="driver-marker"
                style="background:${color}"
                title="${status}"
            >
                🚗
            </div>
        `,

        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}


/*
 * Automatically keeps the map focused
 * around the currently active drivers.
 */
function MapViewport({ drivers }) {

    const map = useMap();

    useEffect(() => {

        const validDrivers = drivers.filter(
            driver =>
                Number.isFinite(driver.lat) &&
                Number.isFinite(driver.lng)
        );

        if (validDrivers.length === 0) {
            return;
        }

        const bounds = L.latLngBounds(
            validDrivers.map(driver => [
                driver.lat,
                driver.lng
            ])
        );

        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 14,
            animate: true
        });

    }, [drivers, map]);

    return null;
}


function DriverMap({ drivers }) {

    return (
        <MapContainer
            center={MUMBAI_CENTER}
            zoom={12}
            className="driver-map"
        >

            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewport drivers={drivers} />

            {drivers.map((driver) => {

                if (
                    !Number.isFinite(driver.lat) ||
                    !Number.isFinite(driver.lng)
                ) {
                    return null;
                }

                return (
                    <Marker
                        key={driver.driverId}
                        position={[
                            driver.lat,
                            driver.lng
                        ]}
                        icon={createDriverIcon(
                            driver.status
                        )}
                    >

                        <Popup>

                            <div className="driver-popup">

                                <strong>
                                    {driver.driverId}
                                </strong>

                                <div>
                                    Status:{" "}
                                    {driver.status}
                                </div>

                                <div>
                                    Lat:{" "}
                                    {driver.lat.toFixed(5)}
                                </div>

                                <div>
                                    Lng:{" "}
                                    {driver.lng.toFixed(5)}
                                </div>

                                <div>
                                    Speed:{" "}
                                    {Number(
                                        driver.speed || 0
                                    ).toFixed(1)}
                                    {" "}km/h
                                </div>

                                {driver.currentRideId && (
                                    <div>
                                        Ride:{" "}
                                        {driver.currentRideId}
                                    </div>
                                )}

                            </div>

                        </Popup>

                    </Marker>
                );
            })}

        </MapContainer>
    );
}

export default DriverMap;