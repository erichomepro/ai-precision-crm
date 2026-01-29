
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

const DEBUG = true;
function log(msg: string) {
    if (DEBUG) console.log(`[MapsScraper] ${msg}`);
}

async function scrapeGoogleMaps(searchTerm: string) {
    let browser = null;
    try {
        log(`Launching browser for: ${searchTerm}`);
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US,en']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/?hl=en`;
        log(`Navigating to: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Consent handling (Europe)
        try {
            const consentButton = await page.$('button[aria-label="Accept all"]');
            if (consentButton) {
                await consentButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
            }
        } catch (e) { }

        // Check for "No results"
        const noResults = await page.$eval('body', el => el.innerText.includes('No results found')).catch(() => false);
        if (noResults) {
            log("No results found.");
            return null;
        }

        // Wait for listing to load
        // Try waiting for the main header (H1) which usually contains the business name
        try {
            await page.waitForSelector('h1', { timeout: 10000 });
        } catch (e) {
            log("Timeout waiting for H1. Maybe list view?");
            // If it's a list view, we might need to click the first result.
            const firstResult = await page.$('a[href*="/maps/place/"]');
            if (firstResult) {
                log("Clicking first result in list...");
                await firstResult.click();
                await page.waitForSelector('h1', { timeout: 10000 });
            }
        }

        // Extract Data
        const businessName = await page.$eval('h1', el => el.innerText).catch(() => searchTerm);
        const rating = await page.$eval('div[role="img"][aria-label*="stars"]', el => {
            const label = el.getAttribute('aria-label') || "";
            return parseFloat(label.split(" ")[0]);
        }).catch(() => 0);

        const reviewCountText = await page.$eval('button[aria-label*="reviews"]', el => el.innerText).catch(() => "0");
        const reviewCount = parseInt(reviewCountText.replace(/[^0-9]/g, '')) || 0;

        const address = await page.$eval('button[data-item-id="address"]', el => el.getAttribute('aria-label')).catch(() => "");

        // --- NEW: POSTS & CATEGORY ---
        // Category often appears near the rating/reviews in the header area.
        const category = await page.$$eval('button[jsaction*="category"]', els => els.length > 0 ? els[0].innerText : "Unknown").catch(() => "Unknown");

        // Reviews Extraction
        let reviews = [];
        if (reviewCount > 0) {
            // Click reviews tab/button
            const reviewButton = await page.$('button[aria-label*="reviews"]');
            if (reviewButton) {
                await reviewButton.click();
                await new Promise(r => setTimeout(r, 2000)); // wait for slide out

                // Scroll reviews
                const scrollableDiv = await page.$('div[class*="m6QErb DxyBCb kA9KIf dS8AEf"]'); // Common class for scroll container
                if (scrollableDiv) {
                    await page.evaluate(el => el.scrollTop = el.scrollHeight, scrollableDiv);
                    await new Promise(r => setTimeout(r, 1000));
                }

                reviews = await page.$$eval('div[data-review-id]', (els) => {
                    return els.map(el => {
                        const starsEl = el.querySelector('span[role="img"]');
                        const stars = starsEl ? parseFloat(starsEl.getAttribute('aria-label') || "0") : 0;
                        const textEl = el.querySelector('.MyEned span');
                        const text = textEl ? textEl.innerText : "";
                        const authorEl = el.querySelector('.d4r55');
                        const author = authorEl ? authorEl.innerText : "Anonymous";

                        // Response
                        const responseEl = el.querySelector('.C5RTEf'); // Owner response container often has this class
                        const response = responseEl ? responseEl.innerText : "";

                        return { author, rating: stars, text, response };
                    });
                });
            }
        }

        return {
            businessName,
            rating,
            reviewCount,
            address: address ? address.replace('Address: ', '') : "",
            category,
            reviews
        };

    } catch (e) {
        console.error("Scrape Error:", e);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

async function test() {
    console.log("Testing Scraper for: CDL Electrical Solutions LTD. Spruce Grove");
    const result = await scrapeGoogleMaps("CDL Electrical Solutions LTD. Spruce Grove");
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
