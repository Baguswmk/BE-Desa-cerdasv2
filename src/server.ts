import app from "./app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 5858;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});
