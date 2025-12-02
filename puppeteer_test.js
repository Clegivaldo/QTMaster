(async () => {
  try {
    const puppeteer = require('puppeteer');
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    console.log('Using executablePath:', execPath);
    const browser = await puppeteer.launch({
      executablePath: execPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu'],
      headless: true,
      timeout: 120000,
    });

    console.log('Launched browser PID (approx)');
    await browser.close();
    console.log('puppeteer ok');
    process.exit(0);
  } catch (e) {
    console.error('puppeteer error:', e && (e.stack || e.message || e));
    try {
      if (e && e.stderr) console.error('stderr:', e.stderr.toString());
      if (e && e.stdout) console.error('stdout:', e.stdout.toString());
    } catch (_) {}
    process.exit(2);
  }
})();
