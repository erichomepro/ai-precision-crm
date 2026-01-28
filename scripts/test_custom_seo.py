from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
actor_id = "apify/puppeteer-scraper"
website_url = "https://trimlineofparkland.com"

client = ApifyClient(token)

print(f"Running Custom Puppeteer Scraper for {website_url}...")

page_function = """
async function pageFunction(context) {
    const { page, request, log } = context;
    const { url } = request;
    
    log.info(`Processing ${url}...`);
    
    // SEO Extraction Logic
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
    const h1s = await page.$$eval('h1', els => els.map(e => e.textContent));
    const h2s = await page.$$eval('h2', els => els.map(e => e.textContent));
    
    // Performance / Tech checks
    const performance = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return nav ? nav.loadEventEnd - nav.startTime : 0;
    });
    
    // Viewport check for mobile
    const hasViewport = await page.$eval('meta[name="viewport"]', el => !!el).catch(() => false);
    
    return {
        url,
        title,
        titleLength: title ? title.length : 0,
        description,
        descriptionLength: description ? description.length : 0,
        h1Count: h1s.length,
        h1s,
        h2s,
        loadTime: (performance / 1000).toFixed(2) + "s",
        mobileResponsive: hasViewport, // Naive check
        timestamp: new Date().toISOString()
    };
}
"""

try:
    run = client.actor(actor_id).call(run_input={
        "startUrls": [{ "url": website_url }],
        "pageFunction": page_function,
        "preNavigationHooks": """[
            async ({ page }) => {
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-US,en;q=0.9'
                });
            }
        ]""",
        "proxyConfiguration": { "useApifyProxy": True },
        "useChrome": True  # Try to use real Chrome instead of Chromium
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
