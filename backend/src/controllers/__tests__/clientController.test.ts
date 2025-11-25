import { prisma } from '../../../lib/prisma.js';
import { ClientController } from '../../clientController.js';
import { AuthenticatedRequest } from '../../../types/auth.js';

const clientController = new ClientController();

function makeRes() {
  let statusCode = 200;
  let body: any = null;
  const res: any = {
    status: (code: number) => { statusCode = code; return res; },
    json: (b: any) => { body = b; return res; },
    _get: () => ({ statusCode, body }),
  };
  return res;
}

describe('ClientController integration', () => {
  beforeAll(async () => {
    // ensure test DB is clean
    try {
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
      const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      for (const t of tables as any[]) {
        try { await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \"${t.name}\";`); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and updates a client including address fields', async () => {
    const reqCreate = {
      body: {
        name: 'Empresa Teste',
        cnpj: '10.520.565/0001-53',
        street: 'Av. Teste',
        neighborhood: 'Bairro Teste',
        city: 'Cidade',
        state: 'SP',
        complement: 'Sala 1'
      },
      user: { id: 'test-user' }
    } as unknown as AuthenticatedRequest;

    const resCreate = makeRes();
    await clientController.createClient(reqCreate, resCreate as any);
    const created = resCreate._get().body.data.client;
    expect(created).toBeDefined();
    expect(created.cnpj).toBeTruthy();

    // Update client: change street
    const reqUpdate = {
      params: { id: created.id },
      body: { street: 'Rua Atualizada' },
      user: { id: 'test-user' }
    } as unknown as AuthenticatedRequest;
    const resUpdate = makeRes();
    await clientController.updateClient(reqUpdate, resUpdate as any);
    const updated = resUpdate._get().body.data.client;
    expect(updated.street).toBe('Rua Atualizada');
  });
});
import { prisma } from '../../lib/prisma.js';
import { ClientController } from '../clientController.js';
import { jest } from '@jest/globals';

// Simple mocks for Express req/res
const makeReq = (body = {}, user = { id: 'test-user' } as any) => ({ body, user } as any);
const makeRes = () => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

describe('ClientController', () => {
  const controller = new ClientController();

  beforeAll(async () => {
    // Ensure test DB is clean
    await prisma.client.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a client with address fields from CNPJ lookup', async () => {
    const cnpj = '10.520.565/0001-53';
    const body = {
      name: 'Cliente Teste CNPJ',
      cnpj,
      street: 'Rua Teste',
      neighborhood: 'Bairro Teste',
      city: 'Cidade Teste',
      state: 'ST',
      complement: 'Apt 12'
    };

    const req = makeReq(body, { id: 'test-user' } as any);
    const res = makeRes();

    await controller.createClient(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();

    const responseArg = res.json.mock.calls[0][0];
    expect(responseArg.success).toBe(true);
    const created = responseArg.data.client;
    expect(created.cnpj).toBe(cnpj);
    expect(created.street).toBe('Rua Teste');
  });
});
