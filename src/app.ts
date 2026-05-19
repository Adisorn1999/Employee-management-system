import "dotenv/config";

import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.route";
import employeeRoutes from "./modules/employees/employee.route";
import { errorMiddleware } from "./middleware/error.middleware";
import { corsMiddleware } from "./plugins/cors";

const app = express();

app.use(helmet());
app.use(corsMiddleware);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);

app.use(errorMiddleware);

export default app;
