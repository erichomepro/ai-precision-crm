from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
actor_id = "drobnikj/seo-audit-tool"
website_url = "https://trimlineofparkland.com"

client = ApifyClient(token)

print(f"Running Actor {actor_id} for {website_url}...")

try:
    run = client.actor(actor_id).call(run_input={
        "startUrl": website_url,
        "maxCrawlingDepth": 1,
        "maxPagesPerCrawl": 1,
        "proxy": { "useApifyProxy": True },
        "pageFunction": """
            async function pageFunction(context) {
                // Just creating a dummy page function if the actor supports it to force new context
                return context;
            }
        """,
        "preNavigationHooks": """[
            async (crawlingContext, gotoOptions) => {
                await crawlingContext.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            }
        ]"""
    })
    
    print(f"Run Finished: {run['status']}")
    
    dataset_items = client.dataset(run['defaultDatasetId']).list_items().items
    
    if dataset_items:
        print("Data found:")
        print(json.dumps(dataset_items[0], indent=2))
    else:
        print("No items found in dataset.")

except Exception as e:
    print(f"Error: {e}")
