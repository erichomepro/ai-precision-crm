# SOP_SCOUT (The Scout)

## AGENT ROLE
Lead Discovery Specialist

## PRIMARY TOOL
`execution/maps_scraper.js` (Puppeteer)

## GOAL
Find local businesses that are "AI-Vulnerable" (missing websites, low ratings, or slow response times).

## EXECUTION STEPS
1. **Receive City and Niche** from the Master Agent.
2. **Execute Scraper** in the Antigravity built-in browser (or headless via script).
3. **Filter Leads**:
    - DISCARD: 5-star ratings with 500+ reviews (too fast/hard to sell).
    - KEEP: 3.5 - 4.2 stars (reputation management candidates).
    - KEEP: Missing website or "Own this business?" claim not verified.
4. **Save Data**:
    - `business_name`
    - `website_url`
    - `maps_link`
    - Save to Firestore `leads` collection.
