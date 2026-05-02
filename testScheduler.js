const knapsack = require("./vehicle_maintence_scheduler/scheduler");

const vehicles = [
  { TaskID: "1", Duration: 2, Impact: 10 },
  { TaskID: "2", Duration: 3, Impact: 5 },
  { TaskID: "3", Duration: 5, Impact: 15 }
];

const capacity = 5;

const result = knapsack(vehicles, capacity);

console.log(result);