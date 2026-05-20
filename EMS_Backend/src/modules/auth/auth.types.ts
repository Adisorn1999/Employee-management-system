import type { Role } from "@prisma/client";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: Role;
};
