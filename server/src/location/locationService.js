const redis = require("../config/redis");

const DRIVERS_GEO_KEY = "drivers:locations";
const DRIVER_STATE_PREFIX = "driver:";
const {
  DRIVER_STATES,
  canTransitionDriverState
} = require("../drivers/driverState");
const dashboardEventBus =
    require("../websocket/dashboardEventBus");
const HEARTBEAT_TIMEOUT_MS = 10000;

async function updateDriverLocation(
  driverId,
  lat,
  lng,
  heading,
  speed
) {

  const driverKey =
      `${DRIVER_STATE_PREFIX}${driverId}`;

  const lastUpdate = Date.now();

  // Update geographic position
  await redis.geoadd(
      DRIVERS_GEO_KEY,
      lng,
      lat,
      driverId
  );

  // FIX: write position fields ONLY. Never write status or
  // currentRideId here, otherwise a stale read can overwrite a
  // reservation/assignment that committed in between.
  await redis.hset(
      driverKey,
      {
          lat,
          lng,
          heading,
          speed,
          lastUpdate
      }
  );

  // Defaults for a brand-new driver only (no-op if the fields exist).
  await redis.hsetnx(
      driverKey,
      "status",
      DRIVER_STATES.AVAILABLE
  );

  await redis.hsetnx(
      driverKey,
      "currentRideId",
      ""
  );

  // Read-only: used just to build the dashboard event.
  const current =
      await redis.hgetall(driverKey);

  dashboardEventBus.emit(
      "DRIVER_UPDATED",
      {
          driverId,
          lat: Number(lat),
          lng: Number(lng),
          heading: Number(heading),
          speed: Number(speed),
          status: current.status,
          currentRideId: current.currentRideId || "",
          lastUpdate: Number(lastUpdate)
      }
  );
}

async function getNearbyDrivers(
  lat,
  lng,
  radiusKm = 5
) {

  const results = await redis.georadius(
    DRIVERS_GEO_KEY,
    lng,
    lat,
    radiusKm,
    "km",
    "WITHCOORD",
    "WITHDIST",
    "ASC",
    "COUNT",
    20
  );

  const drivers = [];

  for (
    const [driverId, distStr, [lngStr, latStr]]
    of results
  ) {

    const driverState =
      await getDriverState(driverId);

    if (!driverState) {
      continue;
    }

    if (
      driverState.status !==
      DRIVER_STATES.AVAILABLE
    ) {
      continue;
    }

    drivers.push({
      driverId,
      distanceKm: parseFloat(distStr),
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
      heading: driverState.heading,
      speed: driverState.speed,
      status: driverState.status
    });
  }

  return drivers;
}

async function getDriverState(driverId) {

  const data = await redis.hgetall(
    `${DRIVER_STATE_PREFIX}${driverId}`
  );

  if (Object.keys(data).length === 0) {
    return null;
  }

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lng),
    heading: parseFloat(data.heading),
    speed: parseFloat(data.speed),
    status: data.status,
    currentRideId: data.currentRideId || null,
    lastUpdate: Number(data.lastUpdate)
  };
}

async function updateDriverState(
  driverId,
  newState
) {
  const driverKey =
      `${DRIVER_STATE_PREFIX}${driverId}`;

  const driver =
      await getDriverState(driverId);

  if (!driver) {
      throw new Error(
          "DRIVER_NOT_FOUND"
      );
  }

  if (
      !canTransitionDriverState(
          driver.status,
          newState
      )
  ) {
      throw new Error(
          `INVALID_DRIVER_TRANSITION: ${driver.status} -> ${newState}`
      );
  }

  const lastUpdate = Date.now();

  await redis.hset(
      driverKey,
      {
          status: newState,
          lastUpdate
      }
  );

  dashboardEventBus.emit(
      "DRIVER_UPDATED",
      {
          driverId,
          ...driver,
          status: newState,
          lastUpdate
      }
  );
}
async function markDriverOffline(driverId) {
  const lastUpdate = Date.now();

  await redis.hset(
      `${DRIVER_STATE_PREFIX}${driverId}`,
      {
          status: DRIVER_STATES.OFFLINE,
          currentRideId: "",
          lastUpdate
      }
  );

  await redis.zrem(
      DRIVERS_GEO_KEY,
      driverId
  );

  const driver =
      await getDriverState(driverId);

  if (driver) {
      dashboardEventBus.emit(
          "DRIVER_UPDATED",
          {
              driverId,
              ...driver
          }
      );
  }
}

async function isDriverStale(driverId) {

  const driver =
    await getDriverState(driverId);

  if (!driver) {
    return false;
  }

  return (
    Date.now() - driver.lastUpdate >
    HEARTBEAT_TIMEOUT_MS
  );
}

module.exports = {
  updateDriverLocation,
  getNearbyDrivers,
  getDriverState,
  updateDriverState,
  markDriverOffline,
  isDriverStale,
  HEARTBEAT_TIMEOUT_MS
};