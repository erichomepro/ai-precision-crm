import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auditWebsite, googleSearch } from '@/lib/seo_auditor';
import { checkPartnership } from '@/lib/logic_rules';
import * as fs from 'fs';
import * as path from 'path';
import { SMART_SCRAPER_PROMPT } from '@/lib/constants';
import { scrapeContactDetails } from '@/lib/social_scraper';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function debugLog(msg: string) {
    try {
        const logStr = `[${new Date().toISOString()}] ${msg}\n`;
        // Use synchronous append to ensure log capture before crash
        fs.appendFileSync(path.join(process.cwd(), 'smart_scraper.log'), logStr);
    } catch (e) {
        // console.error("Log failed", e);
    }
}

export async function POST(req: Request) {
    let businessName = "Unknown";
    let websiteUrl = "";

    try {
        const body = await req.json();
        businessName = body.businessName;
        websiteUrl = body.websiteUrl;

        debugLog(`Request received for: ${businessName} - ${websiteUrl}`);

        if (!websiteUrl) {
            return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }

        // Ensure URL has protocol
        if (!websiteUrl.startsWith('http')) {
            websiteUrl = `https://${websiteUrl}`;
        }

        debugLog(`Starting Auditor for: ${websiteUrl}`);

        // 1. RUN AUDITOR (Puppeteer)
        let auditResult;
        try {
            auditResult = await auditWebsite(websiteUrl);
            debugLog(`Audit Success. Title: ${auditResult.title}`);
        } catch (auditErr: any) {
            debugLog(`Audit Failed: ${auditErr.message}`);
            return NextResponse.json({ error: `Could not access website: ${auditErr.message}.` }, { status: 502 });
        }

        // 2. AI ANALYSIS (Using extracted text)
        let aiAnalysis = {
            summary: "AI Analysis Failed",
            keywords: [] as string[],
            opportunities: [] as string[]
        };

        const mainContent = auditResult.textContent || "";

        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5 && mainContent.length > 100) {
            try {
                debugLog(`Starting AI Analysis...`);
                // Model verified via scripts/list_gemini_models.js
                // MUST USE EXP MODEL
                // Model verified via scripts/list_gemini_models.js
                // MUST USE EXP MODEL
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

                // ... (inside function)

                const prompt = SMART_SCRAPER_PROMPT
                    .replace('{businessName}', businessName)
                    .replace('{websiteUrl}', websiteUrl)
                    .replace('{content}', mainContent.substring(0, 5000));

                // 60s Timeout for AI (Increased from 15s)
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI Timeout (60s limit reached)")), 60000));
                const aiPromise = model.generateContent(prompt);

                const result: any = await Promise.race([aiPromise, timeoutPromise]);
                const response = result.response;
                let text = response.text();
                // Clean JSON
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiAnalysis = JSON.parse(text);
                debugLog(`AI Success.`);

            } catch (aiError: any) {
                debugLog(`AI Failed: ${aiError.message}`);
                console.error(`[SmartScraper] AI Failed:`, aiError);
                aiAnalysis.summary = `AI Analysis Unavailable: ${aiError.message}`;
            }
        } else {
            const reason = !process.env.GEMINI_API_KEY ? "Missing API Key" : "Insufficient Content";
            debugLog(`Skipping AI: ${reason}. Key Length: ${process.env.GEMINI_API_KEY?.length || 0}`);
            console.log(`[SmartScraper] Skipping AI: ${reason}`);

            aiAnalysis.summary = "Configure GEMINI_API_KEY or ensure site has content to generate items.";
            aiAnalysis.keywords = ["Keyword 1", "Keyword 2"];
            aiAnalysis.opportunities = ["Add Content"];
        }

        debugLog(`Formatting Response...`);

        // 3. FORMAT RESPONSE
        const report = {
            aiSummary: aiAnalysis.summary, // REQUIRED by Frontend
            seo: {
                titleLength: auditResult.title?.length || 0,
                descriptionLength: auditResult.description?.length || 0,
                h1Count: auditResult.h1Count,
                mobileResponsive: auditResult.mobileFriendly,
                loadTime: `${(auditResult.loadTime / 1000).toFixed(2)}s`,
                globalScore: auditResult.globalScore,
                website: auditResult.url,
                secure: auditResult.secure,
                technicalSummary: auditResult.summary,
                techStack: auditResult.techStack || []
            },
            enrichment: {
                emails: [],
                phones: [],
                socials: {},
                address: "Not scanned"
            },
            businessLogic: {
                partnership: {
                    hasNovus: false,
                    status: "Unknown"
                },
                competitors: [] as string[],
                leaderboard: [] as any[],
                gbpRisk: "Unknown",
                reputation: {
                    rating: "0",
                    reviewCount: "0",
                    source: "Unknown"
                }
            },
            content: {
                words: mainContent.split(/\s+/).length,
                keywords: aiAnalysis.keywords || [],
                opportunities: aiAnalysis.opportunities || []
            }
        };



        // --- DATA-TO-DOLLAR LOGIC ---
        try {
            // 1. Contact & Social Enrichment
            let contactDetails;
            try {
                contactDetails = await scrapeContactDetails(websiteUrl, businessName);
            } catch (e) {
                console.log("Contact scrape failed", e);
                contactDetails = { emails: [], phones: [], socials: [], keyNames: [] };
            }

            report.enrichment.emails = contactDetails.emails || [];
            report.enrichment.phones = contactDetails.phones || [];
            report.enrichment.socials = contactDetails.socials || [];
            // Add identified owners to a new field if the frontend supports it, otherwise generic enrichment
            (report.enrichment as any).owners = contactDetails.keyNames || [];

            // MAP TO ROOT (For UI compatibility)
            if (contactDetails.keyNames.length > 0) {
                (report as any).ownerName = contactDetails.keyNames[0];
            }
            if (contactDetails.emails.length > 0) {
                (report as any).verifiedEmail = contactDetails.emails[0];
            }

            // 1b. Partnership Check (Content based)
            const partnership = checkPartnership(mainContent);
            report.businessLogic.partnership = partnership;

            // 2. City Extraction
            let cityGuess = "Edmonton";
            const contentLower = mainContent.toLowerCase();
            if (contentLower.includes("stony plain")) cityGuess = "Stony Plain";
            else if (contentLower.includes("spruce grove")) cityGuess = "Spruce Grove";
            else if (contentLower.includes("sherwood park")) cityGuess = "Sherwood Park";
            else if (contentLower.includes("st. albert")) cityGuess = "St. Albert";

            // 3. Local Leaderboard
            const leaderboardResults = await googleSearch(`Glass Repair ${cityGuess}`);
            report.businessLogic.leaderboard = leaderboardResults.slice(0, 3).map(r => ({
                name: r.title.split('|')[0].trim(),
                rating: (r.snippet.match(/[0-5]\.\d/) || ["4.5"])[0],
                reviews: (r.snippet.match(/(\d+) reviews/) || ["124 reviews"])[0]
            }));

            // 4. GBP Risk Check & Review Analysis
            const gbpResults = await googleSearch(`${businessName} ${cityGuess} reviews`);
            const gbpSnippet = gbpResults[0]?.snippet || "";

            // Extract Rating "4.8"
            const ratingMatch = gbpSnippet.match(/([0-5]\.\d)\s*(?:\/|star)/);
            const rating = ratingMatch ? ratingMatch[1] : "0";

            // Extract Count "120 reviews" or "(120)"
            const countMatch = gbpSnippet.match(/(\d+)\s*reviews/) || gbpSnippet.match(/\((\d+)\)/);
            const count = countMatch ? countMatch[1] : "0";

            report.businessLogic.reputation = {
                rating: rating,
                reviewCount: count,
                source: "Google"
            };

            if (parseFloat(rating) > 0) {
                report.businessLogic.gbpRisk = parseFloat(rating) < 4.0 ? "High (Bad Rating)" : "Low (Good Rating)";
            } else {
                report.businessLogic.gbpRisk = "High (Not clearly found)";
            }

            // 5. Booking Friction Check
            const riskyCompetitors = leaderboardResults.filter(c =>
                c.snippet.toLowerCase().includes("book") ||
                c.snippet.toLowerCase().includes("schedule") ||
                c.snippet.toLowerCase().includes("appointment")
            );

            if (riskyCompetitors.length > 0) {
                if (!contentLower.includes("book online") && !contentLower.includes("schedule")) {
                    report.businessLogic.competitors.push(`High Friction: ${riskyCompetitors[0].title.substring(0, 20)}... offers online booking.`);
                }
            }
        } catch (logicErr: any) {
            debugLog(`Logic Checks Failed (Non-Fatal): ${logicErr.message}`);
        }

        debugLog(`Sending Success Response.`);

        return NextResponse.json({
            success: true,
            data: report
        });

    } catch (error: any) {
        debugLog(`Critical Error: ${error.message}`);
        console.error('[SmartScraper] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
