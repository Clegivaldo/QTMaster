const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.EDITOR_URL || 'http://localhost:3000';
  console.log('E2E: opening', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for editor title
    await page.waitForXPath('//h1[contains(normalize-space(.), "Editor de Layout")]');
    console.log('Editor loaded');

    // Open Page Settings modal (click a button with title="Configurações da página")
    const settingsButtons = await page.$$('[title="Configurações da página"]');
    if (!settingsButtons || settingsButtons.length === 0) throw new Error('Page settings button not found');
    // click the last one (right-side)
    await settingsButtons[settingsButtons.length - 1].click();
    console.log('Clicked Page Settings');

    // Wait for modal title
    await page.waitForXPath('//h3[contains(normalize-space(.), "Configurações da Página")]');

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

    // Click Apply button
    const [applyBtn] = await page.$x(`//button[contains(normalize-space(.), 'Aplicar Configurações')]`);
    if (!applyBtn) throw new Error('Apply button not found');
    await applyBtn.click();
    console.log('Clicked Aplicar Configurações');

    // Wait for modal to close
    await page.waitForTimeout(500);
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('h3')).some(h => h.textContent && h.textContent.includes('Configurações da Página')),
      { timeout: 5000 });

    // Click header resize handle to select header region
    await page.waitForSelector('[data-testid="header-resize-handle"]', { timeout: 5000 });
    await page.click('[data-testid="header-resize-handle"]');
    console.log('Clicked header resize handle');

    // Wait briefly and check that 'Aparência' and 'Camadas' are NOT visible
    await page.waitForTimeout(300);
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

    // Navigate to next page using pagination arrow '›' at bottom
    const [nextBtn] = await page.$x(`//button[contains(normalize-space(.), '›')]`);
    if (nextBtn) {
      await nextBtn.click();
      console.log('Navigated to next page');
    } else {
      console.warn('Next page button not found; continuing without explicit navigation');
    }

    // Wait and then check header handle exists (replication)
    await page.waitForTimeout(500);
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
