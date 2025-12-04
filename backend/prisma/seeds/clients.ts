import { PrismaClient } from '@prisma/client';
import { logger } from '../../src/utils/logger.js';

const prisma = new PrismaClient();

export async function seedClients() {
  try {
    logger.info('Seeding clients...');

    const clients = [
      {
        name: 'Frios do Sul Indústria e Comércio Ltda',
        email: 'contato@friosdosul.com.br',
        phone: '+55 (47) 3021-4450',
        street: 'Av. das Américas, 1200',
        neighborhood: 'Centro',
        city: 'Florianópolis',
        state: 'SC',
        complement: 'Prédio 2 - Sala 10',
        cnpj: '12.345.678/0001-90',
      },
      {
        name: 'Laboratório Central Saúde e Qualidade LTDA',
        email: 'sac@labcentral.com.br',
        phone: '+55 (11) 4002-8922',
        street: 'Rua das Flores, 745',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        complement: 'Bloco B',
        cnpj: '98.765.432/0001-10',
      },
      {
        name: 'Distribuidora Norte Produtos Médicos',
        email: 'vendas@norte-med.com.br',
        phone: '+55 (81) 3030-1010',
        street: 'Av. Principal, 1578',
        neighborhood: 'Pina',
        city: 'Recife',
        state: 'PE',
        complement: '',
        cnpj: '22.333.444/0001-55',
      },
      {
        name: 'Alimentos e Bebidas do Cerrado SA',
        email: 'financeiro@cerradofoods.com',
        phone: '+55 (62) 3311-2200',
        street: 'Rod. BR-153, Km 12',
        neighborhood: 'Distrito Industrial',
        city: 'Goiânia',
        state: 'GO',
        complement: 'Galpão 4',
        cnpj: '33.444.555/0001-66',
      },
      {
        name: 'Clínica Vida e Saúde',
        email: 'contato@clinicavida.com.br',
        phone: '+55 (21) 2233-4455',
        street: 'Praça da Saúde, 210',
        neighborhood: 'Botafogo',
        city: 'Rio de Janeiro',
        state: 'RJ',
        complement: 'Sala 3',
        cnpj: '44.555.666/0001-77',
      },
    ];

    for (const c of clients) {
      const exists = await prisma.client.findFirst({ where: { cnpj: c.cnpj } });
      if (exists) {
        logger.info(`Client ${c.name} exists, skipping`);
        continue;
      }

      await prisma.client.create({ data: c as any });
      logger.info(`Created client ${c.name}`);
    }

    logger.info('Client seeds completed');
  } catch (error) {
    logger.error('Error seeding clients:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
