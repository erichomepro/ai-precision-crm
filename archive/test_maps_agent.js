const { ApifyClient } = require('apify-client');

// Use native env loading or fallback
const apifyToken = process.env.APIFY_API_TOKEN;

if (!apifyToken) {
    console.error("❌ Error: APIFY_API_TOKEN not found in environment.");
    console.log("Tip: Run with `node --env-file=.env.local scripts/test_maps_agent.js`");
    process.exit(1);
}

const client = new ApifyClient({ token: apifyToken });

(async () => {
    const business = "Lang Built Homes";
    const city = "Stony Plain";
    const searchTerm = `${business} ${city}`;

    console.log(`📍 Testing Local Guide for: ${searchTerm}`);

    const actorId = "compass/crawler-google-places"; 

    const input = {
        "searchStringsArray": [searchTerm],
        "maxCrawledPlacesPerSearch": 1,
        "maxReviews": 3
    };

    try {
        const run = await client.actor(actorId).call(input);
        console.log(`✅ Run Finished: ${run.id}`);
        
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items.length > 0) {
            const place = items[0];
            console.log("\n--- RESULT ---");
            console.log(`Name: ${place.title}`);
            console.log(`Rating: ${place.totalScore} (${place.reviewsCount} reviews)`);
            console.log(`Address: ${place.address}`);
            console.log(`Reviews (Sample):`);
            if (place.reviews) {
                place.reviews.forEach(r => {
                    console.log(`- ${r.stars}★: "${r.text ? r.text.substring(0, 50) + "..." : "(No text)"}" (Replied: ${r.responseFromOwnerText ? "Yes" : "NO"})`);
                });
            } else {
                console.log("No reviews found.");
            }
        } else {
            console.log("❌ No places found.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
})();
