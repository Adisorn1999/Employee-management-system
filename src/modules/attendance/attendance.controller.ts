import { RequestHandler } from "express";

export const listAttendance: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Attendance module is not implemented yet" });
};
