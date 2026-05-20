import "dotenv/config";

import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

app.listen(env.port, () => {
  logger.info(`Employee Management API listening on port ${env.port}`);
});
