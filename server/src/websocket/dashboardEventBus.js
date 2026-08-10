const EventEmitter = require("events");

const dashboardEventBus = new EventEmitter();

module.exports = dashboardEventBus;