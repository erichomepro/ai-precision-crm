const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Manual .env.local parsing
try {
    if (fs.existsSync('.env.local')) {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && !line.trim().startsWith('#')) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (key) process.env[key] = val;
            }
        });
    }
} catch (e) { console.error('Error loading .env.local manually', e); }

puppeteer.use(StealthPlugin());

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-precision-crm'
    });
}
const db = admin.firestore();

// 2.0 Flash is verified working
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

(async () => {
    const args = process.argv.slice(2);
    const query = args[0] || 'Restaurants';
    const tenantId = args[1] || 'default';
    const jobId = args[2];

    const logRemote = async (msg) => {
        console.log(msg);
        if (jobId) {
            try {
                await db.collection('jobs').doc(jobId).update({
                    logs: admin.firestore.FieldValue.arrayUnion({ msg, time: new Date().toISOString() })
                });
            } catch (e) { }
        }
    };

    await logRemote(`[DEBUG] Scout (List Mode) starting. Query: ${query}`);

    let browser;
    try {
        // Auto-detect Chrome
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];
        const chromePath = possiblePaths.find(p => fs.existsSync(p));

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--start-maximized']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await logRemote('[DEBUG] Navigating to Maps...');
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'load', timeout: 60000 });

        // Wait for Feed or List
        await logRemote('[DEBUG] Waiting for results...');
        try {
            await page.waitForSelector('div[role="feed"], a[href*="/maps/place"]', { timeout: 15000 });
        } catch (e) {
            await logRemote('[WARN] Timeout waiting for feed, scraping whatever failed.');
        }

        // SCROLLING to load more (Scan minimal)
        await logRemote('[DEBUG] Scrolling for more results...');
        try {
            const feed = await page.$('div[role="feed"]');
            if (feed) {
                await page.evaluate(el => el.scrollBy(0, 5000), feed);
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) { }

        // --- DOM EXTRACTION STRATEGY ---
        // We scrape specific elements to ensure we get the URL (GMB Link) for each item.
        await logRemote('[DEBUG] Extracting list items...');

        const rawItems = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
            return cards.map((c, index) => {
                // Heuristic: Go up to find the common container
                let parent = c.closest('div[role="article"]');
                if (!parent) {
                    // Fallback: Go up 4 levels
                    parent = c.parentElement?.parentElement?.parentElement?.parentElement;
                }

                let website = null;
                if (parent) {
                    const links = Array.from(parent.querySelectorAll('a'));
                    for (const link of links) {
                        const href = link.href;
                        // Ignore the map link itself, directions, and google domains
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
        });

        await logRemote(`[DEBUG] Found ${rawItems.length} potential listings.`);

        // Remove duplicates and irrelevant links
        const uniqueItems = [];
        const seen = new Set();
        for (const item of rawItems) {
            if (!seen.has(item.url) && item.url.includes('/maps/place/')) {
                seen.add(item.url);
                uniqueItems.push(item);
            }
        }

        // Limit to 20 to avoid timeouts/costs
        const targetItems = uniqueItems.slice(0, 20);
        await logRemote(`[DEBUG] Processing ${targetItems.length} unique leads...`);

        // Batch Enrichment via Gemini
        // We send the list of text blobs and ask for a JSON array back

        if (targetItems.length === 0) {
            await logRemote('[WARN] No listings found in DOM. dumping body...');
            // Fallback to body dump if DOM strategy failed
        } else {
            const prompt = `
            You are a data extraction engine.
            I will provide a list of text snippets from Google Maps.
            For EACH item, return a JSON object with: 
            - BusinessName
            - Address
            - City (Infer from address)
            - Industry (Infer from business name/text, e.g. "Dentist", "Plumber")
            - Rating (e.g. "4.5")
            - Phone (if present)
            - Website (if present)
            - Viability ("High" if they have website, "Low" if not)
            
            Input Data:
            ${JSON.stringify(targetItems.map((item, i) => ({ id: i, text: item.text.substring(0, 500) })))}
            
            Return ONLY a valid JSON Array of objects.
            `;

            await logRemote('[AI] sending batch to Gemini...');
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsedLeads = [];
            try {
                parsedLeads = JSON.parse(jsonStr);
            } catch (e) {
                await logRemote('[ERROR] JSON Parse failed. ' + text.substring(0, 50));
            }

            // Merge AI data with URLs
            let savedCount = 0;
            const batch = db.batch();

            // Map AI results back to items? 
            // Gemini preserves order usually, or we can use the ID trick.
            // Assuming order is preserved for now.

            for (let i = 0; i < parsedLeads.length; i++) {
                if (i >= targetItems.length) break;

                const leadData = parsedLeads[i];
                const original = targetItems[i]; // Matches index

                if (!leadData.BusinessName) continue;

                // Merge Data: Prefer DOM-extracted website if available
                const finalWebsite = original.website || leadData.Website;
                // If website is just "Yes" or "Website", clear it
                // Clean Website
                const cleanWebsite = (finalWebsite && finalWebsite.includes('.')) ? finalWebsite : null;

                // Robust Fallback: If AI didn't catch City/Industry, try to parse from Query
                // Query Format expected: "Industry in City" or "Industry City"
                let finalCity = leadData.City;
                let finalCategory = leadData.Industry;

                if (!finalCity && query.toLowerCase().includes(' in ')) {
                    const parts = query.split(' in ');
                    if (parts.length > 1) finalCity = parts[1].trim();
                }

                if (!finalCategory) {
                    finalCategory = query.split(' in ')[0].trim();
                }

                // Final capitalization fix
                const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
                finalCity = finalCity ? capitalize(finalCity) : "Unknown";
                finalCategory = finalCategory ? capitalize(finalCategory) : capitalize(query);

                const leadDoc = db.collection('leads').doc();
                batch.set(leadDoc, {
                    ...leadData,
                    Website: cleanWebsite, // Overwrite bad AI guess
                    GmbLink: original.url, // MATCHES UI EXPECTATION
                    googleMapsUrl: original.url, // Legacy backup
                    tenantId,
                    jobId,
                    scoutedAt: new Date().toISOString(),
                    enrichment: 'Gemini 2.0 List',
                    Category: finalCategory,
                    City: finalCity
                });
                savedCount++;
            }

            await batch.commit();
            await logRemote(`[SUCCESS] Saved ${savedCount} leads to database.`);

            if (jobId) {
                await db.collection('jobs').doc(jobId).update({
                    status: 'COMPLETED',
                    leadsFound: savedCount,
                    completedAt: new Date().toISOString()
                });
            }
        }

    } catch (error) {
        await logRemote(`[CRASH] ${error.message}`);
        console.error(error);
        if (jobId) await db.collection('jobs').doc(jobId).update({ status: 'FAILED', error: error.message });
    } finally {
        if (browser) await browser.close();
        process.exit(0);
    }
})();
