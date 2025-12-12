import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const out = { console: [], errors: [], network: [], pages: {} };
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  page.on('console', msg => {
    out.console.push({ type: msg.type(), text: msg.text() });
    console.log('PAGE CONSOLE', msg.type(), msg.text());
  });
  page.on('pageerror', err => {
    out.errors.push(String(err));
    console.error('PAGE ERROR', err);
  });
  page.on('requestfailed', req => {
    out.network.push({ url: req.url(), method: req.method(), failure: req.failure() });
    console.warn('REQUEST FAILED', req.url(), req.failure && req.failure().errorText);
  });
  // capture JSON responses from API endpoints
  page.on('response', async res => {
    try {
      const url = res.url();
      if (url.includes('/api/')) {
        const headers = res.headers();
        const ct = headers['content-type'] || headers['Content-Type'] || '';
        let body = null;
        if (ct.includes('application/json')) {
          try {
            const txt = await res.text();
            body = JSON.parse(txt);
          } catch (e) {
            body = await res.text().catch(()=>null);
          }
        }
        out.network.push({ url, status: res.status(), headers, body });
        console.log('CAPTURED API RESPONSE', url, res.status());
      }
    } catch (e) { /* ignore */ }
  });

  try {
    const base = process.env.BASE || 'http://localhost:3001';
    console.log('Base URL:', base);
    await page.goto(base + '/login', { waitUntil: 'networkidle2' });
    // tenta detectar se já está autenticado (link de validações presente)
    const isAuthenticated = await page.evaluate(() => !!document.querySelector('a[href*="/validations/"]'));
    console.log('Já autenticado?:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('Tentando logar usando múltiplos seletores...');
      const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email', 'input[placeholder*="email"]', 'input[aria-label*="email"]'];
      const passwordSelectors = ['input[name="password"]', 'input[type="password"]', '#password', 'input[placeholder*="senha"]', 'input[aria-label*="senha"]'];
      const email = process.env.DEMO_EMAIL || 'admin@laudo.com';
      const password = process.env.DEMO_PASSWORD || 'admin123';

      let filled = false;
      let usedPasswordSelector = null;
      for (const sel of emailSelectors) {
        const el = await page.$(sel).catch(()=>null);
        if (el) {
          await page.type(sel, email, { delay: 20 }).catch(()=>{});
          filled = true;
          console.log('Preencheu email com seletor:', sel);
          break;
        }
      }
      for (const sel of passwordSelectors) {
        const el = await page.$(sel).catch(()=>null);
        if (el) {
          await page.type(sel, password, { delay: 20 }).catch(()=>{});
          filled = true;
          usedPasswordSelector = sel;
          console.log('Preencheu senha com seletor:', sel);
          break;
        }
      }

      // tenta clicar em um botão por vários critérios (type=submit ou texto)
      const clicked = await (async () => {
        const byType = await page.$('button[type="submit"]').catch(()=>null);
        if (byType) { await byType.click().catch(()=>{}); return true; }
        // busca botão por texto comum
        const wantedTexts = ['Entrar', 'Login', 'Entrar no sistema', 'Acessar'];
        const found = await page.evaluate((texts) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const b of buttons) {
            const txt = (b.innerText || '').trim();
            for (const t of texts) if (txt.includes(t)) return true;
          }
          const anchors = Array.from(document.querySelectorAll('a'));
          for (const a of anchors) {
            const txt = (a.innerText || '').trim();
            for (const t of texts) if (txt.includes(t)) return true;
          }
          return false;
        }, wantedTexts);
        if (found) {
          await page.evaluate((texts) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const b of buttons) {
              const txt = (b.innerText || '').trim();
              for (const t of texts) if (txt.includes(t)) { b.click(); return; }
            }
            const anchors = Array.from(document.querySelectorAll('a'));
            for (const a of anchors) {
              const txt = (a.innerText || '').trim();
              for (const t of texts) if (txt.includes(t)) { a.click(); return; }
            }
          }, wantedTexts).catch(()=>{});
          return true;
        }
        return false;
      })();

      if (filled || clicked) {
        // tenta submeter o formulário de várias maneiras para suportar diferentes implementações
        try {
          if (!clicked && usedPasswordSelector) {
            // press Enter on password input
            try {
              await page.focus(usedPasswordSelector);
              await page.keyboard.press('Enter');
              console.log('Pressionou Enter no campo de senha');
            } catch (e) { /* ignore */ }
          }
          // try to submit nearest form if present
          await page.evaluate(() => {
            try {
              const input = document.querySelector('input[type=password], input[type="password"], input[name=password], input[name=\"password\"]');
              const form = input ? input.closest('form') : null;
              if (form) { form.submit(); }
            } catch(e){}
          }).catch(()=>{});

          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(()=>{});
        } catch(e) { await sleep(1500); }
      } else if (process.env.DEMO_TOKEN) {
        // fallback: define token em localStorage para pular login (chave gerenciada pelo app)
        console.log('DEMO_TOKEN presente, definindo token no localStorage e recarregando a página');
        await page.evaluate((token) => { try { localStorage.setItem('token', token); } catch(e){} }, process.env.DEMO_TOKEN);
        await page.reload({ waitUntil: 'networkidle2' });
      } else {
        console.log('Não foi possível preencher formulário nem encontrar token de fallback. Continuando sem autenticação.');
      }
    }

    // If TARGET_PATH is provided, go directly to it (useful to target a specific validation)
    const target = process.env.TARGET_PATH;
    if (target) {
      console.log('TARGET_PATH provided, navigating to', target);
      await page.goto(base + target, { waitUntil: 'networkidle2' }).catch(()=>{});
      await sleep(process.env.WAIT_MS ? parseInt(process.env.WAIT_MS, 10) : 5000);
      out.pages.target = { url: base + target, html: await page.content() };
      // gather some DOM diagnostics for charts
      try {
        const domInfo = await page.evaluate(() => {
          const rechartsWrappers = document.querySelectorAll('.recharts-wrapper').length;
          const rechartsPaths = document.querySelectorAll('.recharts-surface path').length;
          const rechartsTexts = Array.from(document.querySelectorAll('.recharts-surface text')).map(t => t.textContent || '');
          const loading = Array.from(document.querySelectorAll('div,span,p')).some(el => (el.textContent || '').includes('Carregando')) || !!document.querySelector('.animate-spin');
          return { rechartsWrappers, rechartsPaths, rechartsTexts: rechartsTexts.slice(0,50), loading };
        });
        out.pages.target.domInfo = domInfo;
        console.log('DOM INFO', domInfo);
      } catch(e) { console.warn('domInfo eval failed', String(e)); }

      // if charts page, also try fullscreen variant
      if (target.includes('/charts')) {
        // ensure we have an id
        const match = target.match(/validations\/([^\/]+)/);
        if (match) {
          const id = match[1];
          const fullscreenUrl = `/validations/${id}/charts/fullscreen?type=temperature`;
          console.log('Trying fullscreen URL:', fullscreenUrl);
          await page.goto(base + fullscreenUrl, { waitUntil: 'networkidle2' }).catch(()=>{});
          await sleep(process.env.WAIT_MS ? parseInt(process.env.WAIT_MS, 10) : 5000);
          out.pages.fullscreen = { url: base + fullscreenUrl, html: await page.content() };
        }
      }
    } else {
      // go to validations list
      await page.goto(base + '/validations', { waitUntil: 'networkidle2' });
      await sleep(1500);

      // find first validation link
      const firstLink = await page.evaluate(() => {
        const el = document.querySelector('a[href*="/validations/"]:not([href*="/charts"])');
        return el ? el.getAttribute('href') : null;
      });
      console.log('First validation link:', firstLink);

      if (!firstLink) {
        console.error('No validation link found on /validations');
      } else {
        const detailsUrl = firstLink;
        await page.goto(base + detailsUrl, { waitUntil: 'networkidle2' });
        await sleep(1000);
        out.pages.details = {
          url: base + detailsUrl,
          html: await page.content()
        };

        // open charts page for that id
        const match = detailsUrl.match(/validations\/([^\/]+)/);
        if (match) {
          const id = match[1];
          const chartsUrl = `/validations/${id}/charts`;
          const fullscreenUrl = `/validations/${id}/charts/fullscreen?type=temperature`;
          console.log('Charts URL:', chartsUrl, 'Fullscreen URL:', fullscreenUrl);

          await page.goto(base + chartsUrl, { waitUntil: 'networkidle2' });
          await sleep(1000);
          out.pages.charts = { url: base + chartsUrl, html: await page.content() };

          await page.goto(base + fullscreenUrl, { waitUntil: 'networkidle2' });
          await sleep(1000);
          out.pages.fullscreen = { url: base + fullscreenUrl, html: await page.content() };
        }
      }
    }
  } catch (err) {
    console.error('Script error', err);
    out.scriptError = String(err);
  } finally {
    await browser.close();
    fs.writeFileSync('puppeteer_check_output.json', JSON.stringify(out, null, 2));
    console.log('Done. Output written to puppeteer_check_output.json');
  }
})();
