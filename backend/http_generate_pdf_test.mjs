#!/usr/bin/env node

(async () => {
  try {
    const loginResp = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sistema.com', password: 'admin123' })
    });

    const loginJson = await loginResp.json();
    // Support both response shapes: { data: { accessToken } } and { data: { tokens: { accessToken } } }
    const token = loginJson?.data?.accessToken || loginJson?.data?.tokens?.accessToken;
    if (!token) {
      console.error('Login failed', JSON.stringify(loginJson, null, 2));
      process.exit(2);
    }
    console.log('TOKEN found, length', token.length);

    const pdfResp = await fetch('http://localhost:5000/api/editor-templates/90d40721-03e5-4bd4-b891-ab4d52976fcd/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ validationId: 'cmij6y6ag0001mg07zgl6cvyd' })
    });

    if (pdfResp.status !== 200) {
      const body = await pdfResp.text();
      console.error('PDF endpoint failed:', pdfResp.status, body);
      process.exit(3);
    }

    const arr = new Uint8Array(await pdfResp.arrayBuffer());
    const fs = await import('fs/promises');
    await fs.writeFile('/tmp/http_generated_report.pdf', arr);
    console.log('PDF generated and saved to /tmp/http_generated_report.pdf');
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(4);
  }
})();
