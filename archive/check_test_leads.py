import modal
import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

image = modal.Image.debian_slim().pip_install("firebase-admin")
app = modal.App("check-test-leads", image=image)
secrets = [modal.Secret.from_name("ai-precision-crm-secrets")]

@app.function(secrets=secrets)
def check_leads():
    if not firebase_admin._apps:
        cert = {
            "type": "service_account",
            "project_id": os.environ["FIREBASE_PROJECT_ID"],
            "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
            "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cert)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    now = datetime.utcnow()
    docs = list(db.collection("leads").get())
    print(f"Total leads in collection: {len(docs)}")
    found = 0
    for doc in docs:
        d = doc.to_dict()
        if d.get('scoutedAt'):
            try:
                scouted_at = datetime.fromisoformat(d.get('scoutedAt'))
                # If created in last hour
                delta = now - scouted_at.replace(tzinfo=None)
                if delta.total_seconds() < 3600:
                    print(f"RECENT: {doc.id} | {d.get('BusinessName') or d.get('name')} | {d.get('scoutedAt')}")
                    found += 1
            except: pass
    
    print(f"Total Recent Matches: {found}")

if __name__ == "__main__":
    with app.run():
        check_leads.remote()
