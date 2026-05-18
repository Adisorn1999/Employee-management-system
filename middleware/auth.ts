import { RequestHandler } from "express";

import prisma from "../lib/prisma";
import { httpError, HttpError } from "../utils/errors";
import { verifyAccessToken } from "../services/token.service";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw httpError("Missing bearer token", 401);
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw httpError("User no longer exists", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    const authError = err as HttpError;
    authError.status = authError.status || 401;
    authError.message = authError.message || "Unauthorized";
    next(authError);
  }
};
