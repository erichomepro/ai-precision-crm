import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';

// puppeteer.use(StealthPlugin()); MOVED TO LAZY INIT

export interface Review {
    author: string;
    rating: number; // 1-5
    text: string;
    time?: string;
    response?: string;
}

export interface MapsResult {
    businessName: string;
    address?: string;
    rating?: number;
    reviewsCount?: number; // Standardized Property Name
    category?: string;
    reviews: Review[];
    url: string;
}

const DEBUG = true;
function log(msg: string) {
    if (DEBUG) console.log(`[MapsScraper] ${msg}`);
}

export async function scrapeGoogleMaps(searchTerm: string): Promise<MapsResult | null> {
    let browser: Browser | null = null;
    try {
        // LAZY INIT
        puppeteer.use(StealthPlugin());

        log(`Launching browser for: ${searchTerm}`);
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US,en']
        });

        const page = await browser.newPage();

        // Use modern Desktop User-Agent to avoid "Limited View"
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setViewport({ width: 1366, height: 768 });

        let searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/?hl=en`;
        let isDirectPlace = false;

        // Intelligent URL Handling
        if (searchTerm.includes('/maps/search/')) {
            // Extract query from URL and use standard search flow (more robust coverage)
            try {
                const parts = searchTerm.split('/maps/search/');
                if (parts[1]) {
                    const query = parts[1].split('/')[0];
                    searchTerm = decodeURIComponent(query.replace(/\+/g, ' '));
                    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/?hl=en`; // Start fresh
                    log(`Converted Map Search URL to Query: "${searchTerm}"`);
                }
            } catch (e) { }
        } else if (searchTerm.startsWith('http') && searchTerm.includes('/maps/place/')) {
            // Direct Place URL - Navigate directly
            searchUrl = searchTerm;
            isDirectPlace = true;
            log(`Direct Place URL detected: ${searchUrl}`);
        } else if (searchTerm.startsWith('http')) {
            // Other generic URLs
            searchUrl = searchTerm;
        } else {
            log(`Navigating to search: ${searchUrl}`);
        }

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });


        try {
            // Aggressive Consent Handling
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await page.evaluate((el: any) => el.textContent?.toLowerCase() || '', btn);
                if (text.includes('accept all') || text.includes('i agree') || text.includes('accept cookies')) {
                    log(`Clicking Consent Button: "${text}"`);
                    await btn.click();
                    await new Promise(r => setTimeout(r, 3000));
                    break;
                }
            }
        } catch (e) { }

        // Wait for business title
        try {
            log("Waiting for business title...");
            await page.waitForSelector('h1, .DUwDvf', { timeout: 15000 });
        } catch (e) {
            const title = await page.title();
            const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
            log(`TIMEOUT waiting for h1. Page Title: "${title}". Body Start: "${bodyText.replace(/\n/g, ' ')}"`);
        }

        // Check if we need to click a result
        const listResults = await page.$$('a[href*="/maps/place/"]');
        let preClickRating = 0;
        let preClickCount = 0;

        if (listResults.length > 0 && !page.url().includes('/maps/place/')) {
            // OPTIMIZATION: Extract data from the list item BEFORE clicking (bypasses Limited View issues)
            try {
                const itemText = await page.evaluate((el: any) => el.innerText || el.textContent || '', listResults[0]);
                const ratingMatch = itemText.match(/(\d+\.\d+)/);
                const countMatch = itemText.match(/\(([\d,]+)\)/);

                if (ratingMatch) preClickRating = parseFloat(ratingMatch[1]);
                if (countMatch) preClickCount = parseInt(countMatch[1].replace(/,/g, ''));

                log(`Pre-Click Extraction: Rating=${preClickRating}, Count=${preClickCount}`);
            } catch (e) { }

            log(`Found list of places. Clicking the first one.`);
            await listResults[0].click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => { });
            await new Promise(r => setTimeout(r, 3000)); // Wait for animation
        }

        const result: MapsResult = {
            businessName: '',
            url: page.url(),
            reviews: []
        };

        // Robust Name Extraction
        try {
            const nameSelectors = ['h1.DUwDvf', '.DUwDvf', 'h1', 'div[role="heading"][aria-level="1"]'];
            let name = '';

            for (const sel of nameSelectors) {
                try {
                    const el = await page.$(sel);
                    if (el) {
                        const text = await page.evaluate((e: any) => e.textContent?.trim(), el);
                        if (text && text !== 'Results' && text.length > 2) {
                            name = text;
                            break;
                        }
                    }
                } catch (e) { }
            }
            result.businessName = name;

            // FALLBACK: Meta Tags & JSON-LD (If DOM failed)
            if (!result.businessName) {
                try {
                    const metaTitle = await page.$eval('meta[property="og:title"]', (el: any) => el.content);
                    if (metaTitle) {
                        result.businessName = metaTitle.split(' - ')[0];
                        log(`Extracted Name from Meta: ${result.businessName}`);
                    }
                } catch (e) { }
            }

            if (!result.rating) {
                try {
                    const jsonLd = await page.$$eval('script[type="application/ld+json"]', (els: any[]) => {
                        for (const el of els) {
                            try {
                                const json = JSON.parse(el.innerText);
                                if (json['@type'] === 'LocalBusiness' || json['@type'] === 'Restaurant' || json['@context'] === 'http://schema.org') {
                                    if (json.aggregateRating) {
                                        return { rating: json.aggregateRating.ratingValue, count: json.aggregateRating.reviewCount };
                                    }
                                }
                            } catch (e) { }
                        }
                        return null;
                    });

                    if (jsonLd) {
                        result.rating = Number(jsonLd.rating);
                        result.reviewsCount = Number(jsonLd.count); // Corrected property
                        log(`Extracted Rating from JSON-LD: ${result.rating} (${result.reviewsCount})`);
                    }
                } catch (e) { }
            }

            if (!name) {
                log("Name not found. taking screenshot...");
                await page.screenshot({ path: 'debug_maps_fail.png' });
            } else {
                log(`Business Name: ${name}`);
            }

        } catch (e) {
            log("Could not find Business Name.");
            await page.screenshot({ path: 'debug_maps_error.png' });
        }

        // Rating & Count
        try {
            // Priority 1: Stars Icon
            const ratingEl = await page.$('div[role="img"][aria-label*="stars"]');
            if (ratingEl) {
                const label = await page.evaluate(el => el.getAttribute('aria-label') || '', ratingEl);
                result.rating = parseFloat(label.split(" ")[0]);
            }

            // Priority 2: Text Fallback (e.g. "5.0")
            if (!result.rating) {
                const rText = await page.$eval('.F7nice span[aria-hidden="true"]', (el: any) => el.innerText).catch(() => "0");
                result.rating = parseFloat(rText);
            }

            // Review Count: Try multiple selectors
            let countText = "";

            // 1. Explicit button search (Iterate all buttons to find one with count pattern)
            const allButtons = await page.$$('button');
            for (const btn of allButtons) {
                const label = await page.evaluate((el: any) => el.getAttribute('aria-label') || el.innerText || '', btn);
                // Look for "24 reviews" or "Reviews" with a number
                if (label.match(/reviews/i) && label.match(/\d+/)) {
                    countText = label;
                    log(`Found Count Button: ${label}`);
                    break;
                }
            }

            // 2. Scan for (N) pattern in header if button failed
            if (!countText) {
                // Inspect container text
                const containerText = await page.$eval('.F7nice', (el: any) => el.innerText).catch(() => "");
                const m = containerText.match(/\(([\d,]+)\)/);
                if (m) {
                    countText = m[1];
                }
            }

            if (!countText) {
                const bodyText = await page.evaluate(() => document.body.innerText);
                // Look for patterns like "24 reviews" or "500 votes" near the top
                const match = bodyText.match(/(\d+)\s+reviews/i) || bodyText.match(/(\d+)\s+votes/i);
                if (match) {
                    countText = match[1];
                    log(`Nuclear Fallback: Found "${countText}" in body text.`);
                } else {
                    fs.writeFileSync('debug_body_dump.txt', bodyText);
                    log("Nuclear Fallback FAILED. Saved body text to debug_body_dump.txt");
                }
            }

            if (countText) {
                result.reviewsCount = parseInt(countText.replace(/[^0-9]/g, ''));
                log(`Extracted Review Count: ${result.reviewsCount} (from "${countText}")`);
            } else {
                log("Failed to extract reviews count text.");
            }

            // FINAL FALLBACK: Use Pre-Click Data
            if (!result.rating && preClickRating > 0) {
                result.rating = preClickRating;
                log(`Using Pre-Click Rating: ${result.rating}`);
            }
            if (!result.reviewsCount && preClickCount > 0) {
                result.reviewsCount = preClickCount;
                log(`Using Pre-Click Review Count: ${result.reviewsCount}`);
            }

            // Category
            // Heuristic: Often a button with jsaction="category"
            const categoryEl = await page.$('button[jsaction*="category"]');
            if (categoryEl) {
                result.category = await page.evaluate(el => el.textContent?.trim(), categoryEl);
            } else {
                // Fallback: look for text that looks like a category (e.g. "Pizza restaurant" • "$$")
                const headerTexts = await page.$$eval('.fontBodyMedium', els => els.map(e => e.textContent?.trim()));
                const potentialCat = headerTexts.find(t => t && !t.includes('Open') && !t.includes('Closed') && !t.match(/\d/));
                if (potentialCat) result.category = potentialCat;
            }

            if (!result.category) result.category = "Business";

        } catch (e) { log("Could not extract rating/category"); }

        // Reviews
        try {
            // Broader search for the Reviews tab
            const buttons = await page.$$('button, div[role="tab"], div[jsaction]');
            let reviewsTabBtn = null;
            for (const b of buttons) {
                const label = await page.evaluate((el: any) => el.getAttribute('aria-label') || el.textContent || '', b);
                if (label && /Reviews/i.test(label) && !/Write a review/i.test(label) && !/Search/i.test(label)) {
                    // Ensure it's likely a tab ( heuristic: parent has role tablist or it's a sibling of Overview)
                    reviewsTabBtn = b;
                    break;
                }
            }

            if (reviewsTabBtn) {
                log("Clicking Reviews Tab...");
                await reviewsTabBtn.click();
                await new Promise(r => setTimeout(r, 3000)); // Wait for tab switch

                // Wait for generic content
                try {
                    await page.waitForSelector('.jftiEf, span[role="img"][aria-label*="stars"]', { timeout: 5000 });
                } catch (e) { log("Timeout waiting for reviews to load."); }

                // Extract Reviews
                const debugInfo = await page.evaluate(() => {
                    const results: any[] = [];
                    const containers = document.querySelectorAll('.jftiEf');
                    const stars = document.querySelectorAll('span[role="img"][aria-label*="stars"]');

                    // Try iterating known class .jftiEf
                    containers.forEach(card => {
                        const author = card.querySelector('.d4r55')?.textContent?.trim() || 'Unknown';
                        const text = card.querySelector('.wiI7pd')?.textContent?.trim() || '';
                        const starSpan = card.querySelector('span[role="img"][aria-label*="stars"]');
                        const starsLabel = starSpan?.getAttribute('aria-label') || '';
                        const ratingMatch = starsLabel.match(/(\d+)/);
                        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;
                        const time = card.querySelector('.rsqaWe')?.textContent?.trim() || '';

                        // Owner Response (usually in a div with 'Response from the owner')
                        let response = "";
                        const ownerRespDiv = card.querySelector('.C8S4Uh'); // Common class for owner response container
                        if (ownerRespDiv) {
                            response = ownerRespDiv.querySelector('.wiI7pd')?.textContent?.trim() || "Responded";
                        }

                        if (text) {
                            results.push({ author, rating, text, time, response });
                        }
                    });

                    // Fallback to stars if no containers found
                    if (results.length === 0 && stars.length > 0) {
                        stars.forEach(star => {
                            const card = star.closest('div[data-review-id]') || star.parentElement?.parentElement?.parentElement;
                            if (card) {
                                const author = card.querySelector('.d4r55')?.textContent?.trim() || 'Unknown';
                                const text = card.querySelector('.wiI7pd')?.textContent?.trim() || '';
                                const ratingLabel = star.getAttribute('aria-label') || '';
                                const ratingMatch = ratingLabel.match(/(\d+)/);
                                const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;

                                // Simplified response check for fallback
                                const response = card.textContent?.includes("Response from the owner") ? "Responded" : "";

                                if (text && rating > 0) {
                                    results.push({ author, rating, text, response });
                                }
                            }
                        });
                    }

                    return { results, debug: { containerCount: containers.length, starCount: stars.length } };
                });

                log(`Debug: Found ${debugInfo.debug.containerCount} containers, ${debugInfo.debug.starCount} stars.`);

                for (const r of debugInfo.results) {
                    result.reviews.push(r);
                }

                if (result.reviews.length === 0) {
                    // Save HTML for analysis
                    const html = await page.content();
                    fs.writeFileSync('scraper_debug.html', html);
                    log("Saved scraper_debug.html");
                }

            } else {
                log("Reviews tab not found.");
            }
        } catch (e) {
            log(`Error extracting reviews: ${e}`);
        }

        // LOGICAL INFERENCE FALLBACK
        // If we found a rating (e.g. 5.0) but no count, it implies at least 1 review exists.
        // This prevents "undefined" errors downstream.
        if (result.rating && result.rating > 0 && !result.reviewsCount) {
            result.reviewsCount = 1;
            log(`Inferred Review Count: 1 (based on Rating ${result.rating})`);
        }

        return result;

    } catch (error) {
        console.error("Scrape Error:", error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}
