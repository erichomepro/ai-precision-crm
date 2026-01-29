import modal
import os
import json
import asyncio
import random
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
        
        # Navigate
        # Browser Agent-Grade Stealth (from internal skills)
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        ]
        
        context = await browser.new_context(
            user_agent=random.choice(user_agents),
            viewport={'width': random.randint(1280, 1920), 'height': random.randint(720, 1080)},
            device_scale_factor=random.uniform(1, 2)
        )
        
        page = await context.new_page()
        
        # Mask Webdriver (Critical Stealth)
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        """)

        search_url = f"https://www.google.com/maps/search/{query}"
        await log_remote(f"Navigating to: {search_url}")
        
        try:
            # More lenient navigation: domcontentloaded + manual wait instead of networkidle
            await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            await log_remote("DOM Content Loaded. Waiting for stabilizers...")
            await asyncio.sleep(random.uniform(5, 8)) # Give it time to render the list
            
            title = await page.title()
            content = await page.content()
            await log_remote(f"Page Ready. Title: '{title}'. Snapshot Size: {len(content)}")
            
            if "Robot" in title or "CAPTCHA" in content or len(content) < 5000:
                 await log_remote("[CRITICAL] Anti-bot or Blank Page detected! Switching to Google Search Fallback...")
                 # --- SEARCH FALLBACK ---
                 fallback_url = f"https://www.google.com/search?q={query}"
                 await page.goto(fallback_url, wait_until="domcontentloaded", timeout=30000)
                 await asyncio.sleep(random.uniform(3, 5))
                 await log_remote("Search Fallback Loaded.")
            
            # Use Resilient Locators (ARIAs and Roles)
            try:
                # Primary: The scrollable feed or search results
                feed = page.locator('div[role="feed"], div[role="main"], #search')
                await feed.wait_for(timeout=15000)
                await log_remote("Content area localized.")
            except:
                await log_remote("Extraction warning: Content area not localized. Proceeding with raw scan.")

        except Exception as e:
            await log_remote(f"Navigation Warning: {e}. Attempting extraction anyway.")

        # Human-like scrolling to trigger lazy loading
        await log_remote("Scrolling for more results (Simulating human activity)...")
        for _ in range(3):
            await page.mouse.wheel(0, random.randint(1000, 3000))
            await asyncio.sleep(random.uniform(1, 2))

        # Extract Elements using ARIAs/Roles
        await log_remote("Extracting list items...")
        
        raw_items = await page.evaluate("""() => {
            // Find business containers using common ARIA/Schema patterns
            let elements = Array.from(document.querySelectorAll('div[role="article"], a[href*="/maps/place/"], .Nv2W1c'));
            
            if (elements.length === 0) {
                // Check if it redirected to a single business page (Knowledge Graph style)
                const title = document.querySelector('h1.fontHeadlineLarge')?.innerText;
                if (title) {
                    return [{
                        url: window.location.href,
                        text: document.body.innerText,
                        website: document.querySelector('a[data-item-id="authority"]')?.href
                    }];
                }
            }

            return elements.map(el => {
                let parent = el.closest('div[role="article"]') || el;
                let anchor = el.tagName === 'A' ? el : parent.querySelector('a[href*="/maps/place/"]');
                
                return {
                    url: anchor?.href || window.location.href,
                    text: parent.innerText,
                    website: parent.querySelector('a[data-item-id="authority"]')?.href || null
                };
            });
        }""")
        
        await log_remote(f"Found {len(raw_items)} potential raw items.")

        # Deduplicate and Clean
        seen_names = set()
        for item in raw_items:
            url = item.get("url", "")
            text = item.get("text", "").strip()
            # Lenient filter: If it's a place link OR we only have a few results (Likely a direct hit)
            is_place = "/maps/place/" in url
            name = text.split("\n")[0].strip() if text else "Unknown"
            
            if name not in seen_names and (is_place or len(raw_items) <= 3):
                if name != "Unknown":
                    seen_names.add(name)
                    results.append(item)
                    await log_remote(f"  Captured: {name}")
        
        await log_remote(f"Deduplicated to {len(results)} valid results.")
        
        # Limit to 20
        results = results[:20]
        await log_remote(f"Final lead set size: {len(results)}")
        
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
        await log_remote(f"Raw Gemini Response: {text_resp[:200]}...")
        parsed_leads = json.loads(text_resp)
        await log_remote(f"AI Parsed {len(parsed_leads)} leads.")
    except Exception as e:
        await log_remote(f"AI Enrichment Failed: {e}")
        parsed_leads = []

    # --- 5. Save to Firestore ---
    batch = db.batch()
    saved_count = 0

    for i, lead_data in enumerate(parsed_leads):
        if i >= len(results): break
        
        original = results[i]
        
        # Robust name extraction
        name = lead_data.get("BusinessName") or lead_data.get("Business Name") or lead_data.get("business_name") or lead_data.get("name")
        if not name:
             await log_remote(f"Skipping lead {i} due to missing name in AI response: {lead_data}")
             continue

        await log_remote(f"  Preparing Lead {i}: {name}")
        
        website = lead_data.get("Website") or lead_data.get("website") or lead_data.get("URL") or original.get("website")
        clean_website = website if website and "." in str(website) else None
        
        final_city = lead_data.get("City") or lead_data.get("city") or lead_data.get("Location")
        final_category = lead_data.get("Industry") or lead_data.get("Category") or lead_data.get("category")
        
        # Simple defaults if AI missed logic
        if not final_city and " in " in query.lower():
            try: final_city = query.lower().split(" in ")[1].strip().title()
            except: pass
        if not final_category:
             final_category = query.split(" in ")[0].strip().title()

        lead_ref = db.collection("leads").document()
        
        lead_payload = {
            **lead_data,
            "BusinessName": name,
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

    try:
        batch.commit()
        await log_remote(f"FINISH: Firestore Batch Committed. Total Leads Written: {saved_count}")
    except Exception as e:
        await log_remote(f"FATAL: Firestore Batch Commit Failed: {e}")

    if job_id:
        try:
            db.collection("jobs").document(job_id).update({
                "status": "COMPLETED",
                "leadsFound": saved_count,
                "completedAt": datetime.utcnow().isoformat()
            })
            await log_remote("Job Status Updated: COMPLETED")
        except Exception as e:
            await log_remote(f"Job Status Update Bypassed (Normal if doc doesn't exist): {e}")

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
