import { CookieOptions, RequestHandler } from "express";
import { User } from "@prisma/client";
import { ZodError, z } from "zod";

import prisma from "../../config/prisma";
import {
  createRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from "./auth.service";
import { HttpError, httpError } from "../../common/utils/errors";
import { hashPassword, verifyPassword } from "../../common/utils/hash";

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "username ใช้ได้เฉพาะ a-z, 0-9, _"),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(128),
});

export type PublicUser = Pick<User, "id" | "username" | "name" | "role" | "createdAt" | "updatedAt">;

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
  };
}

function publicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((item) => item.message).join(", "), 400);
  }
  return err;
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { username: data.username } });

    if (existingUser) {
      throw httpError("Username is already taken", 409);
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        name: data.name,
        passwordHash: await hashPassword(data.password),
      },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());
    res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: data.username } });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw httpError("Invalid username or password", 401);
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());
    res.status(200).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken as string | undefined;

    if (!token) {
      throw httpError("Missing refresh token", 401);
    }

    const rotated = await rotateRefreshToken(token);

    res.cookie("refreshToken", rotated.refreshToken, refreshCookieOptions());
    res.status(200).json({
      accessToken: rotated.accessToken,
      user: publicUser(rotated.user),
    });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken as string | undefined;

    if (token) {
      await revokeRefreshToken(token);
    }

    res.clearCookie("refreshToken", refreshCookieOptions());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const profile: RequestHandler = async (req, res) => {
  res.status(200).json({ user: req.user });
};
