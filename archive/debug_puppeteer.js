const puppeteer = require('puppeteer');
// const puppeteerExtra = require('puppeteer-extra'); 
// const stealthPlugin = require('puppeteer-extra-plugin-stealth');

// puppeteerExtra.use(stealthPlugin()); 

async function testPuppeteer(url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    console.log(`Testing Puppeteer against: ${url}`);

    try {
        console.log("1. Launching Browser...");
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        console.log("2. Opening Page...");
        const page = await browser.newPage();

        // Basic Stealth
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("3. Navigating...");
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const title = await page.title();
        console.log(`   Title Found: "${title}"`);

        const h1s = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(el => el.textContent));
        console.log(`   H1s Found: ${h1s.join(', ')}`);

        const content = await page.content();
        console.log(`   Content Length: ${content.length}`);

        await browser.close();
        console.log("SUCCESS");

    } catch (error) {
        console.error("FAIL:", error);
    }
}

testPuppeteer(process.argv[2] || 'trimlineofparkland.com');
