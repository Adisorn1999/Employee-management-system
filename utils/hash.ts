import bcrypt from "bcrypt";
import crypto from "crypto";

const PASSWORD_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Refresh tokens are bearer secrets, so only a deterministic hash is stored.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
