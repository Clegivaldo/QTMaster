import puppeteer from 'puppeteer';

const url = process.argv[2] || 'http://localhost:3001/validations/cmj75de1n0002pd5xot07x69k/details';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];

  page.on('console', async msg => {
    try {
      const handles = msg.args();
      const args = await Promise.all(handles.map(async h => {
        try {
          return await h.jsonValue();
        } catch (e) {
          try {
            return h.toString();
          } catch (_) {
            return String(h);
          }
        }
      }));
      errors.push({ type: 'console', level: msg.type(), text: msg.text(), args });
    } catch (e) {
      // ignore
    }
  });

  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  page.on('response', res => {
    // capture any 4xx/5xx/401 responses for transparency
    if (res.status() >= 400) {
      errors.push({ type: 'response', url: res.url(), status: res.status() });
    }
  });

  try {
    await page.setViewport({ width: 1400, height: 900 });

    // Go to login page and perform demo login (fills demo credentials then submits)
    const loginUrl = (new URL('/login', url)).toString();
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click 'Usar Credenciais Demo' button if present
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Usar Credenciais Demo'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 700));

    // Click 'Entrar' (submit) button
    await page.evaluate(() => {
      const submit = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim().startsWith('Entrar'));
      if (submit) submit.click();
    });

    // wait briefly to allow login navigation
    await new Promise(r => setTimeout(r, 2000));

    // Now navigate to the target details page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // wait additional time for dynamic scripts and possible errors
    await new Promise(resolve => setTimeout(resolve, 5000));

    // also capture any ErrorBoundary-exposed error on window
    try {
      const lastErr = await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        // @ts-ignore
        return window.__LAST_REACT_ERROR__ || null;
      });
      if (lastErr) {
        errors.push({ type: 'last_react_error', value: lastErr });
      }
    } catch (e) {
      // ignore
    }

    // take a screenshot for reference
    await page.screenshot({ path: 'capture_validation_details.png', fullPage: true });

    // also capture page body text for visible errors
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    console.log('PAGE_BODY_TEXT_START');
    console.log(bodyText.slice(0, 2000));
    console.log('PAGE_BODY_TEXT_END');

    // try to capture the last react error object exposed by ErrorBoundary
    const lastReactError = await page.evaluate(() => {
      try {
        // eslint-disable-next-line no-undef
        return window.__LAST_REACT_ERROR__ || null;
      } catch (e) {
        return null;
      }
    });
    console.log('LAST_REACT_ERROR');
    console.log(JSON.stringify(lastReactError, null, 2));

    // print captured errors
    if (errors.length === 0) {
      console.log('NO_ERRORS_FOUND');
    } else {
      console.log('ERRORS_CAPTURED');
      console.log(JSON.stringify(errors, null, 2));
    }

  } catch (err) {
    console.error('SCRIPT_ERROR', err);
  } finally {
    await browser.close();
  }

  // exit 0
  process.exit(0);
})();
