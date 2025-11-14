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

describe('Client CNPJ uniqueness', () => {
  beforeAll(async () => {
    // Ensure test DB is clean by removing existing clients
    try {
      await prisma.client.deleteMany({});
    } catch (e) {
      // ignore if table missing or other errors; tests will surface errors
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should prevent creating two clients with same CNPJ', async () => {
    const req1 = {
      body: {
        name: 'Empresa A',
        cnpj: '10.520.565/0001-53'
      },
      user: { id: 'test-user' }
    } as unknown as AuthenticatedRequest;

    const res1 = makeRes();
    await clientController.createClient(req1, res1 as any);
    const r1 = res1._get();
    expect(r1.statusCode).toBe(201);
    expect(r1.body.data.client).toBeDefined();

    // Attempt duplicate
    const req2 = {
      body: {
        name: 'Empresa B',
        cnpj: '10.520.565/0001-53'
      },
      user: { id: 'test-user' }
    } as unknown as AuthenticatedRequest;

    const res2 = makeRes();
    await clientController.createClient(req2, res2 as any);
    const r2 = res2._get();
    // Expect a 400 with error about CNPJ
    expect(r2.statusCode).toBe(400);
    expect(r2.body.error).toBeDefined();
    expect(String(r2.body.error).toLowerCase()).toContain('cnpj');
  });
});
