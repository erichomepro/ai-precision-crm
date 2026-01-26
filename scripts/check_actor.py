from apify_client import ApifyClient
import json
import os

token = os.getenv("APIFY_TOKEN")
client = ApifyClient(token)

actor_id = "drobnikj/seo-audit-tool"

print(f"Fetching Info for Actor: {actor_id}")

try:
    actor = client.actor(actor_id).get()
    print(f"Name: {actor.get('name')}")
    print(f"Description: {actor.get('description')}")
    
    # Try to get input schema if possible (usually not directly exposed via client.actor().get(), but we can check versions)
    # Alternatively, we can just try to run it with a custom userAgent and see if it sticks in the logs (I'll do that in a separate step if needed)
    
    # Check latest build
    print(f"Default Request Input: {json.dumps(actor.get('exampleRunInput'), indent=2)}")

except Exception as e:
    print(f"Error: {e}")
