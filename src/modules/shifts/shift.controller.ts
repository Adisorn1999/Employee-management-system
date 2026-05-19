import { RequestHandler } from "express";

export const listShifts: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Shifts module is not implemented yet" });
};
