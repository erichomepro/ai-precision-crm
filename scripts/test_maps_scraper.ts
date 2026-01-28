
import { scrapeGoogleMaps } from '../src/lib/maps_scraper';

async function main() {
    const term = process.argv[2] || "Joe's Pizza New York";
    console.log(`Running scraper test for: "${term}"`);

    const startTime = Date.now();
    const data = await scrapeGoogleMaps(term);
    const duration = (Date.now() - startTime) / 1000;

    console.log("\n--- RESULT ---");
    if (data) {
        console.log(`Business: ${data.businessName}`);
        console.log(`Rating: ${data.rating} (${data.reviewCount} reviews)`);
        console.log(`URL: ${data.url}`);
        console.log(`Reviews Found: ${data.reviews.length}`);
        if (data.reviews.length > 0) {
            console.log("\nTop Review:");
            console.log(JSON.stringify(data.reviews[0], null, 2));
        }
    } else {
        console.log("Failed to scrape data.");
    }
    console.log(`\nDuration: ${duration}s`);
}

main();
