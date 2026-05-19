import type { PublicUser } from "../controllers/auth.controller";

declare global {
  namespace Express {
    interface Request {
       user?: PublicUser & { role: Role };
     
    }
  }
}

export {};
