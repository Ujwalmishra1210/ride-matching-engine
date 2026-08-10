import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";
import {
    Car,
    MapPin
} from "lucide-react";

import "leaflet/dist/leaflet.css";

const MUMBAI_CENTER = [
    19.0760,
    72.8777
];

function createDriverIcon(status) {
    let color = "#64748b";

    if (status === "AVAILABLE") {
        color = "#16a34a";
    } else if (status === "RESERVED") {
        color = "#f59e0b";
    } else if (status === "ON_TRIP") {
        color = "#2563eb";
    } else if (status === "OFFLINE") {
        color = "#64748b";
    }

    return L.divIcon({
        className:
            "driver-marker-wrapper",

        html: `
            <div
                class="driver-marker"
                style="background:${color}"
                title="${status}"
            >
                <span>🚗</span>
            </div>
        `,

        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

function MapViewport({ drivers }) {
    const map = useMap();

    useEffect(() => {
        const validDrivers =
            drivers.filter(
                (driver) =>
                    Number.isFinite(
                        Number(driver.lat)
                    ) &&
                    Number.isFinite(
                        Number(driver.lng)
                    )
            );

        if (validDrivers.length === 0) {
            return;
        }

        const bounds = L.latLngBounds(
            validDrivers.map(
                (driver) => [
                    Number(driver.lat),
                    Number(driver.lng)
                ]
            )
        );

        map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 13,
            animate: true
        });
    }, [drivers, map]);

    return null;
}

function DriverMap({ drivers }) {
    return (
        <MapContainer
            center={MUMBAI_CENTER}
            zoom={11}
            className="driver-map"
            zoomControl={true}
        >

            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewport
                drivers={drivers}
            />

            {drivers.map((driver) => {
                const lat = Number(
                    driver.lat
                );

                const lng = Number(
                    driver.lng
                );

                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {
                    return null;
                }

                return (
                    <Marker
                        key={driver.driverId}
                        position={[
                            lat,
                            lng
                        ]}
                        icon={createDriverIcon(
                            driver.status
                        )}
                    >

                        <Popup>

                            <div className="driver-popup">

                                <div className="popup-title">
                                    <Car size={14} />

                                    <strong>
                                        {driver.driverId}
                                    </strong>
                                </div>

                                <div className="popup-status">
                                    <span
                                        className={`popup-status-dot ${driver.status.toLowerCase()}`}
                                    />

                                    {driver.status}
                                </div>

                                <div className="popup-row">
                                    <MapPin size={11} />
                                    <span>
                                        {lat.toFixed(5)}
                                        {" , "}
                                        {lng.toFixed(5)}
                                    </span>
                                </div>

                                <div className="popup-row">
                                    <span>
                                        Speed
                                    </span>

                                    <strong>
                                        {Number(
                                            driver.speed || 0
                                        ).toFixed(1)}
                                        {" km/h"}
                                    </strong>
                                </div>

                                {driver.currentRideId && (
                                    <div className="popup-row">
                                        <span>
                                            Ride
                                        </span>

                                        <strong>
                                            {driver.currentRideId.slice(
                                                0,
                                                8
                                            )}
                                        </strong>
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