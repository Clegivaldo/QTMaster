const puppeteer = require('puppeteer');

(async () => {
  const editorUrl = process.env.EDITOR_URL || 'http://localhost:3000/editor-layout';
  const loginUrl = process.env.LOGIN_URL || 'http://localhost:3000/login';
  console.log('E2E: login', loginUrl);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  try {
    // If a TEST_ACCESS_TOKEN is provided, inject it into localStorage and skip the interactive login
    let accessToken = process.env.TEST_ACCESS_TOKEN;
    const refreshToken = process.env.TEST_REFRESH_TOKEN || accessToken;

    // If no TEST_ACCESS_TOKEN but TEST_EMAIL/TEST_PASSWORD are provided, try direct API login to obtain a token
    const apiBase = process.env.API_BASE || 'http://localhost:5000/api';
    if (!accessToken && process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
      try {
        console.log('Attempting API login to', apiBase + '/auth/login');
        const resp = await fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }),
        });
        const json = await resp.json();
        // Support a few possible response shapes to find the token
        accessToken = json?.data?.data?.accessToken || json?.data?.accessToken || json?.accessToken || json?.token;
        if (accessToken) console.log('Obtained access token from API login');
        else console.warn('API login returned no access token, response snapshot:', JSON.stringify(json).slice(0, 500));
      } catch (err) {
        console.warn('API login attempt failed:', String(err));
      }
    }
    if (accessToken) {
      // Navigate to app origin then set localStorage so the app sees the token
      await page.goto(process.env.EDITOR_URL || 'http://localhost:3000', { waitUntil: 'networkidle2' });
      await page.evaluate((t, r) => {
        localStorage.setItem('accessToken', t);
        if (r) localStorage.setItem('refreshToken', r);
      }, accessToken, refreshToken);
      console.log('Injected TEST_ACCESS_TOKEN into localStorage');
      // go to editor route directly
      await page.goto(editorUrl, { waitUntil: 'networkidle2' });
    } else {
      // Navigate to login and perform login with demo credentials
      await page.goto(loginUrl, { waitUntil: 'networkidle2' });
      console.log('Login page loaded');

      // Fill credentials explicitly and verify the input values
      await page.waitForSelector('input[placeholder="seu@email.com"]', { timeout: 10000 });
      await page.waitForSelector('input[placeholder="Sua senha"]', { timeout: 10000 });
      await page.click('input[placeholder="seu@email.com"]', { clickCount: 3 });
      await page.type('input[placeholder="seu@email.com"]', process.env.TEST_EMAIL || 'admin@example.com', { delay: 50 });
      await page.click('input[placeholder="Sua senha"]', { clickCount: 3 });
      await page.type('input[placeholder="Sua senha"]', process.env.TEST_PASSWORD || 'AdminPassword123!', { delay: 50 });

      // verify values were set
      const values = await page.evaluate(() => {
        const e = document.querySelector('input[placeholder="seu@email.com"]');
        const p = document.querySelector('input[placeholder="Sua senha"]');
        return { email: e ? e.value : null, password: p ? p.value : null };
      });
      console.log('Filled credentials snapshot:', values);

      // submit
      await page.click('button[type=submit]');
      console.log('Submitted login');

      // Wait for login to complete: either navigation occurs or login form disappears
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 });
      } catch (e) {
        // navigation may not happen; wait until login form is gone
        try {
          await page.waitForFunction(() => !document.querySelector('input[placeholder="seu@email.com"]'), { timeout: 10000 });
        } catch (err) {
          // If login didn't proceed, dump a small page snapshot to help debugging
          try {
            const snippet = await page.evaluate(() => document.body.innerText.slice(0, 2000));
            console.error('Login did not complete, page snapshot:\n', snippet);
          } catch (e2) {
            console.error('Failed to read page snapshot after login failure');
          }
          throw err;
        }
      }
      // After successful login, navigate to editor route
      await page.goto(editorUrl, { waitUntil: 'networkidle2' });
    }

    // Now go to the editor directly
    console.log('Navigating to editor', editorUrl);
    await page.goto(editorUrl, { waitUntil: 'networkidle2' });

    // Wait for editor title (localized) — give more time for the SPA to mount
    await page.waitForFunction(() => {
      const h = document.querySelector('h1');
      return !!h && h.textContent && h.textContent.trim().length > 0;
    }, { timeout: 30000 });
    console.log('Editor loaded');

    // Open Page Settings modal (click a button with title="Configurações da página")
    const settingsButtons = await page.$$('[title="Configurações da página"]');
    if (!settingsButtons || settingsButtons.length === 0) throw new Error('Page settings button not found');
    // click the last one (right-side)
    await settingsButtons[settingsButtons.length - 1].click();
    console.log('Clicked Page Settings');

    // Wait for modal title
    await page.waitForFunction(() => {
      const h = Array.from(document.querySelectorAll('h3')).find(x => x.textContent && x.textContent.includes('Configurações da Página'));
      return !!h;
    }, { timeout: 10000 });

    // Enable Header checkbox by label text
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const lab = labels.find(l => l.textContent && l.textContent.includes('Cabeçalho habilitado'));
      if (!lab) return console.warn('Header label not found');
      const cb = lab.querySelector('input[type=checkbox]');
      try { if (cb && !cb.checked) cb.click(); } catch (e) { /* ignore */ }
    });
    console.log('Checked Cabeçalho habilitado');

    // Enable replicate (Replicar em todas as páginas) if present
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const lab = labels.find(l => l.textContent && l.textContent.includes('Replicar em todas as páginas'));
      if (!lab) return console.warn('Replicate label not found');
      const cb = lab.querySelector('input[type=checkbox]');
      try { if (cb && !cb.checked) cb.click(); } catch (e) { /* ignore */ }
    });
    console.log('Checked Replicar em todas as páginas (if present)');

    // Click Apply button (avoid $x for compatibility — find button by text and click)
    const applied = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.trim().includes('Aplicar Configurações'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!applied) throw new Error('Apply button not found');
    console.log('Clicked Aplicar Configurações');

    // Wait for modal to close
    await sleep(500);
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('h3')).some(h => h.textContent && h.textContent.includes('Configurações da Página')),
      { timeout: 5000 });

    // Click header resize handle to select header region
    await page.waitForSelector('[data-testid="header-resize-handle"]', { timeout: 5000 });
    await page.click('[data-testid="header-resize-handle"]');
    console.log('Clicked header resize handle');

  // Wait briefly and check that 'Aparência' and 'Camadas' are NOT visible
  await sleep(300);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasAparencia = bodyText.includes('Aparência');
    const hasCamadas = bodyText.includes('Camadas');

    console.log('Aparência present?', hasAparencia);
    console.log('Camadas present?', hasCamadas);

    if (hasAparencia || hasCamadas) {
      throw new Error('Appearance or Layers sections are present after selecting header — expected hidden');
    }

    console.log('Header selection hides Aparência and Camadas as expected');

    // Add a new page using the toolbar Add Page button (title 'Adicionar página')
    const addButtons = await page.$$('[title="Adicionar página"]');
    if (!addButtons || addButtons.length === 0) throw new Error('Add Page button not found');
    await addButtons[0].click();
    console.log('Clicked Add Page');

    // Navigate to next page using pagination arrow '›' at bottom (avoid $x)
    const navigatedNext = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.trim() === '›');
      if (btn) { btn.click(); return true; }
      // try buttons that contain › inside
      const btn2 = btns.find(b => b.textContent && b.textContent.includes('›'));
      if (btn2) { btn2.click(); return true; }
      return false;
    });
    if (navigatedNext) console.log('Navigated to next page');
    else console.warn('Next page button not found; continuing without explicit navigation');

  // Wait and then check header handle exists (replication)
  await sleep(500);
    const headerExists = await page.$('[data-testid="header-resize-handle"]') !== null;
    console.log('Header handle exists on new page?', headerExists);
    if (!headerExists) throw new Error('Header not found on new page — replication likely failed');

    console.log('Replication check passed');

    console.log('E2E validation succeeded');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E validation failed:', err);
    await browser.close();
    process.exit(2);
  }
})();
