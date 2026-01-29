import modal
import os
import json
from datetime import datetime
from typing import TYPE_CHECKING
import firebase_admin
from firebase_admin import credentials, firestore

# Reuse the same image definition as scout_modal.py to ensure environment parity
image = (
    modal.Image.debian_slim()
    .pip_install("firebase-admin", "fastapi[standard]")
)

app = modal.App("ai-precision-crm-firestore-check", image=image)

# Secrets: You must create 'ai-precision-crm-secrets' in Modal Dashboard or CLI
secrets = [modal.Secret.from_name("ai-precision-crm-secrets")]

@app.function(secrets=secrets)
def check_firestore_write(tenant_id: str = "test_user"):
    """
    Diagnostic function to verify Modal can authenticate and write to Firestore.
    """
    print(f"[Diag] Starting Firestore Check for Tenant: {tenant_id}")

    # --- 1. Initialize Firebase ---
    if not firebase_admin._apps:
        try:
            # Construct cert from env vars (same logic as scout_modal)
            raw_key = os.environ.get("FIREBASE_PRIVATE_KEY", "")
            if not raw_key:
                print("[Diag] FATAL: FIREBASE_PRIVATE_KEY env var is missing/empty!")
                return False

            cert = {
                "type": "service_account",
                "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
                "private_key_id": "12345", 
                "private_key": raw_key.replace("\\n", "\n"),
                "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
                "client_id": "12345",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dummy"
            }
            
            # Basic validation
            if not cert["project_id"] or not cert["client_email"]:
                 print("[Diag] FATAL: Missing Project ID or Client Email in secrets.")
                 return False

            cred = credentials.Certificate(cert)
            firebase_admin.initialize_app(cred)
            print("[Diag] Firebase Initialized Successfully.")
        except Exception as e:
            print(f"[Diag] Firebase Init Error: {e}")
            return False
    
    # --- 2. Write Test Doc ---
    try:
        db = firestore.client()
        test_ref = db.collection("leads").document("modal_connectivity_test")
        test_payload = {
            "BusinessName": "Modal Connectivity Test",
            "City": "Cloud City",
            "scoutedAt": datetime.utcnow().isoformat(),
            "tenantId": tenant_id,
            "status": "Verified"
        }
        test_ref.set(test_payload)
        print("[Diag] SUCCESS: Wrote 'modal_connectivity_test' document to 'leads' collection.")
        return True
    except Exception as e:
        print(f"[Diag] Firestore Write Failed: {e}")
        return False
