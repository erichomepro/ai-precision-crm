import os
import sys
import time

print("[DEBUG] Python starting...", flush=True)

import json
import random
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv

print("[DEBUG] Importing core libs...", flush=True)

# Load env vars
load_dotenv('.env.local')

import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
from playwright.async_api import async_playwright

print("[DEBUG] Imports done. Init Firebase...", flush=True)

# Setup logging
tenant_id = sys.argv[2] if len(sys.argv) > 2 else "default"
job_id = sys.argv[3] if len(sys.argv) > 3 else None
query = sys.argv[1] if len(sys.argv) > 1 else "Restaurants"

# Init Firebase
if not firebase_admin._apps:
    try:
        # Check for key file
        if os.path.exists('serviceAccountKey.json'):
            print("[DEBUG] Using serviceAccountKey.json", flush=True)
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
        else:
            print("[DEBUG] Using Default/ADC Credentials", flush=True)
            # Use default credentials (gcloud auth application-default login)
            firebase_admin.initialize_app()
            
        print("[DEBUG] Firebase Init Success", flush=True)
    except Exception as e:
        print(f"[WARN] Firebase Init Failed: {e}", flush=True)
        # Continue without DB if needed, but logging will fail

db = firestore.client() if firebase_admin._apps else None

# Init Gemini
# Init Gemini
print("[DEBUG] Init Gemini...", flush=True)
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    # Validated Model from check_models.py
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
    except:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    model = None
    print("[WARN] No Gemini Key found", flush=True)

print("[DEBUG] Setup Complete. Entering Main Loop...", flush=True)

# ...

async def log_remote(msg):
    print(msg, flush=True)
    if db and job_id:
        try:
            # Run DB write in executor to avoid blocking async loop since firebase-admin is sync
            # or just risk it (it's usually fast). wrapping in try/except is key.
            db.collection(u'jobs').document(job_id).update({
                u'logs': firestore.ArrayUnion([{
                    u'msg': str(msg),
                    u'time': datetime.now(timezone.utc).isoformat()
                }])
            })
        except Exception as e:
            print(f"[Log Error] Failed to write to Firestore: {e}", flush=True)

