#!/usr/bin/env node

(async () => {
  try {
    const puppeteer = await import('puppeteer');
    console.log('PUPPETEER_EXECUTABLE_PATH=', process.env.PUPPETEER_EXECUTABLE_PATH);
    console.log('puppeteer.launch available:', typeof puppeteer.launch === 'function');

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    console.log('launched', await browser.version());

    const page = await browser.newPage();
    await page.setContent('<html><body><h1>puppeteer test</h1></body></html>');
    const screenshotPath = '/tmp/puppeteer_test.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();
    console.log('screenshot saved to', screenshotPath);
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(2);
  }
})();
