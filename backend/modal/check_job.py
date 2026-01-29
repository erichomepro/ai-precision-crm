import modal
import os
import firebase_admin
from firebase_admin import credentials, firestore

image = (
    modal.Image.debian_slim()
    .pip_install("firebase-admin")
)

app = modal.App("ai-precision-crm-debug-job", image=image)
secrets = [modal.Secret.from_name("ai-precision-crm-secrets")]

@app.function(secrets=secrets)
def check_latest_job():
    # 1. Init Firebase
    if not firebase_admin._apps:
        try:
            cert = {
                "type": "service_account",
                "project_id": os.environ["FIREBASE_PROJECT_ID"],
                "private_key_id": "12345", 
                "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
                "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
                "client_id": "12345",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dummy"
            }
            cred = credentials.Certificate(cert)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Auth Error: {e}")
            return

    db = firestore.client()
    
    print("--- Checking Latest Job ---")
    jobs_ref = db.collection('jobs').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(1)
    jobs = list(jobs_ref.stream())
    
    if not jobs:
        print("No jobs found.")
        return

    job = jobs[0]
    data = job.to_dict()
    print(f"Job ID: {job.id}")
    print(f"Query: {data.get('query')}")
    print(f"Status: {data.get('status')}")
    print(f"Error: {data.get('error')}")
    
    logs = data.get('logs', [])
    print(f"--- Logs ({len(logs)}) ---")
    for log in logs:
        print(f"[{log.get('time')}] {log.get('msg')}")

    print(f"\n--- Checking Leads for {job.id} ---")
    leads_ref = db.collection('leads').where('jobId', '==', job.id).limit(5)
    leads = list(leads_ref.stream())
    print(f"Leads Found: {len(leads)}")
    for l in leads:
        print(f" - {l.get('BusinessName')}")
