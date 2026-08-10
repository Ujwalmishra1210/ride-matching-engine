import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";
const WS_URL = "ws://localhost:8080";

function useDashboardSocket() {
    const [drivers, setDrivers] = useState([]);
    const [rides, setRides] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let socket;
        let reconnectTimer;
        let cancelled = false;

        function connect() {
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                console.log("Dashboard WebSocket connected");

                setConnected(true);

                socket.send(
                    JSON.stringify({
                        type: "REGISTER",
                        role: "DASHBOARD"
                    })
                );
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === "DRIVER_UPDATED") {
                        const updatedDriver = message.driver;

                        setDrivers((currentDrivers) => {
                            const existingIndex =
                                currentDrivers.findIndex(
                                    (driver) =>
                                        driver.driverId ===
                                        updatedDriver.driverId
                                );

                            if (existingIndex === -1) {
                                return [
                                    ...currentDrivers,
                                    updatedDriver
                                ];
                            }

                            return currentDrivers.map(
                                (driver, index) =>
                                    index === existingIndex
                                        ? updatedDriver
                                        : driver
                            );
                        });

                        return;
                    }

                    if (message.type === "RIDE_UPDATED") {
                        const updatedRide = message.ride;

                        setRides((currentRides) => {
                            const existingIndex =
                                currentRides.findIndex(
                                    (ride) =>
                                        ride.rideId ===
                                        updatedRide.rideId
                                );

                            if (existingIndex === -1) {
                                return [
                                    updatedRide,
                                    ...currentRides
                                ].slice(0, 50);
                            }

                            return currentRides.map(
                                (ride, index) =>
                                    index === existingIndex
                                        ? {
                                              ...ride,
                                              ...updatedRide
                                          }
                                        : ride
                            );
                        });

                        return;
                    }
                } catch (error) {
                    console.error(
                        "Dashboard WebSocket message error:",
                        error
                    );
                }
            };

            socket.onerror = (error) => {
                console.error(
                    "Dashboard WebSocket error:",
                    error
                );
            };

            socket.onclose = () => {
                console.log(
                    "Dashboard WebSocket disconnected"
                );

                setConnected(false);

                if (!cancelled) {
                    reconnectTimer = setTimeout(
                        connect,
                        2000
                    );
                }
            };
        }

        async function initializeDashboard() {
            try {
                const response = await fetch(
                    `${API_URL}/api/dashboard/state`
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to fetch dashboard state"
                    );
                }

                const data = await response.json();

                setDrivers(data.drivers || []);

                setRides(data.rides || []);

            } catch (error) {
                console.error(
                    "Dashboard state error:",
                    error
                );
            }

            connect();
        }

        initializeDashboard();

        return () => {
            cancelled = true;

            clearTimeout(reconnectTimer);

            if (socket) {
                socket.close();
            }
        };
    }, []);

    return {
        drivers,
        rides,
        connected
    };
}

export default useDashboardSocket;