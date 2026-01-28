from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
client = ApifyClient(token)

run_id = "9mWkWCQnlnpcaFxEs"

print(f"Inspecting Run: {run_id}")

try:
    run = client.run(run_id).get()
    print(f"Status: {run.get('status')}")
    print(f"Dataset ID: {run.get('defaultDatasetId')}")

    dataset_items = client.dataset(run['defaultDatasetId']).list_items().items
    
    print(f"Item Count: {len(dataset_items)}")
    if dataset_items:
        print("First Item:")
        print(json.dumps(dataset_items[0], indent=2))
    else:
        print("No items found.")

except Exception as e:
    print(f"Error: {e}")
