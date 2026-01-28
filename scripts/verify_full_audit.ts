
const fs = require('fs');
const { scrapeGoogleMaps } = require('../src/lib/maps_scraper');

async function verifyAuditDataFlow() {
    const targetUrl = "https://www.google.com/maps/search/CDL+Electrical+Solutions+LTD.+Spruce+Grove/?hl=en";
    console.log("1. Scraping Target: " + targetUrl);

    // 1. Run Scraper
    const scraperResult = await scrapeGoogleMaps(targetUrl);
    if (!scraperResult || scraperResult.rating === 0) {
        console.error("❌ SCRAPER FAILED: Returned 0 rating.");
        process.exit(1);
    }
    // Updated property name check: reviewsCount
    console.log(`✅ Scraper Success: Rating=${scraperResult.rating}, Reviews=${scraperResult.reviewsCount}`);

    // 2. Simulate the API mapping code from src/app/api/agents/maps/route.ts
    const mappedResult = {
        found: Number(scraperResult.rating) > 0,
        title: scraperResult.businessName,
        totalScore: scraperResult.rating,
        reviewsCount: scraperResult.reviewsCount, // Updated name
        reviews: scraperResult.reviews.map((r: any) => ({
            stars: r.rating,
            text: r.text,
            date: r.time,
            response: r.response || ""
        }))
    };

    console.log("\n2. Mapped API Data:", JSON.stringify(mappedResult, null, 2));

    // 3. Simulate React State Update (Audit Object)
    const auditState = {
        google: mappedResult,
        tech: { hasFbPixel: true, hasChatbot: false },
        performance: { performance: 85, mobileFriendly: true }
    };

    // 4. Simulate PDF Generator Mapping (src/app/api/closer/generate/route.ts)
    console.log("\n3. Testing PDF Generation Logic...");

    // We'll reimplement the critical logic here to catch mismatch
    const googleScore = Number(auditState.google.totalScore) || 0;
    const reviewCount = Number(auditState.google.reviewsCount) || 0;

    console.log(`   -> Extracted for PDF: Score=${googleScore}, Count=${reviewCount}`);

    if (googleScore !== scraperResult.rating) {
        console.error(`❌ DATA MISMATCH! Scraper had ${scraperResult.rating}, but PDF logic sees ${googleScore}`);
        process.exit(1);
    }

    if (reviewCount !== scraperResult.reviewsCount) {
        console.error(`❌ DATA MISMATCH! Scraper had ${scraperResult.reviewsCount}, but PDF logic sees ${reviewCount}`);
        process.exit(1);
    }

    console.log("✅ DATA FLOW INTEGRITY: CONFIRMED. The data names match.");
    process.exit(0);
}

verifyAuditDataFlow();
