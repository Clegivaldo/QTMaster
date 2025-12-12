import puppeteer from 'puppeteer';
import fs from 'fs';

(async()=>{
  const base = process.env.BASE || 'http://localhost:3001';
  const token = process.env.DEMO_TOKEN;
  const target = process.env.TARGET_PATH || '/validations/cmj1i18ks0002mo4jio13l46s/charts';
  const waitMs = process.env.WAIT_MS ? parseInt(process.env.WAIT_MS,10) : 30000;
  console.log('Base:', base, 'Target:', target, 'waitMs:', waitMs);

  const browser = await puppeteer.launch({ headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  try {
    // set token if provided
    await page.goto(base, { waitUntil: 'networkidle2' });
    if (token) {
      await page.evaluate(t => { try{ localStorage.setItem('token', t); }catch(e){} }, token);
      await page.reload({ waitUntil: 'networkidle2' });
    }

    // go to charts
    const chartsUrl = base + target;
    console.log('Navigating to', chartsUrl);
    await page.goto(chartsUrl, { waitUntil: 'networkidle2' });
    await sleep(waitMs);
    await page.screenshot({ path: 'charts.png', fullPage: true });
    console.log('Saved charts.png');

    // try fullscreen
    const m = target.match(/validations\/([^\/]+)/);
    if (m) {
      const id = m[1];
      const fullscreen = `${base}/validations/${id}/charts/fullscreen?type=temperature`;
      console.log('Navigating to fullscreen', fullscreen);
      await page.goto(fullscreen, { waitUntil: 'networkidle2' });
      await sleep(waitMs);
      await page.screenshot({ path: 'fullscreen.png', fullPage: true });
      console.log('Saved fullscreen.png');
    }
  } catch (e) {
    console.error('Screenshot script error', e);
  } finally {
    await browser.close();
  }
})();
