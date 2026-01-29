from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
actor_id = "apify/cheerio-scraper"
website_url = "https://trimlineofparkland.com"

client = ApifyClient(token)

print(f"Running Cheerio Scraper for {website_url}...")

page_function = """
async function pageFunction(context) {
    const { $, request, log } = context;
    const { url } = request;
    
    log.info(`Processing ${url}...`);
    
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content');
    const h1s = $('h1').map((i, el) => $(el).text()).get();
    
    return {
        url,
        title,
        titleLength: title ? title.length : 0,
        description,
        descriptionLength: description ? description.length : 0,
        h1Count: h1s.length,
        h1s,
        loadTime: "N/A", // Cheerio doesn't measure load time the same way
        mobileResponsive: $('meta[name="viewport"]').length > 0,
        timestamp: new Date().toISOString()
    };
}
"""

try:
    run = client.actor(actor_id).call(run_input={
        "startUrls": [{ "url": website_url }],
        "pageFunction": page_function,
        "proxyConfiguration": { "useApifyProxy": True }
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
