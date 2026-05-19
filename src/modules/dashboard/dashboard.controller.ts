import { RequestHandler } from "express";

export const getDashboard: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Dashboard module is not implemented yet" });
};
