#!/usr/bin/env node

(async () => {
  try {
    const resp = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sistema.com', password: 'admin123' })
    });
    const loginJson = await resp.json();
    const token = loginJson?.data?.accessToken || loginJson?.data?.tokens?.accessToken;
    if (!token) {
      console.error('Login failed', JSON.stringify(loginJson, null, 2));
      process.exit(2);
    }

    const ids = [
      '90d40721-03e5-4bd4-b891-ab4d52976fcd',
      '90d40721-03e5-4bd4-b891-ab4d52976fcd',
      '90d40721-03e5-4bd4-b891-ab4d52976fcd'
    ];

    const jobs = ids.map(async (id, idx) => {
      const pdfResp = await fetch(`http://localhost:5000/api/editor-templates/${id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ validationId: 'cmij6y6ag0001mg07zgl6cvyd' })
      });
      const status = pdfResp.status;
      if (status !== 200) {
        const body = await pdfResp.text();
        return { idx, status, error: body };
      }
      const arr = new Uint8Array(await pdfResp.arrayBuffer());
      const fs = await import('fs/promises');
      const outPath = `/tmp/http_generated_report_${idx}.pdf`;
      await fs.writeFile(outPath, arr);
      return { idx, status, outPath };
    });

    const results = await Promise.all(jobs);
    console.log('Concurrent results:', results);
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(3);
  }
})();
