import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export async function POST(req: Request) {
    try {
        const { websiteUrl } = await req.json();

        if (!websiteUrl) {
            return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }

        const apifyToken = process.env.APIFY_API_TOKEN;
        // "Google PageSpeed Insights" or "Lighthouse" actor
        const actorId = "exquis/lighthouse-audit";

        if (!apifyToken) {
            return NextResponse.json({ error: "Missing Apify Token" }, { status: 500 });
        }

        const client = new ApifyClient({ token: apifyToken });

        console.log(`🩺 The Doctor: Checking health of ${websiteUrl}...`);

        const input = {
            "startUrls": [{ "url": websiteUrl }],
            "maxRequestsPerCrawl": 1,
            "onlyAudits": true // Get the scores!
        };

        const run = await client.actor(actorId).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length === 0) {
            return NextResponse.json({ error: "Lighthouse audit failed." }, { status: 500 });
        }

        const audit: any = items[0];

        // Map Critical Stats
        const report = {
            performance: audit.categories?.performance?.score * 100 || 0,
            accessibility: audit.categories?.accessibility?.score * 100 || 0,
            seo: audit.categories?.seo?.score * 100 || 0,
            bestPractices: audit.categories?.['best-practices']?.score * 100 || 0,

            // Core Web Vitals (The stuff that matters for ranking)
            lcp: audit.audits?.['largest-contentful-paint']?.displayValue, // Speed
            cls: audit.audits?.['cumulative-layout-shift']?.displayValue, // Stability
            mobileFriendly: audit.audits?.['viewport']?.score === 1,

            screenshot: audit.screenshot || null
        };

        return NextResponse.json(report);

    } catch (error: any) {
        console.error('The Doctor Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
