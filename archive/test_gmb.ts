
import { GoogleBusinessClient } from '../src/lib/google-business';

async function main() {
    try {
        console.log("Initializing Google Business Client...");
        const client = new GoogleBusinessClient();

        console.log("Fetching Accounts...");
        const accounts = await client.getAccounts();
        console.log(`Found ${accounts.length} accounts.`);

        if (accounts.length > 0) {
            const accountName = accounts[0].name; // e.g., "accounts/123456"
            console.log(`Using first account: ${accountName} (${accounts[0].accountName})`);

            console.log("Fetching Locations...");
            const locations = await client.getLocations(accountName as string); // Type cast might be needed if type defs are loose
            console.log(`Found ${locations.length} locations.`);

            if (locations.length > 0) {
                const locationName = locations[0].name; // e.g., "accounts/123/locations/456"
                console.log(`Fetching reviews for location: ${locationName}`);

                try {
                    const reviews = await client.getReviews(locationName as string);
                    console.log(`Found ${reviews.length} reviews.`);
                    console.log(JSON.stringify(reviews.slice(0, 2), null, 2));
                } catch (err: any) {
                    console.error("Failed to fetch reviews:", err.message);
                }
            }
        }
    } catch (error: any) {
        console.error("Error in GMB Test:", error.message);
        console.error("Make sure 'gmb_credentials.json' exists in the root.");
    }
}

main();
