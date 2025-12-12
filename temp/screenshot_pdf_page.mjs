import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  const pdfPath = path.resolve('temp/preview_test_output_fixed.pdf');
  const outPng = path.resolve('temp/preview_test_output_fixed_page1.png');

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });

    const fileUrl = 'file://' + pdfPath;
    console.log('Opening', fileUrl);

    await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    // give the PDF viewer some time to render
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: outPng, fullPage: true });
    console.log('Saved screenshot to', outPng);
  } catch (err) {
    console.error('Error capturing PDF page:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
