import { RequestHandler } from "express";

import { httpError } from "../common/utils/errors";
import { authRepository } from "../modules/auth/auth.repository";

type RoleName = string;
type PermissionName = string;
type UserWithRoleAndPermissions = NonNullable<
  Awaited<ReturnType<typeof authRepository.findUserWithRoleAndPermissions>>
>;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

async function loadCurrentUser(reqUserId?: string): Promise<UserWithRoleAndPermissions> {
  if (!reqUserId) {
    throw httpError("Unauthorized", 401);
  }

  const user = await authRepository.findUserWithRoleAndPermissions(reqUserId);

  if (!user) {
    throw httpError("Unauthorized", 401);
  }

  return user;
}

function userRoleNames(user: UserWithRoleAndPermissions): string[] {
  return [user.authRole?.name, user.role].filter((roleName): roleName is string => Boolean(roleName)).map(normalize);
}

function userPermissionNames(user: UserWithRoleAndPermissions): string[] {
  return user.authRole?.permissions.map((rolePermission) => normalize(rolePermission.permission.name)) ?? [];
}

export function requireRole(...roles: RoleName[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = await loadCurrentUser(req.user?.id);
      const allowedRoles = roles.map(normalize);
      const currentRoles = userRoleNames(user);

      if (currentRoles.includes("super_admin") || currentRoles.some((roleName) => allowedRoles.includes(roleName))) {
        return next();
      }

      return next(httpError("Forbidden", 403));
    } catch (err) {
      return next(err);
    }
  };
}

export function requirePermission(...permissions: PermissionName[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = await loadCurrentUser(req.user?.id);
      const currentRoles = userRoleNames(user);

      if (currentRoles.includes("super_admin")) {
        return next();
      }

      const allowedPermissions = permissions.map(normalize);
      const currentPermissions = userPermissionNames(user);

      if (currentPermissions.some((permission) => allowedPermissions.includes(permission))) {
        return next();
      }

      return next(httpError("Forbidden", 403));
    } catch (err) {
      return next(err);
    }
  };
}
