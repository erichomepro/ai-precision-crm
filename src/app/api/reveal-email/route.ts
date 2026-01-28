import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export async function POST(req: Request) {
    try {
        // FORCE HARDCODED TOKEN for stability
        const apifyToken = process.env.APIFY_API_TOKEN;
        const actorId = "overpowered/email-finder"; // Domain-based Email Finder

        if (!apifyToken) {
            console.error("Missing APIFY_API_TOKEN");
            return NextResponse.json({ error: "Missing Apify Token" }, { status: 500 });
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        // Check if we have Name + Domain input
        const { firstName, lastName, domain, linkedinUrl } = await req.json();

        let input = {};

        if (firstName && lastName && domain) {
            console.log(`Starting Domain Search for ${firstName} ${lastName} @ ${domain}`);
            input = {
                "first_name": firstName,
                "last_name": lastName,
                "domain": domain
            };
        } else if (linkedinUrl) {
            // Fallback to previous method if only LinkedIn URL provided (though we prefer Domain now)
            console.log(`Fallback: using LinkedIn URL ${linkedinUrl}`);
            return NextResponse.json({ error: "Please provide Name and Domain for best results" }, { status: 400 });
        } else {
            return NextResponse.json({ error: "Missing required fields (firstName, lastName, domain)" }, { status: 400 });
        }

        console.log(`Starting Email Finder Actor ${actorId}...`);
        const run = await client.actor(actorId).call(input);

        console.log(`Email run finished: ${run.id}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`Email items found: ${items.length}`);
        if (items.length > 0) {
            console.log('DEBUG: Email Item:', JSON.stringify(items[0], null, 2));
        }

        if (items.length === 0) {
            return NextResponse.json({ error: "No email data found" }, { status: 404 });
        }

        const data = items[0];

        // This actor typically returns { email: "...", score: ... }
        const email = data.email || null;
        const phone = null; // This actor focuses on Email

        return NextResponse.json({
            email: email,
            phone: phone,
            raw: data
        });

    } catch (error: any) {
        console.error('Contact API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
