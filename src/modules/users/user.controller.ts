import { RequestHandler } from "express";

export const listUsers: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Users module is not implemented yet" });
};
