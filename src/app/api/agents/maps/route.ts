import { NextResponse } from 'next/server';
import { scrapeGoogleMaps } from '../../../../lib/maps_scraper';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { businessName, city, directUrl } = await req.json();

        let searchTerm = businessName;
        if (city) searchTerm += ` ${city}`;

        // PRIORITIZE DIRECT URL
        // If the user supplied a direct link (e.g. from the CRM override), use it directly.
        // scrapeGoogleMaps handles standard URLs by navigating to them if they look like URLs.
        if (directUrl && directUrl.startsWith('http')) {
            searchTerm = directUrl;
            console.log(`📍 Using Direct URL override: ${searchTerm}`);
        }

        console.log(`📍 Maps Agent: Scraping for "${searchTerm}"...`);

        const data = await scrapeGoogleMaps(searchTerm);

        console.log("✅ Scrape Complete:", data);

        if (!data) {
            return NextResponse.json({ found: false, totalScore: 0, reviewCount: 0, reviews: [] }, { status: 200 });
        }

        // Map to format expected by the frontend/PDF generator (preserving existing schema)
        const mappedResult = {
            found: Number(data.rating) > 0,
            title: data.businessName,
            address: data.address || "Unknown",
            website: "", // Scraper currently doesn't fetch website from GMB
            totalScore: data.rating,
            reviewsCount: data.reviewsCount, // Corrected property name
            category: "Business", // Placeholder
            categories: [],
            isClaimed: false, // Placeholder
            reviews: data.reviews.map(r => ({
                stars: r.rating,
                text: r.text,
                date: r.time,
                response: r.response || "" // Pass through the scraped response
            })),
            posts: [] // Scraper doesn't fetch posts yet
        };

        return new NextResponse(JSON.stringify(mappedResult), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Maps Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

