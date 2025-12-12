import puppeteer from 'puppeteer';
import path from 'path';

const pdfPath = path.resolve(process.cwd(), 'temp', 'preview_chart.pdf');
const outPath = path.resolve(process.cwd(), 'temp', 'preview_chart_page1.png');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();

    // Navigate to the PDF file using file:// URL
    await page.goto('file://' + pdfPath, { waitUntil: 'networkidle2', timeout: 30000 });

    // Allow the PDF viewer to render
    await new Promise(r => setTimeout(r, 1000));

    // Try a full page screenshot — the built-in PDF viewer will render the PDF content
    await page.setViewport({ width: 1200, height: 1600 });
    await page.screenshot({ path: outPath, fullPage: true });

    console.log('OK:', outPath);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    await browser.close();
    process.exit(1);
  }
})();
