import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from datetime import datetime, timedelta

# Initialize Firebase (Local Script)
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_recent_job_and_leads():
    print("--- 1. Checking Recent Jobs ---")
    jobs_ref = db.collection('jobs').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(1)
    jobs = list(jobs_ref.stream())
    
    if not jobs:
        print("No jobs found.")
        return

    job = jobs[0]
    job_data = job.to_dict()
    job_id = job.id
    print(f"Latest Job ID: {job_id}")
    print(f"Status: {job_data.get('status')}")
    print(f"Query: {job_data.get('query')}")
    print(f"Logs: {len(job_data.get('logs', []))} entries")
    
    if job_data.get('logs'):
        print("Last Leg: ", job_data['logs'][-1])

    print("\n--- 2. Checking Leads for Job ---")
    leads_ref = db.collection('leads').where('jobId', '==', job_id).limit(5)
    leads = list(leads_ref.stream())
    
    print(f"Leads Found: {len(leads)}")
    for lead in leads:
        data = lead.to_dict()
        print(f"- {data.get('BusinessName', 'NoName')} ({data.get('City')})")

if __name__ == "__main__":
    check_recent_job_and_leads()
