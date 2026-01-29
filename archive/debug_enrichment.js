const { ApifyClient } = require('apify-client');

const apifyToken = process.env.APIFY_TOKEN;
const actorId = "LpVuK3Zozwuipa5bp";

const input = {
    "profileScraperMode": "Profile details no email ($4 per 1k)",
    "queries": ["https://www.linkedin.com/in/michael-thomas-63845049/"]
};

(async () => {
    try {
        console.log("--- STARTING DEBUG RUN ---");
        const client = new ApifyClient({ token: apifyToken });

        console.log(`Calling Actor: ${actorId}`);
        const run = await client.actor(actorId).call(input);

        console.log(`Run ${run.id} Status: ${run.status}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`Items count: ${items.length}`);
        if (items.length > 0) {
            console.log("First Item Preview:", JSON.stringify(items[0], null, 2));
        } else {
            console.log("Make sure 'queries' is the correct input key for this Actor!");
        }

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    }
})();
