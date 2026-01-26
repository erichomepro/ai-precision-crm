const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    console.log('Navigating to Google...');
    try {
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Page Title:', await page.title());
        await page.screenshot({ path: 'test_google.png' });
        console.log('Screenshot saved.');
    } catch (e) {
        console.error('Navigation failed:', e);
    }
    await browser.close();
})();
