// Fix resolution of runtime imports that reference .js extensions in TS sources
// Jest/ts-jest will resolve these to the TypeScript modules
// Resolve runtime .js imports by mocking to the TypeScript modules
// Use requireActual so jest doesn't recurse when mocking TS modules
jest.mock('../src/lib/prisma', () => jest.requireActual('../src/lib/prisma'));
jest.mock('../src/types/auth', () => jest.requireActual('../src/types/auth'));
import { prisma } from '../src/lib/prisma';
import { ClientController } from '../src/controllers/clientController';
import { AuthenticatedRequest } from '../src/types/auth';

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
    // ensure fresh sqlite db
    try {
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
      const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      for (const t of tables as any[]) {
        try { await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \"${t.name}\";`); } catch (e) {}
      }
    } catch (e) {}
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
