import modal
import os
import json
import asyncio
from datetime import datetime

# Define the Modal Image
# We need Playwright (and browsers), Firebase Admin, and Gemini
image = (
    modal.Image.debian_slim()
    .pip_install("playwright", "firebase-admin", "google-generativeai", "fastapi[standard]")
    .run_commands("playwright install-deps", "playwright install chromium")
)

app = modal.App("ai-precision-crm-scout", image=image)

# Secrets: You must create 'ai-precision-crm-secrets' in Modal Dashboard or CLI
secrets = [modal.Secret.from_name("ai-precision-crm-secrets")]

@app.function(secrets=secrets, timeout=600)
async def run_scout_logic(query: str, tenant_id: str = "default", job_id: str = None):
    """
    Core Logic (Internal Background Function)
    """
    from playwright.async_api import async_playwright
    import firebase_admin
    from firebase_admin import credentials, firestore
    import google.generativeai as genai

    print(f"[Modal] Core Logic Started for Job: {job_id}")

    # --- 1. Initialize Firebase (Idempotent) ---
    if not firebase_admin._apps:
        try:
             # Construct cert from env vars (injected by Modal Secret)
            cert = {
                "type": "service_account",
                "project_id": os.environ["FIREBASE_PROJECT_ID"],
                "private_key_id": "12345", # Dummy
                "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
                "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
                "client_id": "12345", # Dummy
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ai-precision-crm.iam.gserviceaccount.com"
            }
            cred = credentials.Certificate(cert)
            firebase_admin.initialize_app(cred)
            print("[Modal] Firebase Initialized.")
        except Exception as e:
            print(f"[Modal] Firebase Init Error: {e}")
            return
    
    db = firestore.client()

    # --- 2. Initialize Gemini ---
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    # --- Helper: Log to Firestore Job ---
    async def log_remote(msg):
        print(f"[Modal] {msg}")
        if job_id:
            try:
                # Firestore client in Python is typically synchronous, but can run in async contexts.
                # For robustness in Cloud Functions, catching exceptions is key.
                db.collection("jobs").document(job_id).update({
                    "logs": firestore.ArrayUnion([{"msg": msg, "time": datetime.utcnow().isoformat()}])
                })
            except Exception as e:
                print(f"Log Error: {e}")

    await log_remote(f"Starting Scout Logic for Query: {query}")

    # --- 3. Scrape Google Maps (Playwright) ---
    results = []
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate
        await log_remote("Navigating to Google Maps...")
        search_url = f"https://www.google.com/maps/search/{query}"
        try:
            await page.goto(search_url, timeout=60000)
            title = await page.title()
            content = await page.content()
            await log_remote(f"Page Loaded. Title: '{title}'. Length: {len(content)}")
            
            if "Robot" in title or "CAPTCHA" in content:
                 await log_remote("[WARNING] Google CAPTCHA/Anti-bot detected!")

            await page.wait_for_selector('div[role="feed"], a[href*="/maps/place"]', timeout=20000)
        except Exception as e:
            await log_remote(f"Navigation/Selector Warning: {e}. Trying to scrape whatever is visible.")

        # Scroll (Scan minimal)
        await log_remote("Scrolling results...")
        try:
            feed = await page.query_selector('div[role="feed"]')
            if feed:
                await feed.evaluate("node => node.scrollBy(0, 5000)")
                await asyncio.sleep(2) # Allow load
        except Exception as e:
             # feed might not be found if there are few results or different layout
            pass

        # Extract Elements
        await log_remote("Extracting list items...")
        
        raw_items = await page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
            return cards.map((c, index) => {
                let parent = c.closest('div[role="article"]');
                if (!parent) {
                    parent = c.parentElement?.parentElement?.parentElement?.parentElement;
                }

                let website = null;
                if (parent) {
                    const links = Array.from(parent.querySelectorAll('a'));
                    for (const link of links) {
                        const href = link.href;
                        if (href && !href.includes('google.com') && href.startsWith('http')) {
                            website = href;
                            break;
                        }
                    }
                }

                return {
                    url: c.href,
                    text: parent ? parent.innerText : c.innerText,
                    website: website
                };
            });
        }""")
        
        await log_remote(f"Found {len(raw_items)} raw items.")

        # Deduplicate
        seen = set()
        for item in raw_items:
            url = item.get("url", "")
            if url not in seen and "/maps/place/" in url:
                seen.add(url)
                results.append(item)
        
        # Limit to 20
        results = results[:20]
        await log_remote(f"Processing {len(results)} unique leads...")
        
        await browser.close()

    if not results:
        await log_remote("No results found. Exiting.")
        if job_id:
             db.collection("jobs").document(job_id).update({"status": "FAILED", "error": "No results found"})
        return {"success": False, "reason": "No results"}

    # --- 4. Enrich with Gemini ---
    prompt = f"""
    You are a data extraction engine.
    I will provide a list of text snippets from Google Maps.
    For EACH item, return a JSON object with: 
    - BusinessName
    - Address
    - City (Infer from address)
    - Industry (Infer from business name/text, e.g. "Dentist")
    - Rating (e.g. "4.5")
    - Phone (if present)
    - Website (if present)
    - Viability ("High" if they have website, "Low" if not)
    
    Input Data:
    {json.dumps([{'id': i, 'text': item['text'][:500]} for i, item in enumerate(results)])}
    
    Return ONLY a valid JSON Array of objects.
    """

    await log_remote("Enriching with AI...")
    try:
        response = model.generate_content(prompt)
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        parsed_leads = json.loads(text_resp)
    except Exception as e:
        await log_remote(f"AI Enrichment Failed: {e}")
        parsed_leads = []

    # --- 5. Save to Firestore ---
    batch = db.batch()
    saved_count = 0

    for i, lead_data in enumerate(parsed_leads):
        if i >= len(results): break
        
        original = results[i]
        
        if not lead_data.get("BusinessName"): continue

        final_website = original.get("website") or lead_data.get("Website")
        clean_website = final_website if final_website and "." in final_website else None
        
        final_city = lead_data.get("City")
        final_category = lead_data.get("Industry")
        
        # Simple defaults if AI missed logic
        if not final_city and " in " in query.lower():
            try: final_city = query.lower().split(" in ")[1].strip().title()
            except: pass
        if not final_category:
             final_category = query.split(" in ")[0].strip().title()

        lead_ref = db.collection("leads").document()
        
        lead_payload = {
            **lead_data,
            "Website": clean_website,
            "GmbLink": original["url"],
            "googleMapsUrl": original["url"],
            "tenantId": tenant_id,
            "jobId": job_id,
            "scoutedAt": datetime.utcnow().isoformat(),
            "enrichment": "Modal + Gemini 2.0",
            "Category": final_category,
            "City": final_city
        }
        
        batch.set(lead_ref, lead_payload)
        saved_count += 1

    batch.commit()
    await log_remote(f"Saved {saved_count} leads to DB.")

    if job_id:
        db.collection("jobs").document(job_id).update({
            "status": "COMPLETED",
            "leadsFound": saved_count,
            "completedAt": datetime.utcnow().isoformat()
        })

    return {"success": True, "count": saved_count}



@app.function()
@modal.fastapi_endpoint(method="POST")
def scout_webhook(item: dict):
    """
    Public Webhook: Receives JSON { query, tenantId, jobId }
    Triggers the background scraper.
    """
    query = item.get("query")
    tenant_id = item.get("tenantId")
    job_id = item.get("jobId")
    
    print(f"[Webhook] Received request: {query} for Job {job_id}")

    # Run in background (spawn)
    run_scout_logic.spawn(query, tenant_id, job_id)
    
    return {"status": "started", "jobId": job_id, "message": "Scout running in Modal background"}
