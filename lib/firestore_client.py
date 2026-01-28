import os
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Setup Firestore Client
# Ensure GCLOUD_PROJECT is set or creds are available.

def get_db():
    if not firebase_admin._apps:
        # Use Application Default Credentials (gcloud auth application-default login)
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': os.environ.get('GOOGLE_CLOUD_PROJECT', 'ai-precision-crm'),
        })
    return firestore.client()

def get_tenant_config(tenant_id):
    """
    Fetches configuration for a specific tenant.
    """
    db = get_db()
    try:
        doc = db.collection('tenants').document(tenant_id).get()
        if doc.exists:
            return doc.to_dict()
        return {}
    except Exception as e:
        print(f"Error fetching tenant config: {e}")
        return {}
