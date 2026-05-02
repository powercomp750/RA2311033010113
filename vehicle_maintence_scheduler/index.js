//index.js

require("dotenv").config();
const { fetchDepots, fetchVehicles } = require("./api");
const knapsack = require("./scheduler");

const TOKEN = process.env.ACCESS_TOKEN;

(async () => {
  try {
    const depots = await fetchDepots(TOKEN);
    const vehicles = await fetchVehicles(TOKEN);

    //Display schedule for each depot
    for (const depot of depots) {
      console.log(`\nDepot ${depot.ID} (Hours: ${depot.MechanicHours})`);

      const result = knapsack(vehicles, depot.MechanicHours);

      console.log("Max Impact:", result.maxImpact);
      console.log("Selected Tasks:", result.selectedTasks.map(t => t.TaskID));
    }
  } catch (err) {
    console.error(err.message);
  }
})();