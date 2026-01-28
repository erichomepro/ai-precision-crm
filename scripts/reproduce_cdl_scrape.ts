
import { scrapeGoogleMaps } from '../src/lib/maps_scraper';

async function test() {
    console.log("Testing Scraper for: CDL Electrical Solutions LTD. Spruce Grove");
    try {
        // Try exact match from screenshot
        const result = await scrapeGoogleMaps("CDL Electrical Solutions LTD. Spruce Grove");
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Scraper Failed:", e);
    }
}

test();
