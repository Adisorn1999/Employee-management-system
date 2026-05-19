import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import helmet from "helmet";

import authRoutes from "../routes/auth.routes";
import employeeRoutes from "../routes/employee.routes";
import { HttpError } from "../utils/errors";

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth",      authRoutes);
app.use("/api/employees", employeeRoutes);

const errorHandler: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({ message });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Auth API listening on port ${port}`);
});