import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      email: 'admin@sistema.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  // Also ensure legacy/admin compatibility email used by frontend
  await prisma.user.upsert({
    where: { email: 'admin@laudo.com' },
    update: {},
    create: {
      email: 'admin@laudo.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  // Create default sensor types (minimal set)
  const sensorTypes = [
    {
      name: 'Tipo A - Temperatura/Umidade',
      description: 'Sensor padrão',
      dataConfig: {
        temperatureColumn: 'B',
        humidityColumn: 'C',
        timestampColumn: 'A',
        startRow: 2,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
      }
    },
  ];

  for (const sensorType of sensorTypes) {
    const existing = await prisma.sensorType.findFirst({ where: { name: sensorType.name } });
    if (!existing) await prisma.sensorType.create({ data: sensorType as any });
  }

  // Ensure default report template
  const existingTemplate = await prisma.reportTemplate.findFirst({ where: { name: 'Template Padrão' } });
  if (!existingTemplate) {
    await prisma.reportTemplate.create({
      data: {
        name: 'Template Padrão',
        description: 'Template padrão',
        templatePath: '/templates/default.frx',
        isActive: true,
      },
    });
  }

  // Ensure example client (CNPJ 10.520.565/0001-53)
  const cnpj = '10.520.565/0001-53';
  const existingClient = await prisma.client.findFirst({ where: { cnpj } });
  if (!existingClient) {
    await prisma.client.create({
      data: {
        name: 'Cliente Seed',
        cnpj,
        street: 'Rua Seed',
        neighborhood: 'Bairro Seed',
        city: 'Cidade Seed',
        state: 'SS',
        complement: 'Complemento Seed',
      },
    });
  }

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

