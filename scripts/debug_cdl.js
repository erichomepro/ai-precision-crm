
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const DEBUG = true;
function log(msg) {
    if (DEBUG) console.log(`[MapsScraper] ${msg}`);
}

async function scrapeGoogleMaps(searchTerm) {
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
        try {
            await page.waitForSelector('h1', { timeout: 10000 });
        } catch (e) {
            log("Timeout waiting for H1. Maybe list view?");
            const firstResult = await page.$('a[href*="/maps/place/"]');
            if (firstResult) {
                log("Clicking first result in list...");
                await firstResult.click();
                await page.waitForSelector('h1', { timeout: 10000 });
            }
        }

        // Extract Data
        const businessName = await page.$eval('h1', el => el.innerText).catch(() => searchTerm);

        // DEBUG RATINGS & COUNT via Container Inspection
        let rating = 0;
        let reviewCount = 0;

        try {
            // 1. Get Rating
            const rCheck = await page.$eval('.F7nice span[aria-hidden="true"]', el => el.innerText).catch(() => "0");
            rating = parseFloat(rCheck);
            log(`Rating found: ${rating}`);

            // 3. Robust Relative Search
            try {
                // Find the rating element handle
                const ratingHandle = await page.$('.F7nice span[aria-hidden="true"]');
                if (ratingHandle) {
                    // 4. Brute Force Text Scan
                    try {
                        const allTexts = await page.$$eval('*', els => els.map(e => ({ tag: e.tagName, text: e.innerText, class: e.className })));
                        const countCandidates = allTexts.filter(t => t.text && /^\(\d+\)$/.test(t.text.trim()));

                        log(`Found ${countCandidates.length} potential count elements:`);
                        countCandidates.forEach(c => log(` - Tag: ${c.tag}, Class: "${c.class}", Text: "${c.text}"`));

                        if (countCandidates.length > 0) {
                            // Pick the one that looks most like a review count (often a span or div near the top)
                            const best = countCandidates[0];
                            reviewCount = parseInt(best.text.replace(/[()]/g, ''));
                            log(`Guessed Count from Brute Force: ${reviewCount}`);
                        }

                    } catch (e) { log("Brute force failed: " + e.message); }
                }
            } catch (e) { log("Relative search failed: " + e.message); }

        } catch (e) { log("Super Debug failed: " + e.message); }

        log(`Final Parsed Rating: ${rating}, Count: ${reviewCount}`);


        const address = await page.$eval('button[data-item-id="address"]', el => el.getAttribute('aria-label')).catch(() => "");
        const category = await page.$$eval('button[jsaction*="category"]', els => els.length > 0 ? els[0].innerText : "Unknown").catch(() => "Unknown");

        // Reviews Extraction
        let reviews = [];
        if (reviewCount > 0) {
            // Try 1: Button with aria-label containing "reviews"
            let reviewButton = await page.$('button[aria-label*="reviews"]');

            // Try 2: Button with text "Reviews" (Using XPath)
            if (!reviewButton) {
                const buttons = await page.$x("//button[contains(., 'Reviews')]");
                if (buttons.length > 0) {
                    reviewButton = buttons[0];
                    log("Found Review Button via Text Content");
                }
            }
            // Try 3: Tab with text "Reviews"
            if (!reviewButton) {
                const tabs = await page.$x("//div[@role='tab'][contains(., 'Reviews')]");
                if (tabs.length > 0) {
                    reviewButton = tabs[0];
                    log("Found Review Tab via Text Content");
                }
            }

            if (reviewButton) {
                await reviewButton.click();
                await new Promise(r => setTimeout(r, 2000)); // wait for slide out

                // Scroll reviews
                try {
                    const scrollableDiv = await page.$('.m6QErb.DxyBCb.kA9KIf.dS8AEf');
                    if (scrollableDiv) {
                        await page.evaluate(el => el.scrollTop = el.scrollHeight, scrollableDiv);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } catch (e) { }

                reviews = await page.$$eval('div[data-review-id]', (els) => {
                    return els.map(el => {
                        const starsEl = el.querySelector('span[role="img"]');
                        const stars = starsEl ? parseFloat(starsEl.getAttribute('aria-label') || "0") : 0;
                        const textEl = el.querySelector('.MyEned span');
                        const text = textEl ? textEl.innerText : "";
                        const authorEl = el.querySelector('.d4r55');
                        const author = authorEl ? authorEl.innerText : "Anonymous";
                        const responseEl = el.querySelector('.C5RTEf');
                        const response = responseEl ? responseEl.innerText : "";
                        return { author, rating: stars, text, response };
                    });
                }).catch(() => []);
            }
        }

        return {
            businessName,
            rating,
            reviewCount,
            address: address ? address.replace('Address: ', '') : "",
            category,
            reviews_found: reviews.length,
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
    console.log("Testing Scraper (JS) for: CDL Electrical Solutions LTD. Spruce Grove");
    const result = await scrapeGoogleMaps("CDL Electrical Solutions LTD. Spruce Grove");
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
