import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
// We will simply Import the client DB if we are in a server component that supports it, or use admin.
// BUT, using client DB in API route (Node env) requires a specific setup or Admin SDK.
// To avoid "Module not found" or Auth errors with Admin SDK if not fully set up:
// I will return the full result to the Frontend, and the Frontend will trigger the "Save to Log" action.
// This is robust because the Frontend has the authenticated Client SDK already working perfectly.

export async function POST(req: Request) {
    try {
        const { websiteUrl } = await req.json();

        if (!websiteUrl) {
            return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }

        const apifyToken = process.env.APIFY_API_TOKEN;
        const actorId = "FqmFuleu24rvt7uuQ";

        if (!apifyToken) {
            console.error("Missing APIFY_API_TOKEN");
            return NextResponse.json({ error: "Missing Apify Token" }, { status: 500 });
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        const input = {
            "startUrls": [websiteUrl]
        };

        console.log(`Starting Apify Actor ${actorId} for ${websiteUrl}...`);
        const run = await client.actor(actorId).call(input);

        console.log(`Apify run finished: ${run.id}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Filter for Decision Makers
        console.log(`Found ${items.length} items. Mapping data...`);

        const candidates = items.map((item: any) => {
            // Field Discovery (Robust Mapping for various Actors)
            const url = item.linkedinLink || item["Linkedin Link"] || item.url || item.profileUrl || item.linkedinUrl || item.linkedInUrl || item.searchUrl;

            // Name Extraction (Fallback)
            let name = item.name || item.fullName || item.title || item.profileName;

            // If name is missing but we have a URL, try to extract it
            if (!name && url) {
                try {
                    const parts = url.split('/in/');
                    if (parts.length > 1) {
                        name = parts[1].split('/')[0].replace(/-/g, ' ');
                        name = name.replace(/\b\w/g, (c: string) => c.toUpperCase());
                    }
                } catch (e) { }
            }

            return {
                name: name || "Unknown Name",
                role: item.role || item.jobTitle || "Linked Profile",
                linkedinUrl: url || "",
                raw: item
            };
        });

        // Filter out empty results
        const validCandidates = candidates.filter((c: any) => c.linkedinUrl && c.linkedinUrl.length > 0);

        // Return ALL found profiles. The User will filter them in the Staging Area.
        // We do not want to hide a valid result just because the title didn't match "CEO".
        const finalResults = validCandidates;

        /* 
        // Logic Removed: Strict Role Filtering
        // It was causing false negatives (e.g. "Denturist" vs "CEO").
        */

        return NextResponse.json({
            candidates: finalResults,
            runId: run.id,
            meta: {
                totalFound: items.length,
                scannedUrl: websiteUrl
            }
        });

    } catch (error: any) {
        console.error('Head Hunter API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
