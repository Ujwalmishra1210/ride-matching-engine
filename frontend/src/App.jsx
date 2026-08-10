import { useState } from "react";
import Dashboard from "./components/Dashboard";
import useDashboardSocket from "./hooks/useDashboardSocket";
import "./App.css";

const API_URL = "http://localhost:8080";

const MUMBAI_CENTER = { lat: 19.0760, lng: 72.8777 };

function randomNearby(center, spread = 0.03) {
    return {
        lat: center.lat + (Math.random() - 0.5) * spread,
        lng: center.lng + (Math.random() - 0.5) * spread
    };
}

function App() {
    const { drivers, rides, connected } = useDashboardSocket();
    const [requesting, setRequesting] = useState(false);

    async function handleRequestRide() {
        setRequesting(true);

        try {
            const pickup = randomNearby(MUMBAI_CENTER);
            const drop = randomNearby(MUMBAI_CENTER);

            await fetch(`${API_URL}/api/rides/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    riderId: `demo-rider-${Date.now()}`,
                    pickupLat: pickup.lat,
                    pickupLng: pickup.lng,
                    dropLat: drop.lat,
                    dropLng: drop.lng
                })
            });
        } catch (error) {
            console.error("Request ride failed:", error);
        } finally {
            setRequesting(false);
        }
    }

    return (
        <Dashboard
            drivers={drivers}
            rides={rides}
            connected={connected}
            onRequestRide={handleRequestRide}
            requesting={requesting}
        />
    );
}

export default App;