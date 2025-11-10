import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('👤 Criando usuário admin...\n');

  const email = 'admin@sistema.com';
  const password = 'admin123';
  const name = 'Administrador';

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Senha: ${password}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      console.error('❌ Usuário já existe!');
      console.log('\nListando usuários existentes:');
      
      const users = await prisma.user.findMany({
        select: { email: true, id: true, role: true }
      });
      
      users.forEach(u => console.log(`  - ${u.email} (${u.role}) - ID: ${u.id}`));
    } else {
      console.error('❌ Erro:', error instanceof Error ? error.message : error);
      console.error(error);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdminUser();
