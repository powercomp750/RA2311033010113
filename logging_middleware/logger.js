// logger.js -- Essential logging utils to communicate logs with central server

const axios = require("axios");
const { LOG_URL, TOKEN } = require("../config");

function formatMessage(msg) {
  if (!msg) return "empty log";
  return msg.length > 48 ? msg.substring(0, 48) : msg;
}

async function Log(stack, level, pkg, message) {
  try {
    // We will make sure required inputs are valid before server calls them
    const validStacks = ["backend", "frontend"];
    const validLevels = ["debug", "info", "warn", "error", "fatal"];
    const validPackages = [
      "cache", "controller", "cron_job", "domain",
      "handler", "repository", "route", "service",
      "api", "component", "hook", "page", "state", "style",
      "auth", "config", "middleware", "utils"
    ];
    // Terminate batch job if any inputs fail
    if (!validStacks.includes(stack)) throw new Error("Invalid stack");
    if (!validLevels.includes(level)) throw new Error("Invalid level");
    if (!validPackages.includes(pkg)) throw new Error("Invalid package");

    //Safe message formatting to prevent log injection
    const safeMessage = formatMessage(message);

    const response = await axios.post(
      LOG_URL,
      {
        stack,
        level,
        package: pkg,
        message: safeMessage
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error("Logging failed:", err.response?.data || err.message);
  }
}

module.exports = Log;