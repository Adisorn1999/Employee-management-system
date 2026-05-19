import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { User } from "@prisma/client";
import { randomUUID } from "crypto";

import prisma from "../../config/prisma";
import { httpError } from "../../common/utils/errors";
import { hashToken } from "../../common/utils/hash";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

const accessSecret = requireEnv("JWT_ACCESS_SECRET");
const refreshSecret = requireEnv("JWT_REFRESH_SECRET");
const accessExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

type AccessTokenPayload = JwtPayload & {
  sub: string;
  username: string;
  role: string;
};

type RefreshTokenPayload = JwtPayload & {
  sub: string;
  sessionId: string;
};

export type SessionMetadata = {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
};

function getRefreshExpiryDate(): Date {
  const match = refreshExpiresIn.match(/^(\d+)([dhm])$/);
  if (!match) throw new Error("REFRESH_TOKEN_EXPIRES_IN must look like 7d, 24h, or 30m");

  const amount = Number(match[1]);
  const unit = match[2];
  const milliseconds =
    unit === "d" ? amount * 24 * 60 * 60 * 1000
    : unit === "h" ? amount * 60 * 60 * 1000
    : amount * 60 * 1000;

  return new Date(Date.now() + milliseconds);
}

export function signAccessToken(user: Pick<User, "id" | "username" | "role">): string {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    accessSecret,
    { expiresIn: accessExpiresIn } as SignOptions
  );
}

function signRefreshToken(user: Pick<User, "id">, sessionId: string): string {
  return jwt.sign({ sub: user.id, sessionId }, refreshSecret, { expiresIn: refreshExpiresIn } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, accessSecret);
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.username !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw httpError("Invalid access token", 401);
  }
  return payload as unknown as AccessTokenPayload;
}

function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, refreshSecret);
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    throw httpError("Invalid refresh token", 401);
  }
  return payload as unknown as RefreshTokenPayload;
}

export async function createSessionRefreshToken(
  user: Pick<User, "id">,
  metadata: SessionMetadata = {}
): Promise<string> {
  const sessionId = randomUUID();
  const token = signRefreshToken(user, sessionId);
  const refreshTokenHash = hashToken(token);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceName: metadata.deviceName,
      expiresAt: getRefreshExpiryDate(),
    },
  });

  return token;
}

export async function rotateRefreshToken(currentToken: string) {
  const payload = verifyRefreshToken(currentToken);
  const refreshTokenHash = hashToken(currentToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.refreshTokenHash !== refreshTokenHash
  ) {
    throw httpError("Invalid refresh token", 401);
  }

  const nextToken = signRefreshToken(session.user, session.id);
  const nextRefreshTokenHash = hashToken(nextToken);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: nextRefreshTokenHash,
      expiresAt: getRefreshExpiryDate(),
    },
  });

  return {
    accessToken: signAccessToken(session.user),
    refreshToken: nextToken,
    user: session.user,
  };
}

export async function revokeCurrentSession(token: string): Promise<void> {
  const payload = verifyRefreshToken(token);
  await prisma.session.updateMany({
    where: {
      id: payload.sessionId,
      userId: payload.sub,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
