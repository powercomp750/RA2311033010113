//runScheduler.js
require("dotenv").config();

const { fetchDepots, fetchVehicles } = require("./api");
const knapsack = require("./scheduler");
const Log = require("../logging_middleware/logger");

(async () => {
  try {
    Log("backend", "info", "controller", "Scheduler start");

    const depots = await fetchDepots();
    const vehicles = await fetchVehicles();

    for (const depot of depots) {
      Log("backend", "info", "domain", `Depot ${depot.ID}`);

      const result = knapsack(vehicles, depot.MechanicHours);

      console.log(`\nDepot ${depot.ID} (Hours: ${depot.MechanicHours})`);
      console.log("Max Impact:", result.maxImpact);
      console.log("Tasks:", result.selectedTasks.map(v => v.TaskID));
    }

    Log("backend", "info", "controller", "Scheduler done");
  } catch (err) {
    Log("backend", "fatal", "controller", "Scheduler crash");
    console.error(err.message);
  }
})();