from apify_client import ApifyClient
import json
from datetime import datetime
import os

token = os.getenv("APIFY_TOKEN")
actor_id = "louisdeconinck/seo-checker"
client = ApifyClient(token)

print(f"Fetching latest run for actor: {actor_id}...")

try:
    # List runs, sorted by desc (default is usually desc, but let's just get a list)
    # The client doesn't support convenient sorting in list_runs params directly in all versions, 
    # but list_runs usually returns most recent first or we can sort.
    runs_page = client.actor(actor_id).runs().list(limit=1, desc=True)
    
    if not runs_page.items:
        print("No runs found.")
        exit()
        
    last_run = runs_page.items[0]
    
    print(f"Latest Run ID: {last_run['id']}")
    print(f"Status: {last_run['status']}")
    print(f"Created At: {last_run['startedAt']}")
    print(f"Default Dataset ID: {last_run['defaultDatasetId']}")
    
    # Get Input to see what URL was targeted
    # For some reason input fetching might be separate or part of run details.
    # Let's get full run details just in case
    run_details = client.run(last_run['id']).get()
    
    # Fetch dataset
    dataset_items = client.dataset(last_run['defaultDatasetId']).list_items().items
    
    print(f"\n--- DATASET ITEMS ({len(dataset_items)}) ---")
    if dataset_items:
        print(json.dumps(dataset_items[0], indent=2))
    else:
        print("No items in dataset.")

except Exception as e:
    print(f"Error: {e}")
