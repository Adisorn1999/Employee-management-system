import { RequestHandler } from "express";

export const listAuditLogs: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Audit log module is not implemented yet" });
};
