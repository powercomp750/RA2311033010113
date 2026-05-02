//Scheduler.js
const Log = require("../logging_middleware/logger");

// Knapsack algorithm to max efficiency within mechanic hours
function knapsack(vehicles, capacity) {
  const n = vehicles.length;

  Log("backend", "debug", "utils", `Knapsack started with ${n} vehicles and capacity ${capacity}`);

  const dp = Array.from({ length: n + 1 }, () =>
    Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = vehicles[i - 1];

    for (let w = 0; w <= capacity; w++) {
      if (Duration <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          Impact + dp[i - 1][w - Duration]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  Log("backend", "info", "utils", `Max impact computed: ${dp[n][capacity]}`);

  // Backtrack to find selected tasks
  let w = capacity;
  const selected = [];

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  Log("backend", "info", "domain", `Selected ${selected.length} tasks`);

  return {
    maxImpact: dp[n][capacity],
    selectedTasks: selected.reverse()
  };
}

module.exports = knapsack;