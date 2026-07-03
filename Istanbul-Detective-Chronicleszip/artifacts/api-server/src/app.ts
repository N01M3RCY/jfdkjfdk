import express from "express";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { logger } from "./lib/logger";
import router from "./routes";
import { seedIfEmpty } from "./seed";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/api/healthz",
    },
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Seed initial data
seedIfEmpty().catch((err) => {
  logger.error({ err }, "Failed to seed data");
});

export default app;
