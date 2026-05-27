const redis = require("../config/redis");

const DRIVERS_GEO_KEY = "drivers:locations";
const DRIVER_STATE_PREFIX = "driver:";

const {
  DRIVER_STATES
} = require("../drivers/driverState");

async function updateDriverLocation(
  driverId,
  lat,
  lng,
  heading,
  speed
) {

  await redis.geoadd(
    DRIVERS_GEO_KEY,
    lng,
    lat,
    driverId
  );

  const existing = await redis.hgetall(
    `${DRIVER_STATE_PREFIX}${driverId}`
  );

  await redis.hset(
    `${DRIVER_STATE_PREFIX}${driverId}`,
    {

      lat,
      lng,

      heading,
      speed,

      status:
        existing.status ||
        DRIVER_STATES.AVAILABLE,

      currentRideId:
        existing.currentRideId || "",

      lastUpdate: Date.now()
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

      distanceKm:
        parseFloat(distStr),

      lat:
        parseFloat(latStr),

      lng:
        parseFloat(lngStr),

      heading:
        driverState.heading,

      speed:
        driverState.speed,

      status:
        driverState.status
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

    lat:
      parseFloat(data.lat),

    lng:
      parseFloat(data.lng),

    heading:
      parseFloat(data.heading),

    speed:
      parseFloat(data.speed),

    status:
      data.status,

    currentRideId:
      data.currentRideId || null,

    lastUpdate:
      Number(data.lastUpdate)
  };
}

async function updateDriverState(
  driverId,
  newState
) {

  await redis.hset(
    `${DRIVER_STATE_PREFIX}${driverId}`,
    {
      status: newState,
      lastUpdate: Date.now()
    }
  );
}

module.exports = {
  updateDriverLocation,
  getNearbyDrivers,
  getDriverState,
  updateDriverState
};