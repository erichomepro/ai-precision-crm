import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export async function POST(req: Request) {
    try {
        const { websiteUrl } = await req.json();

        if (!websiteUrl) {
            return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }

        // FORCE HARDCODED TOKEN for stability (same as other agents)
        const apifyToken = process.env.APIFY_API_TOKEN;

        // "SEO Checker" by louisdeconinck
        const actorId = "louisdeconinck/seo-checker";

        if (!apifyToken) {
            console.error("Missing APIFY_API_TOKEN");
            return NextResponse.json({ error: "Missing Apify Token" }, { status: 500 });
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        console.log(`Starting SEO Audit for ${websiteUrl} using ${actorId}...`);

        // Ensure URL has protocol
        let targetUrl = websiteUrl.trim();
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }

        // Input for louisdeconinck/seo-checker (startUrls is array)
        const input = {
            "startUrls": [{ "url": targetUrl }],
            "maxDepth": 1,
            "maxPagesPerCrawl": 1
        };

        const run = await client.actor(actorId).call(input);

        console.log(`SEO Audit run finished: ${run.id}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length === 0) {
            return NextResponse.json({ error: "No SEO data found. The site might be blocking bots." }, { status: 404 });
        }

        const rawData = items[0];

        // Check for error in data
        // @ts-ignore
        if (rawData.errorMessage || rawData.isLoaded === false) {
            // @ts-ignore
            return NextResponse.json({ error: rawData.errorMessage || "SEO Audit failed to load page" }, { status: 502 });
        }

        // MAP louisdeconinck/seo-checker output (FLAT SCHEMA)
        const mappedData = {
            titleLength: (rawData as any).titleLength || 0,
            descriptionLength: (rawData as any).descriptionLength || 0,
            mobileResponsive: (rawData as any).mobileResponsive !== undefined ? (rawData as any).mobileResponsive : false,
            h1Count: (rawData as any).h1Count || 0,
            loadTime: (rawData as any).loadTime || "N/A",
            titleDuplicateWords: (rawData as any).titleDuplicateWords || 0,
            timestamp: new Date().toISOString(),
            raw: rawData // Keep full raw data for debug/display
        };

        return NextResponse.json({
            success: true,
            data: mappedData
        });

    } catch (error: any) {
        console.error('SEO Agent Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
