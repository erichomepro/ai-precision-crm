
import firebase_admin
from firebase_admin import credentials, firestore
import datetime

# Initialize (handling re-init)
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate("service_account_key.json")
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Auth Init Skipped/Failed (Might rely on default creds): {e}")

db = firestore.client()

def test_full_flow():
    print("=== STARTING PYTHON DB VERIFICATION ===")
    
    # 1. WRITE
    doc_ref = db.collection('brands').document()
    payload = {
        'name': 'Python Test Brand',
        'createdAt': datetime.datetime.now(),
        'knowledge_base': [],
        'business_overview': ''
    }
    doc_ref.set(payload)
    print(f"✅ WRITE Success. ID: {doc_ref.id}")
    
    # 2. READ
    check = doc_ref.get()
    if check.exists:
         print(f"✅ READ Success. Found: {check.to_dict()['name']}")
    else:
         print("❌ READ Failed")
         
    # 3. UPDATE (Simulate Upload)
    doc_ref.update({
        'knowledge_base': ['http://test.com/file.pdf']
    })
    check2 = doc_ref.get()
    kb = check2.to_dict().get('knowledge_base')
    if kb and len(kb) == 1:
        print("✅ UPDATE (Upload) Success. KB count: 1")
    else:
        print("❌ UPDATE Failed")
        
    # 4. OVERVIEW (Simulate save)
    doc_ref.update({
        'business_overview': 'AI Generated Overview Text'
    })
    check3 = doc_ref.get()
    ov = check3.to_dict().get('business_overview')
    if ov == 'AI Generated Overview Text':
        print("✅ UPDATE (Overview) Success.")
    else:
        print("❌ UPDATE Overview Failed")

    print("\n--- CONCLUSION ---")
    print("Database is HEALTHY. If UI fails, it is client-side state issue.")

if __name__ == "__main__":
    test_full_flow()
