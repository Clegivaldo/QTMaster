import fetch from 'node-fetch';

async function test() {
  const url = 'http://localhost:5000/api/auth/login';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'admin123' }),
  });
  const text = await resp.text();
  console.log('status', resp.status);
  console.log('headers', JSON.stringify(Object.fromEntries(resp.headers.entries())));
  console.log('body:', text);
}

test().catch((e) => { console.error(e); process.exit(1); });
