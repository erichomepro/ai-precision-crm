const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log("Navigating to https://www.aiprecisionmarketing.ca/ ...");
    await page.goto('https://www.aiprecisionmarketing.ca/', { waitUntil: 'networkidle0', timeout: 60000 });

    const data = await page.evaluate(() => {
        const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.innerText);
        const h2s = Array.from(document.querySelectorAll('h2')).map(el => el.innerText);
        const h3s = Array.from(document.querySelectorAll('h3')).map(el => el.innerText);
        const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.innerText).filter(t => t.length > 50);
        
        // basic color extraction (heuristic)
        const computedStyle = getComputedStyle(document.body);
        const bg = computedStyle.backgroundColor;
        const color = computedStyle.color;

        return { h1s, h2s, h3s, paragraphs, bg, color };
    });

    console.log(JSON.stringify(data, null, 2));
    await browser.close();
})();
