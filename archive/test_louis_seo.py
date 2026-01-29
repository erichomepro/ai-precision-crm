from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
actor_id = "louisdeconinck/seo-checker"
website_url = "https://example.com"

client = ApifyClient(token)

print(f"Running {actor_id} for {website_url}...")

# Heuristic input based on common Apify patterns for SEO tools. 
# Usually 'url' or 'startUrls'. I will try 'url' first as it's common for single-page checkers.
run_input = {
    "startUrls": [{ "url": website_url }],
    "maxDepth": 1 # heuristic
}

try:
    # First, let's try to just run it. If input is wrong, it will fail fast.
    run = client.actor(actor_id).call(run_input=run_input)
    
    print(f"Run Finished: {run['status']}")
    
    dataset_items = client.dataset(run['defaultDatasetId']).list_items().items
    
    if dataset_items:
        print("Data found:")
        print(json.dumps(dataset_items[0], indent=2))
        
        # Check if there are more items (sometimes SEO tools return one item per page)
        print(f"Total items: {len(dataset_items)}")
    else:
        print("No items found in dataset.")

except Exception as e:
    print(f"Error: {e}")
