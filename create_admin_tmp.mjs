import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const email = "admin@sistema.com";
const password = "admin123";
const name = "Administrador";
(async () => {
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("exists", existing.email);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, password: hashed, name, role: "ADMIN" } });
      console.log("created", user.email);
    }
  } catch (e) {
    console.error("error", e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
