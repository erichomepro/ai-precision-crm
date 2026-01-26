import os
import subprocess
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv('.env.local')

import firebase_admin
from firebase_admin import credentials, firestore

# Init Firebase
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase Init Error: {e}")

db = firestore.client()

import sys

def main():
    print("Initializing Python Scout Launch...")
    
    # Allow query override via CLI
    query = sys.argv[1] if len(sys.argv) > 1 else "Baker Stony Plain"
    
    try:
        # 1. Create Job
        job_ref = db.collection(u'jobs').document()
        job_id = job_ref.id
        
        job_data = {
            u'type': u'SCOUT',
            u'query': query,
            u'tenantId': u'beast_mode',
            u'status': u'PENDING',
            u'createdAt': datetime.now(timezone.utc).isoformat(),
            u'isManual': True,
            u'engine': u'python'
        }
        
        job_ref.set(job_data)
        
        print(f"Job Created via Firestore. ID: {job_id}")
        print(f"Spawning Python Engine for: {query}")
        
        # 2. Spawn Subprocess
        # python execution/universal_scraper.py "Query" "Tenant" "JobId"
        cmd = [
            "python", 
            "execution/universal_scraper.py", 
            query, 
            "beast_mode", 
            job_id
        ]
        
        subprocess.run(cmd, check=True)
        
        print(f"\nMission Complete.")
        print(f"Check Dashboard for Job ID: {job_id}")
        
    except Exception as e:
        print(f"Launch Failed: {e}")

if __name__ == "__main__":
    main()
