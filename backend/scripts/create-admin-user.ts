import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

async function createAdminUser() {
  console.log('🔐 Criando usuário admin...\n');

  const email = 'admin@sistema.com';
  const password = 'admin123';
  const name = 'Administrador';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Senha: ${password}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

createAdminUser();