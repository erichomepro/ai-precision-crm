
// Use require for robust execution in this environment
const { scrapeGoogleMaps } = require('../src/lib/maps_scraper');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testPlaceUrl() {
    console.log("1. Testing Scraper with HARDCODED Place URL (Googleplex)...");

    // Official Googleplex Place URL
    const placeUrl = "https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0862515,17z/data=!3m1!4b1!4m6!3m5!1s0x808fba02425dad8f:0x6c296c66619367e0!8m2!3d37.4219999!4d-122.0840577";

    console.log(`Using Place URL: ${placeUrl}`);
    console.log("---------------------------------------------------");

    // Now test the scraper with this URL
    const urlResult = await scrapeGoogleMaps(placeUrl);

    console.log("\n---------------------------------------------------");
    console.log("Direct URL Scrape Result:");
    console.log(JSON.stringify(urlResult, null, 2));

    if (!urlResult || urlResult.rating === 0) {
        console.error("\n❌ FAILED: Zero rating returned for Direct Place URL.");
        process.exit(1);
    } else {
        console.log("\n✅ SUCCESS: Direct Place URL worked!");
        process.exit(0);
    }
}

testPlaceUrl();
