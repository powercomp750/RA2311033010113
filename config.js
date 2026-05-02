//config.js
require("dotenv").config();

const BASE = "http://20.207.122.201/evaluation-service";
const LOG_URL = `${BASE}/logs`;

const TOKEN = process.env.ACCESS_TOKEN;

module.exports = {
  BASE,
  LOG_URL,
  TOKEN
};