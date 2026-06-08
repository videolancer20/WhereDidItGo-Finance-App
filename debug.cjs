const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER NETWORK ERROR:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' }).catch(console.error);
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
