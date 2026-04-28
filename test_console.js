const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => {
    localStorage.setItem('aashalink_user', JSON.stringify({ name: 'Demo Worker', ashaId: 'ASHA-123', village: 'Demo Village', designation: 'Health Worker', contactNumber: '9876543210' }));
  });
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  await browser.close();
})();
