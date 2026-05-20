import prisma from "../../config/prisma";

export const authRepository = {
  findUserByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
  findUserById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findUserWithRoleAndPermissions: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        authRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
};
