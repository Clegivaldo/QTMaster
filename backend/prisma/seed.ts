import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      email: 'admin@sistema.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create default sensor types
  const sensorTypes = [
    {
      name: 'Tipo A - Temperatura/Umidade',
      description: 'Sensor padrão para medição de temperatura e umidade',
      dataConfig: {
        temperatureColumn: 'B',
        humidityColumn: 'C',
        timestampColumn: 'A',
        startRow: 2,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
      }
    },
    {
      name: 'Tipo B - Temperatura Only',
      description: 'Sensor apenas para temperatura',
      dataConfig: {
        temperatureColumn: 'A',
        humidityColumn: null,
        timestampColumn: 'B',
        startRow: 3,
        dateFormat: 'YYYY-MM-DD HH:mm:ss'
      }
    },
    {
      name: 'Tipo C - Multi-sensor',
      description: 'Sensor com múltiplos pontos de medição',
      dataConfig: {
        temperatureColumn: 'C',
        humidityColumn: 'D',
        timestampColumn: 'A',
        startRow: 1,
        dateFormat: 'MM/DD/YYYY HH:mm'
      }
    }
  ];

  for (const sensorType of sensorTypes) {
    const existing = await prisma.sensorType.findFirst({
      where: { name: sensorType.name }
    });
    
    if (!existing) {
      await prisma.sensorType.create({
        data: sensorType,
      });
    }
  }

  console.log('✅ Sensor types created');

  // Create default report template
  const existingTemplate = await prisma.reportTemplate.findFirst({
    where: { name: 'Template Padrão' }
  });
  
  if (!existingTemplate) {
    await prisma.reportTemplate.create({
      data: {
        name: 'Template Padrão',
        description: 'Template padrão para laudos de qualificação térmica',
        templatePath: '/templates/default.frx',
        isActive: true,
      },
    });
  }

  console.log('✅ Default report template created');

  console.log('🎉 Database seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });