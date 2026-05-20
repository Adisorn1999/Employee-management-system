import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.route";
import departmentRoutes from "./modules/employees/department.route";
import employeeRoutes from "./modules/employees/employee.route";
import positionRoutes from "./modules/employees/position.route";
import shiftRoutes from "./modules/shifts/shift.route";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/shifts", shiftRoutes);

app.use(errorMiddleware);

export default app;
