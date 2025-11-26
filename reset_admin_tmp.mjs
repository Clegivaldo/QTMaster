import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const email = "admin@sistema.com";
const password = "admin123";
(async () => {
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { email }, data: { password: hashed } });
    console.log("updated", user.email);
  } catch (e) {
    console.error("error", e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
