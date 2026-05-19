import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { User } from "@prisma/client";

import prisma from "../lib/prisma";
import { httpError } from "../utils/errors";
import { hashToken } from "../utils/hash";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

const accessSecret = requireEnv("JWT_ACCESS_SECRET");
const refreshSecret = requireEnv("JWT_REFRESH_SECRET");
const accessExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

type AccessTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: string;
};

type RefreshTokenPayload = JwtPayload & {
  sub: string;
};

function getRefreshExpiryDate(): Date {
  const match = refreshExpiresIn.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error("REFRESH_TOKEN_EXPIRES_IN must look like 7d, 24h, or 30m");
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const milliseconds =
    unit === "d"
      ? amount * 24 * 60 * 60 * 1000
      : unit === "h"
        ? amount * 60 * 60 * 1000
        : amount * 60 * 1000;

  return new Date(Date.now() + milliseconds);
}

export function signAccessToken(user: Pick<User, "id" | "email" | "role">): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    accessSecret,
    { expiresIn: accessExpiresIn } as SignOptions
  );
}

function signRefreshToken(user: Pick<User, "id">): string {
  return jwt.sign({ sub: user.id }, refreshSecret, { expiresIn: refreshExpiresIn } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, accessSecret);
  if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
    throw httpError("Invalid access token", 401);
  }

  return payload as unknown as AccessTokenPayload;
}

function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, refreshSecret);
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw httpError("Invalid refresh token", 401);
  }

  return payload as unknown as RefreshTokenPayload;
}

export async function createRefreshToken(user: Pick<User, "id">): Promise<string> {
  const token = signRefreshToken(user);
  const tokenHash = hashToken(token);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: getRefreshExpiryDate(),
    },
  });

  return token;
}

export async function rotateRefreshToken(currentToken: string) {
  const payload = verifyRefreshToken(currentToken);
  const tokenHash = hashToken(currentToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !storedToken ||
    storedToken.userId !== payload.sub ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date()
  ) {
    throw httpError("Invalid refresh token", 401);
  }

  const nextToken = signRefreshToken(storedToken.user);
  const nextTokenHash = hashToken(nextToken);

  // Single transaction ensures the old token cannot be reused after rotation.
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedBy: nextTokenHash,
      },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: nextTokenHash,
        userId: storedToken.userId,
        expiresAt: getRefreshExpiryDate(),
      },
    }),
  ]);

  return {
    accessToken: signAccessToken(storedToken.user),
    refreshToken: nextToken,
    user: storedToken.user,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
