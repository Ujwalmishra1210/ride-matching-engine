import Dashboard from "./components/Dashboard";
import useDashboardSocket from "./hooks/useDashboardSocket";
import "./App.css";

function App() {
    const {
        drivers,
        connected
    } = useDashboardSocket();

    return (
        <Dashboard
            drivers={drivers}
            connected={connected}
        />
    );
}

export default App;