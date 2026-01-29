
import { scrapeGoogleMaps } from '../src/lib/maps_scraper';
import * as fs from 'fs';

// Mock the Tech & Doctor Agents (since they are separate APIs, we'll just use their logic or mock the return)
// We want to verify the MAPS data flow specifically for the PDF.

async function testPdfDataFlow() {
    console.log("🚀 Starting PDF Data Flow Test...");
    const businessName = "Joe's Pizza New York"; // Known good target

    // 1. Scrape Maps (The new local scraper)
    console.log(`\n🔍 Scraping Maps for: ${businessName}`);
    const mapsData = await scrapeGoogleMaps(businessName);

    if (!mapsData) {
        console.error("❌ Maps Scraper failed to return data.");
        return;
    }

    console.log("✅ Maps Data Received:");
    console.log(`- Name: ${mapsData.businessName}`);
    console.log(`- Rating: ${mapsData.rating}`);
    console.log(`- Count: ${mapsData.reviewsCount}`);
    console.log(`- Reviews Found: ${mapsData.reviews.length}`);

    // 2. Simulate API Transformation (as done in maps/route.ts)
    const mappedMapsResult = {
        found: Number(mapsData.rating) > 0,
        title: mapsData.businessName,
        address: mapsData.address || "Unknown",
        totalScore: mapsData.rating,
        reviewsCount: mapsData.reviewsCount,
        category: "Business", // Placeholder
        categories: [],
        reviews: mapsData.reviews.map((r: any) => ({
            stars: r.rating,
            text: r.text,
            date: r.time,
            response: ""
        })),
        posts: []
    };

    // 3. Simulate Client & Audit Data Construction (as done in closer/page.tsx logic)
    // We mock Tech & Doctor data to simulate a full audit
    const mockAuditData = {
        google: mappedMapsResult,
        tech: { hasFbPixel: false, hasChatbot: false }, // Mock
        performance: { performance: 45, seo: 80 } // Mock
    };

    // 4. Validate Data against PDF Requirements
    console.log("\n📊 Validating Data for PDF Report:");

    // Check 1: Google Rating
    if (mockAuditData.google?.totalScore > 0) console.log("✅ Google Rating: PASS");
    else console.error("❌ Google Rating: MISSING (0)");

    // Check 2: Review Count
    if (mockAuditData.google?.reviewsCount > 0) console.log("✅ Review Count: PASS");
    else console.error("❌ Review Count: MISSING (0)");

    // Check 3: Reviews
    if (mockAuditData.google.reviews.length > 0) console.log(`✅ Reviews: PASS (${mockAuditData.google.reviews.length} found)`);
    else console.warn("⚠️ Reviews: EMPTY (PDF will show 'No text reviews found')");

    // Check 4: Review Response
    // PDF Logic: r.response ? 'Replied' : 'MISSED'
    const hasResponse = mockAuditData.google.reviews.some(r => r.response);
    if (!hasResponse) console.warn("⚠️ Review Responses: NONE detected (PDF will show 'MISSED' for all)");

    // Check 5: Posts
    // PDF Logic: posts.length > 0 ? date : "No Recent Posts"
    if (mockAuditData.google.posts.length === 0) console.warn("⚠️ Google Posts: NONE detected (PDF will show 'No Recent Posts' & 'Inactive')");

    // Check 6: Categories
    // PDF Logic: categories.map(...)
    if (mockAuditData.google.categories.length === 0) console.warn("⚠️ Categories: NONE detected (PDF will show 'Unknown')");

    console.log("\n--- TEST COMPLETE ---");
}

testPdfDataFlow();
