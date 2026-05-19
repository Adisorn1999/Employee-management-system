import { RequestHandler } from "express";

export const auditMiddleware: RequestHandler = (_req, _res, next) => {
  next();
};
