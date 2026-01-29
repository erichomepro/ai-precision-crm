
import firebase_admin
from firebase_admin import credentials, firestore
import json

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate("service_account_key.json")
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Skipping auth (assuming emulator or local/none): {e}")

db = firestore.client()

def check_brand():
    # Search for the brand by website or name
    # Trying website first as it's the primary key in UI
    try:
        docs = db.collection('brands').where('website', '>=', 'https://www.aiprecisionmarketing.ca').limit(5).stream()
        found = False
        for doc in docs:
            found = True
            data = doc.to_dict()
            print(f"\n--- Found Brand: {doc.id} ---")
            print(f"Name: {data.get('name')}")
            print(f"Website: {data.get('website')}")
            print(f"Knowledge Base (Count): {len(data.get('knowledge_base', []))}")
            print(f"Knowledge Base (Files): {json.dumps(data.get('knowledge_base', []), indent=2)}")
            print(f"Business Overview: {data.get('business_overview')[:100] if data.get('business_overview') else 'MISSING'}")
            print(f"Design System: {json.dumps(data.get('design_system', {}), indent=2)}")
            
        if not found:
            print("\nNo brand found for website 'https://www.aiprecisionmarketing.ca'")
            
    except Exception as e:
        print(f"Error querying: {e}")

if __name__ == "__main__":
    check_brand()
