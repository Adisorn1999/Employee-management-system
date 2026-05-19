import prisma from "../../config/prisma";

export const authRepository = {
  findUserByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
  findUserById: (id: string) => prisma.user.findUnique({ where: { id } }),
};
