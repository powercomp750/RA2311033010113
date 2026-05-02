const Log = require("./logging_middleware/logger");

(async () => {
  const res = await Log(
    "backend",
    "info",
    "service",
    "Logger test successful"
  );

  console.log(res);
})();