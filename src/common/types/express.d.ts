import type { Role } from "@prisma/client";
import type { PublicUser } from "../../modules/auth/auth.controller";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser & { role: Role };
    }
  }
}

export {};