async def run():
    await log_remote(f"Python Scraper Engine Started. PID: {os.getpid()}")
    await log_remote(f"[{tenant_id}] Target: {query} (Job: {job_id})")

    async with async_playwright() as p:
        # Robust Launch Config
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--start-maximized"
        ]
        
        try:
            await log_remote("[DEBUG] Launching Browser (VISIBLE MODE)...")
            # HEADLESS=FALSE: Let the user see the work!
            browser = await p.chromium.launch(headless=False, args=launch_args)
            
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            
            # Anti-detection: Add init script
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)

            await log_remote("[DEBUG] Navigating to Google Maps...")
            await page.goto("https://www.google.com/maps", timeout=60000)
            
            # Wait for search box with robust fallbacks
            await log_remote("[DEBUG] Waiting for search box...")
            search_input = None
            selectors = [
                "input#searchboxinput", 
                "input[name='q']", 
                "input[aria-label='Search Google Maps']",
                "#searchboxinput"
            ]
            
            for selector in selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    search_input = page.locator(selector).first
                    await log_remote(f"[DEBUG] Found search box via: {selector}")
                    break
                except:
                    continue

            if not search_input:
                # Cookies might block us. Try multiple buttons.
                await log_remote("[DEBUG] Checking for consent dialogs...")
                try:
                    # Broad Accept buttons
                    await page.get_by_text("Accept all").click(timeout=3000)
                except:
                    try:
                        await page.locator("button[aria-label='Accept all']").click(timeout=3000)
                    except:
                        pass
                
                # Final desperate attempt for any input
                try:
                    search_input = page.locator("input#searchboxinput").first
                    await search_input.wait_for(timeout=10000)
                except:
                    raise Exception("Could not find search box after multiple attempts.")

            await search_input.fill(query)
            await page.keyboard.press("Enter")
            await log_remote("Searching...")
            
            # DEEP SCRAPING STRATEGY
            await log_remote("[DEBUG] Finding search results...")
            
            # 1. Get List items
            # Google Maps results are often in a Feed. We look for anchors that look like places.
            # Best selector for results in the feed: a[href*='/maps/place/'] which are children of the feed.
            
            listings_locator = page.locator("a[href*='/maps/place/'][aria-label]")
            # Wait for at least one
            try:
                await listings_locator.first.wait_for(timeout=10000)
            except:
                await log_remote("[WARN] No obvious listings found via standard selector. Attempting feed fallback...")

            # Get handles to the elements
            count = await listings_locator.count()
            await log_remote(f"[DEBUG] Found {count} potential listings.")
            
            max_leads = 10 # Increased limit for better yield
            leads_found = 0
            
            # We must iterate by index because DOM elements go stale when we navigate away/back
            for i in range(min(count, max_leads)):
                try:
                    # Re-locate the list because it might have gone stale (though usually stays if in side panel)
                    # But if we click "Back", the list re-renders.
                    
                    await log_remote(f"[Action] Clicking result #{i+1}...")
                    
                    # Ensure list is visible (sometimes details pane covers it, but usually not on desktop wide screen)
                    # If we are in "Details" mode, we might need to go back first? 
                    # Actually, we should just click the Nth element. 
                    
                    # Locator might need to be refreshed
                    items = page.locator("a[href*='/maps/place/'][aria-label]")
                    if await items.count() <= i:
                        await log_remote("[WARN] List count changed, stopping.")
                        break
                        
                    current_item = items.nth(i)
                    item_name = await current_item.get_attribute("aria-label")
                    
                    # Scroll to it
                    await current_item.scroll_into_view_if_needed()
                    await current_item.click()
                    
                    # 2. Wait for Details
                    await log_remote(f"[DEBUG] analyzing {item_name}...")
                    await page.wait_for_timeout(2000) # Wait for panel slide
                    
                    # Wait for the main heading of the details pane
                    try:
                        await page.wait_for_selector("h1", timeout=5000)
                    except:
                        pass
                        
                    # 3. Snapshot Details
                    # The details pane is usually a specific div, but body text works if we filter
                    # content = await page.inner_text("div[role='main']") # This sometimes fails if role differs
                    content = await page.inner_text("body")
                    
                    # Truncate content for Gemini
                    content_sample = content[:20000] # Increased limit for details
                    
                    # 4. Gemini Extraction
                    if model:
                        prompt = f"""
                        Analyze this Google Maps DETAILS view.
                        Extract the business details for the main business shown.
                        Return JSON: {{'BusinessName': str, 'Address': str, 'Phone': str, 'Website': str, 'Rating': str, 'ReviewCount': str}}
                        
                        Text Content:
                        {content_sample}
                        """
                        response = await model.generate_content_async(prompt)
                        text_response = response.text
                        
                        json_str = text_response.replace('```json', '').replace('```', '').strip()
                        try:
                            # It returns a single object
                            data = json.loads(json_str)
                        except:
                            data = {"BusinessName": item_name, "note": "Parse Failed", "raw_snippet": text_response[:100]}
                    else:
                        data = {"BusinessName": item_name, "note": "No AI"}

                    # 5. Save Lead
                    lead = {
                        "scoutedAt": datetime.now(timezone.utc).isoformat(),
                        "tenantId": tenant_id,
                        "jobId": job_id,
                        "enrichment": "Python+Gemini+DeepClick",
                        **data
                    }
                    
                    if db:
                        db.collection(u'leads').add(lead)
                        leads_found += 1
                        
                    await log_remote(f"[SUCCESS] Saved: {data.get('BusinessName')}")

                    # 6. Go Back to List? 
                    # On Desktop, the list usually stays on the left. 
                    # But if we clicked an item, the 'feed' might be hidden or replaced.
                    # We check if the 'Back to results' button controls exist.
                    
                    # Check if list is still visible
                    if await listings_locator.first.is_visible():
                        pass # Valid, continue
                    else:
                         # Try to find back button
                        try:
                            # Aria label 'Back' is common
                            await page.locator("button[aria-label='Back']").click(timeout=3000)
                            await page.wait_for_timeout(1000)
                        except:
                            await log_remote("[WARN] Could not find Back button, might be stuck.")
                    
                except Exception as ex:
                    await log_remote(f"[WARN] Error processing item {i}: {ex}")
                    continue

            if db and job_id:
                 db.collection(u'jobs').document(job_id).update({
                    u'status': 'COMPLETED',
                    u'leadsFound': firestore.Increment(leads_found),
                    u'completedAt': datetime.now(timezone.utc).isoformat()
                })
            
            await log_remote(f"[SUCCESS] Deep Scraping Complete. Saved {leads_found} leads.")

            await browser.close()
            
        except Exception as e:
            await log_remote(f"[CRITICAL ERROR] {e}")
            try:
                await page.screenshot(path="scraper_error_py.png")
                await log_remote("[DEBUG] Saved scraper_error_py.png")
            except:
                pass

            if job_id and db:
                 db.collection(u'jobs').document(job_id).update({'status': 'FAILED', 'error': str(e)})

if __name__ == "__main__":
    asyncio.run(run())
