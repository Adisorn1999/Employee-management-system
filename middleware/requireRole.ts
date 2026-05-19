import { Role } from "@prisma/client";
import { RequestHandler } from "express";

import { httpError } from "../utils/errors";

/**
 * ใช้ต่อจาก requireAuth เสมอ
 * ตัวอย่าง: router.get("/admin", requireAuth, requireRole("ADMIN"), handler)
 * รับ roles หลายตัวได้: requireRole("ADMIN", "STAFF")
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(httpError("Unauthorized", 401));
    }

    if (!roles.includes(userRole as Role)) {
      return next(httpError("Forbidden: insufficient role", 403));
    }

    next();
  };
}