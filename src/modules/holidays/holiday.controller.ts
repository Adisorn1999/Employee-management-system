import { RequestHandler } from "express";

export const listHolidays: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Holidays module is not implemented yet" });
};
