
const { scrapeContactDetails } = require('../src/lib/social_scraper');

// Mock browser/puppeteer environment? 
// Wait, `social_scraper` uses `puppeteer`. If I run this with `ts-node` it should work.
// But `social_scraper.ts` is TypeScript. I should run it with `npx ts-node`.

(async () => {
    console.log("Starting Headhunter Test...");
    const url = "https://langbuilthomes.com";
    // const url = "https://www.google.com"; // Test

    try {
        const result = await scrapeContactDetails(url, "Lang Built Homes");
        console.log("--- FINAL RESULT ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Test Failed:", e);
    }
})();
