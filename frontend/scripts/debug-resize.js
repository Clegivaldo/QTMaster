import puppeteer from 'puppeteer';

const CANDIDATE_URLS = [
  'http://localhost:3000/',
  'http://localhost:3001/'
];

async function waitForUrl(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 3000 });
      await browser.close();
      return true;
    } catch (err) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

(async () => {
  let foundUrl = null;
  for (const u of CANDIDATE_URLS) {
    console.log('Probing', u);
    const ok = await waitForUrl(u, 5000);
    if (ok) { foundUrl = u; break; }
  }
  if (!foundUrl) {
    console.error('No dev server reachable at candidate URLs. Aborting.');
    process.exit(1);
  }

  console.log('Opening', foundUrl);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    const args = msg.args();
    Promise.all(args.map(a => a.jsonValue())).then(values => console.log('[PAGE]', ...values)).catch(() => console.log('[PAGE]', msg.text()));
  });

  await page.goto(foundUrl, { waitUntil: 'networkidle2' });
  console.log('Page loaded');

  // Wait for canvas and handles
  await page.waitForSelector('[data-testid="header-resize-handle"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="footer-resize-handle"]', { timeout: 10000 });

  console.log('Handles present');

  // Helper to drag handle by delta Y
  async function dragHandle(selector, deltaY = 50) {
    const handle = await page.$(selector);
    const box = await handle.boundingBox();
    if (!box) throw new Error('No bounding box for ' + selector);
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endY = startY + deltaY;
    console.log('Dragging', selector, 'from', startY, 'to', endY);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // small moves to trigger handlers
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const y = startY + (deltaY * i) / steps;
      await page.mouse.move(startX, y);
      await page.waitForTimeout(80);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Drag header down (increase header height)
  await dragHandle('[data-testid="header-resize-handle"]', 40);

  // Drag footer up (increase footer height)
  await dragHandle('[data-testid="footer-resize-handle"]', -40);

  console.log('Interactions done');
  await browser.close();
})();
