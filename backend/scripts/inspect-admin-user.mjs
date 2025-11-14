import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const email = 'admin@sistema.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Print non-sensitive fields + length of password hash
  console.log({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    passwordHashLength: user.password ? user.password.length : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  await prisma.$disconnect();
}

run().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
