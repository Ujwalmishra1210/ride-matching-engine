import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";
const WS_URL = "ws://localhost:8080";

function useDashboardSocket() {
    const [drivers, setDrivers] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let socket;

        async function initializeDashboard() {
            try {
                // Get the current snapshot first
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

            } catch (error) {
                console.error(
                    "Dashboard state error:",
                    error
                );
            }

            // Connect to live updates
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                console.log(
                    "Dashboard WebSocket connected"
                );

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
                    const message =
                        JSON.parse(event.data);

                    if (
                        message.type !==
                        "DRIVER_UPDATED"
                    ) {
                        return;
                    }

                    const updatedDriver =
                        message.driver;

                    setDrivers((currentDrivers) => {

                        const existingIndex =
                            currentDrivers.findIndex(
                                driver =>
                                    driver.driverId ===
                                    updatedDriver.driverId
                            );

                        // New driver
                        if (existingIndex === -1) {
                            return [
                                ...currentDrivers,
                                updatedDriver
                            ];
                        }

                        // Existing driver
                        return currentDrivers.map(
                            (driver, index) =>
                                index === existingIndex
                                    ? updatedDriver
                                    : driver
                        );
                    });

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
            };
        }

        initializeDashboard();

        return () => {
            if (socket) {
                socket.close();
            }
        };

    }, []);

    return {
        drivers,
        connected
    };
}

export default useDashboardSocket;