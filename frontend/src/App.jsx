import { useState } from "react";
import Dashboard from "./components/Dashboard";
import useDashboardSocket from "./hooks/useDashboardSocket";
import "./App.css";

const API_URL = "http://localhost:8080";

const MUMBAI_CENTER = {
    lat: 19.0760,
    lng: 72.8777
};

function randomNearby(center, spread = 0.03) {
    return {
        lat: center.lat + (Math.random() - 0.5) * spread,
        lng: center.lng + (Math.random() - 0.5) * spread
    };
}

function App() {
    const {
        drivers,
        rides,
        activities,
        connected
    } = useDashboardSocket();

    const [requesting, setRequesting] =
        useState(false);

    const [notification, setNotification] =
        useState(null);

    function showNotification(
        message,
        type = "success"
    ) {
        setNotification({
            message,
            type
        });

        setTimeout(() => {
            setNotification(null);
        }, 3500);
    }

    async function handleRequestRide() {
        if (requesting) {
            return;
        }

        setRequesting(true);

        try {
            const pickup =
                randomNearby(MUMBAI_CENTER);

            const drop =
                randomNearby(MUMBAI_CENTER);

            const response = await fetch(
                `${API_URL}/api/rides/request`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        riderId:
                            `demo-rider-${Date.now()}`,
                        pickupLat:
                            pickup.lat,
                        pickupLng:
                            pickup.lng,
                        dropLat:
                            drop.lat,
                        dropLng:
                            drop.lng
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Ride request failed"
                );
            }

            showNotification(
                "Ride request created successfully."
            );
        } catch (error) {
            console.error(
                "Request ride failed:",
                error
            );

            showNotification(
                "Unable to create ride request.",
                "error"
            );
        } finally {
            setRequesting(false);
        }
    }

    return (
        <>
            <Dashboard
                drivers={drivers}
                rides={rides}
                activities={activities}
                connected={connected}
                onRequestRide={
                    handleRequestRide
                }
                requesting={requesting}
            />

            {notification && (
                <div
                    className={`toast toast-${notification.type}`}
                >
                    <span className="toast-dot" />

                    {notification.message}
                </div>
            )}
        </>
    );
}

export default App;