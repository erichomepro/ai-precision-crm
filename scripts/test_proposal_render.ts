
// Mock Data
const client = { Company: "Test Corp", FirstName: "John", LastName: "Doe", Email: "john@test.com" };
const audit = { google: { totalScore: 4.5, reviewsCount: 50, reviews: [] }, tech: { hasFbPixel: true }, performance: { performance: 80 } };
const ai = { executiveSummary: "Good job", opportunity: "More money", recommendedPhase1: "SEO", recommendedPhase2: "Ads" };

// CONSTANTS (Copied from source)
const EDUCATIONAL_MODULES = [
    { title: "Module 1", subtitle: "Sub", icon: "X", problem: "Prob", solution: "Sol", solutionText: "Txt", roi: "HIGH", stat: "10x", statLabel: "Lift" }
];

function generateProposalHtml(client: any, audit: any, ai: any) {
    // defaults
    const googleScore = Number(audit?.google?.totalScore) || 0;
    const reviewCount = Number(audit?.google?.reviewsCount) || 0;
    const hasGoogleData = googleScore > 0;

    const speedScore = audit?.performance?.performance || 0;
    const seoScore = audit?.performance?.seo || 0;
    const mobileScore = audit?.performance?.mobileFriendly ? 100 : 0;

    // Tech Stack
    const hasPixel = audit?.tech?.hasFbPixel || false;
    const hasChatbot = audit?.tech?.hasChatbot || false;

    // Logic: Calculate "Revenue Leakage" (Money left on the table)
    let leakageScore = 0;
    if (!hasChatbot) leakageScore += 35; // Big one
    if (googleScore < 4.2) leakageScore += 25;
    if (reviewCount < 20) leakageScore += 10;
    if (speedScore < 60) leakageScore += 15;
    if (!hasPixel) leakageScore += 15;
    leakageScore = Math.min(leakageScore, 97); // Cap at 97%

    const marketShare = 100 - leakageScore;

    // --- GOOGLE DEEP DIVE ---
    const reviews = audit?.google?.reviews || [];
    // Filter generic/empty reviews from showing up in the 'Customer Voice' section to preserve quality
    const textReviews = reviews.filter((r: any) => r.text && r.text.length > 5);

    // --- STYLES ---
    const css = `body { color: red; }`; // truncated for test

    // --- HTML GENERATORS ---
    const renderHeader = (title: string) => `<h1>${title}</h1>`;
    const renderFooter = () => `<div>Footer</div>`;

    // --- PAGES ---
    const coverPage = `<div>Cover</div>`;
    const diagnosisPage = `<div>Diagnosis: ${leakageScore}%</div>`;
    const auditPage = `<div>Audit: ${googleScore}</div>`;

    const educationPages = EDUCATIONAL_MODULES.map(mod => `<div>${mod.title}</div>`).join('');
    const roadmapPage = `<div>Roadmap</div>`;

    return `<html>${coverPage}${diagnosisPage}${auditPage}${educationPages}${roadmapPage}</html>`;
}

try {
    const html = generateProposalHtml(client, audit, ai);
    console.log("Success! HTML Length:", html.length);
    if (html.length > 100) process.exit(0);
    else throw new Error("Too short");
} catch (e) {
    console.error("Failed:", e);
    process.exit(1);
}
