import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createClient() {
  const id = randomUUID();
  const cnpj = '10.520.565/0001-53';
  try {
    const client = await prisma.client.create({
      data: {
        id,
        cnpj,
        name: 'Cliente de Teste',
        street: 'Rua Exemplo',
        neighborhood: 'Bairro Teste',
        city: 'Cidade Teste',
        state: 'ST',
        complement: 'Sala 1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Cliente criado:', client);
  } catch (err) {
    console.error('Erro criando cliente:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createClient();
