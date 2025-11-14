import fetch from 'node-fetch';

const BASE = 'http://localhost:5000/api';
const ADMIN = { email: 'admin@sistema.com', password: 'admin123' };
const clientId = 'cmhwdbpxx0001ut6ocogbfax4';

async function run(){
  try{
    console.log('Logging in...');
    const loginRes = await fetch(`${BASE}/auth/login`,{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const loginJson = await loginRes.json();
    console.log('Login status', loginRes.status);
    if(!loginRes.ok){ console.error('Login failed:', loginJson); process.exit(1); }
    const token = loginJson.data?.accessToken || loginJson.accessToken || loginJson.data?.token;
    console.log('Token:', !!token);

    const body = {
      name: 'Cliente Atualizado HTTP',
      street: 'Rua HTTP',
      neighborhood: 'Bairro HTTP',
      city: 'Cidade HTTP',
      state: 'HT',
      complement: 'Comp HTTP'
    };

    console.log('Sending PUT /clients/' + clientId);
    const putRes = await fetch(`${BASE}/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const putJson = await putRes.json();
    console.log('PUT status', putRes.status);
    console.log(JSON.stringify(putJson, null, 2));

    process.exit(0);
  }catch(e){
    console.error('Error', e);
    process.exit(1);
  }
}

run();
