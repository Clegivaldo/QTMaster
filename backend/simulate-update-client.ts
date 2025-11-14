import { ClientController } from './src/controllers/clientController';

const controller = new ClientController();

async function run() {
  const clientId = 'cmhwdbpxx0001ut6ocogbfax4';

  const req: any = {
    params: { id: clientId },
    body: {
      name: 'Cliente Atualizado via Simulação',
      street: 'Rua Simulada',
      neighborhood: 'Bairro Simulado',
      city: 'Cidade Simulada',
      state: 'SS',
      complement: 'Sala Sim',
      cnpj: '10.520.565/0001-53'
    },
    user: { id: 'system' }
  };

  const res: any = {
    status(code: number) { this._status = code; return this; },
    json(obj: any) { console.log('RESPONSE status=' + (this._status||200)); console.log(JSON.stringify(obj, null, 2)); return obj; }
  };

  try {
    await controller.updateClient(req, res);
    console.log('Controller updateClient finished.');
  } catch (err) {
    console.error('Controller threw:', err);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
