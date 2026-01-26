
import { NextResponse } from 'next/server';
// 5 levels up to ROOT/lib
import { db } from '../../../../../lib/firebase_admin';
// 4 levels up to SRC/lib
import { scrapeSocialPresence } from '../../../../lib/social_scraper';

export async function POST(req: Request) {
    let leadId = "";
    let websiteUrl = "";

    try {
        const body = await req.json();
        leadId = body.leadId;
        websiteUrl = body.websiteUrl;

        if (!leadId || !websiteUrl) {
            return NextResponse.json({ error: "Missing leadId or websiteUrl" }, { status: 400 });
        }

        // 1. Run Scraper
        console.log(`[Paparazzi] Scraping ${websiteUrl} for Lead ${leadId}...`);
        const profiles = await scrapeSocialPresence(websiteUrl);

        // 2. Format Data for Storage
        const socialData: any = {
            lastScraped: new Date().toISOString(),
            summary: "Social presence detected." // Placeholder for AI summary later
        };

        let foundCount = 0;
        profiles.forEach(p => {
            socialData[p.platform] = p.url;
            foundCount++;
        });

        // Simple Rule-Based Summary (for now)
        if (foundCount === 0) {
            socialData.summary = "No social media links found on the homepage.";
        } else if (foundCount < 2) {
            socialData.summary = "Limited social presence. Only 1 platform found.";
        } else {
            socialData.summary = `Good social foundation. Found ${foundCount} connected platforms.`;
        }

        // 3. Update Firestore
        await db.collection('leads').doc(leadId).update({
            Social: socialData
        });

        return NextResponse.json({ success: true, social: socialData });


    } catch (error: any) {
        console.error("Social Scrape Error:", error);

        // Graceful Failure: Save the error status to the lead so the user knows why it failed
        await db.collection('leads').doc(leadId).update({
            Social: {
                summary: `Scrape Failed: ${error.message || "Unknown error"}`,
                lastScraped: new Date().toISOString(),
                error: true
            }
        });

        // Return success=false but with a 200 OK so the UI can handle it gracefully without crashing
        return NextResponse.json({
            success: false,
            social: { summary: "Scrape Attempted but Failed." },
            error: error.message
        });
    }
}
