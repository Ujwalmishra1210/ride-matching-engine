const redis = require("../config/redis");

const {
  markDriverOffline,
  isDriverStale
} = require("../location/locationService");

const DRIVER_STATE_PREFIX = "driver:";

function startHeartbeatMonitor(intervalMs = 5000) {

  setInterval(async () => {

    try {

      const keys = await redis.keys(`${DRIVER_STATE_PREFIX}*`);

      for (const key of keys) {

        const driverId = key.replace(DRIVER_STATE_PREFIX, "");

        const stale = await isDriverStale(driverId);

        if (!stale) {
          continue;
        }

        await markDriverOffline(driverId);

        console.log(
          `Driver ${driverId} marked OFFLINE`
        );
      }

    } catch (err) {

      console.error(
        "Heartbeat monitor error:",
        err.message
      );

    }

  }, intervalMs);

}

module.exports = {
  startHeartbeatMonitor
};