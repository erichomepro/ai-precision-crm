import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export async function POST(req: Request) {
    try {
        const { linkedinUrl } = await req.json();

        if (!linkedinUrl) {
            return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
        }

        // FORCE HARDCODED TOKEN for stability (Script proved it works)
        const apifyToken = process.env.APIFY_API_TOKEN;
        const actorId = "LpVuK3Zozwuipa5bp"; // "Profile details no email" actor

        if (!apifyToken) {
            console.error("Missing APIFY_API_TOKEN");
            return NextResponse.json({ error: "Missing Apify Token" }, { status: 500 });
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        const input = {
            "profileScraperMode": "Profile details no email ($4 per 1k)",
            "queries": [linkedinUrl]
        };

        console.log(`Starting Enrichment Actor ${actorId} for ${linkedinUrl}...`);
        console.log(`DEBUG: Token prefix: ${apifyToken.substring(0, 4)}...`);

        const run = await client.actor(actorId).call(input);
        console.log(`Enrichment run finished: ${run.id}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log('DEBUG: Enrichment Items:', JSON.stringify(items, null, 2));

        if (items.length === 0) {
            return NextResponse.json({ error: "No profile data found" }, { status: 404 });
        }

        // Map relevant fields as requested
        const profile: any = items[0];
        const enrichedData = {
            firstName: profile.firstName,
            lastName: profile.lastName,
            headline: profile.headline,
            summary: profile.summary || profile.about,
            city: profile.location?.parsed?.city || profile.location?.city || profile.city,
            countryCode: profile.location?.parsed?.countryCode || profile.location?.countryCode || profile.countryCode,
            // Try to find current position
            company: profile.currentPosition?.[0]?.companyName || profile.jobTitle ? profile.companyName : (profile.positions?.[0]?.companyName),
            title: profile.currentPosition?.[0]?.title || profile.jobTitle || (profile.positions?.[0]?.title),

            // Marketing & Sales Intelligence
            profilePic: profile.profilePicture?.url || profile.photo || null,
            skills: profile.skills?.map((s: any) => s.name).slice(0, 5) || [], // Top 5 skills
            connections: profile.connectionsCount || 0,
            education: profile.education?.map((e: any) => e.schoolName).slice(0, 1) || [], // Top school

            raw: profile
        };

        return NextResponse.json({ profile: enrichedData });

    } catch (error: any) {
        console.error('Enrichment API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
