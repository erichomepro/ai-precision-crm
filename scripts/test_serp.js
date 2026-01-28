const puppeteer = require('puppeteer');

(async () => {
    // Pick a KNOWN business with reviews
    const businessName = "Surplec, an IPS Company"; 
    const city = "Spruce Grove";
    const searchTerm = `${businessName} ${city} reviews`.trim();
    
    console.log(`📍 Testing SERP Scraper for: "${searchTerm}"`);

    const browser = await puppeteer.launch({
        headless: true, // Change to false to see the browser popup if you were local
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Search Google directly
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded' });

    // Take a screenshot to debug if it fails
    await page.screenshot({ path: 'debug_serp.png' });

    const data = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        // Debug: Log the first 500 chars to see if we got a Captcha
        // console.log(bodyText.substring(0, 500));

        const ratingEl = document.querySelector('span.Aq14fc') || document.querySelector('div.Ob2kfd'); 
        const countEl = document.querySelector('span.z5jxId') || document.querySelector('a[data-async-trigger="reviewDialog"] span');

        const snippetMatch = bodyText.match(/Rating: (\d\.\d)/);
        const countMatch = bodyText.match(/(\d+)\sreviews/);

        return {
            rating: ratingEl?.innerText || snippetMatch?.[1] || "0",
            count: countEl?.innerText || countMatch?.[1] || "0"
        };
    });

    await browser.close();

    console.log(`✅ Result: ${data.rating} Stars (${data.count} Reviews)`);
})();
