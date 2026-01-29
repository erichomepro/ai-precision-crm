import modal
import os
import firebase_admin
from firebase_admin import credentials, firestore
import json

image = (
    modal.Image.debian_slim()
    .pip_install("firebase-admin")
)

app = modal.App("ai-precision-crm-inspect", image=image)
secrets = [modal.Secret.from_name("ai-precision-crm-secrets")]

@app.function(secrets=secrets)
def inspect():
    if not firebase_admin._apps:
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

    db = firestore.client()
    jobs = list(db.collection('jobs').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(1).stream())
    
    if not jobs:
        print("NO_JOBS_FOUND")
        return

    job = jobs[0]
    data = job.to_dict()
    output = {
        "jobId": job.id,
        "query": data.get("query"),
        "status": data.get("status"),
        "leadsFound": data.get("leadsFound"),
        "logs": data.get("logs", [])
    }
    print(json.dumps(output, indent=2))
