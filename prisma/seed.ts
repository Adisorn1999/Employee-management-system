import prisma from "../src/config/prisma";

async function main() {
  await prisma.$connect();
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
