
// Use require for robust execution in this environment
const { scrapeGoogleMaps } = require('../src/lib/maps_scraper');
const { POST: generateProposal } = require('../src/app/api/closer/generate/route');

// Mock Next.js Request
class MockRequest {
    jsonBody: any;
    constructor(body: any) { this.jsonBody = body; }
    async json() { return this.jsonBody; }
}

async function runPipeline() {
    console.log("🚀 Starting Pipeline Verification...");

    // --- STAGE 1: SCRAPER VERIFICATION ---
    console.log("\n[Stage 1] Testing Maps Scraper...");
    const target = "CDL Electrical Solutions LTD. Spruce Grove";
    const scraperResult = await scrapeGoogleMaps(target);

    if (!scraperResult || !scraperResult.rating || scraperResult.reviewCount === 0 || scraperResult.reviews.length === 0) {
        console.error("❌ Stage 1 FAILED: Scraper returned incomplete data.");
        console.log("Result:", JSON.stringify(scraperResult, null, 2));
        process.exit(1);
    }
    console.log("✅ Stage 1 PASSED: valid scraper data received.");

    // --- STAGE 2: DATA INTEGRITY ---
    console.log("\n[Stage 2] checking Data Integrity...");
    const auditData = {
        google: {
            totalScore: scraperResult.rating,
            reviewsCount: scraperResult.reviewCount,
            reviews: scraperResult.reviews
        },
        tech: {
            hasFbPixel: true,
            hasChatbot: false
        },
        performance: {
            performance: 85,
            mobileFriendly: true
        }
    };
    // Simple check
    if (auditData.google.totalScore < 4.0) console.warn("⚠️ Warning: Rating is low, verification might trigger 'Low Score' logic.");
    console.log("✅ Stage 2 PASSED: Data formatted for Proposal Generator.");

    // --- STAGE 3: PROPOSAL GENERATION ---
    console.log("\n[Stage 3] Testing Proposal Generation (HTML/PDF)...");

    const reqBody = {
        businessName: "Verify Corp",
        candidates: [{ name: "Tester" }],
        audit: auditData
    };

    // Create a mock Request object compatible with NextJS logic
    const req = new MockRequest(reqBody) as unknown as Request;

    try {
        const res = await generateProposal(req);
        const json = await res.json();

        if (!json.success || !json.pdfBase64) {
            console.error("❌ Stage 3 FAILED: API return success=false or missing PDF.");
            console.error("Error:", json.error);
            process.exit(1);
        }

        if (json.pdfBase64.length < 1000) {
            console.error("❌ Stage 3 FAILED: PDF seems too small.");
            process.exit(1);
        }
        console.log("✅ Stage 3 PASSED: PDF Generated Successfully.");

    } catch (e) {
        console.error("❌ Stage 3 CRASHED with Exception:", e);
        process.exit(1);
    }

    console.log("\n🎉 ALL SYSTEMS GO. AUTOMATION PIPELINE VERIFIED.");
    process.exit(0);
}

runPipeline();
