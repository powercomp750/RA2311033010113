//API.js

const axios = require("axios");
const Log = require("../logging_middleware/logger");
const { BASE, TOKEN } = require("../config");

//Check for deports
async function fetchDepots() {
  try {
    Log("backend", "info", "service", "Fetching depots");

    const res = await axios.get(`${BASE}/depots`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    Log("backend", "info", "service", "Depots fetched");

    return res.data.depots;
  } catch (err) {
    Log("backend", "error", "service", "Depot fetch failed");
    throw err;
  }
}

//Check for vehicles
async function fetchVehicles() {
  try {
    Log("backend", "info", "service", "Fetching vehicles");

    const res = await axios.get(`${BASE}/vehicles`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    Log("backend", "info", "service", "Vehicles fetched");

    return res.data.vehicles;
  } catch (err) {
    Log("backend", "error", "service", "Vehicle fetch failed");
    throw err;
  }
}

module.exports = { fetchDepots, fetchVehicles };