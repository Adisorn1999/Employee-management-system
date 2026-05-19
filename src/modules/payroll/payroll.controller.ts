import { RequestHandler } from "express";

export const listPayroll: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Payroll module is not implemented yet" });
};
