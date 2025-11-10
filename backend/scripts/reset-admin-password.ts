import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

async function resetAdminPassword() {
  console.log('🔐 Resetando senha do admin...\n');

  const newPassword = 'admin123'; // Senha temporária

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user
    const user = await prisma.user.update({
      where: { email: 'admin@sistema.com' },
      data: { password: hashedPassword },
    });

    console.log('✅ Senha resetada com sucesso!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nova senha: ${newPassword}`);
    console.log(`   Hash: ${hashedPassword.substring(0, 20)}...\n`);

    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      console.error('❌ Usuário admin@sistema.com não encontrado!');
      console.log('\n📋 Usuários existentes:');
      
      const users = await prisma.user.findMany({
        select: { email: true, id: true }
      });
      
      users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
    } else {
      console.error('❌ Erro:', error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}

resetAdminPassword();
