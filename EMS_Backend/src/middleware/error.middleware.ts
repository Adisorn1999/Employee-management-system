import { ErrorRequestHandler } from "express";

import { HttpError } from "../common/utils/errors";

export const errorMiddleware: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({ message });
};
