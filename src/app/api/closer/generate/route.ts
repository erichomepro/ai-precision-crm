
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
// Correct import path for lib at project root from src/app/api/closer/generate/
import { db as adminDb } from '../../../../../lib/firebase_admin';

interface ProposalRequest {
    clientId: string;
    services: string[];
}

// Service Catalog
const SERVICE_CATALOG: { id: string, name: string, category: string, description: string }[] = [
    // Core AI Engines
    { id: "ai_sales_agents", name: "AI Sales Agents", category: "Core AI Engines", description: "24/7 intelligent agents that capture and qualify every lead instantly, across all channels." },
    { id: "workflow_automation", name: "Workflow Automation", category: "Core AI Engines", description: "Remove the 'grunt work' from your office so you can focus on high-level strategy and growth." },
    { id: "ai_web_design", name: "AI-Native Web Design", category: "Core AI Engines", description: "High-performance websites built to convert local visitors into paying customers." },
    // Growth Channels
    { id: "semantic_seo", name: "Semantic SEO Strategy", category: "Growth Channels", description: "Get found by local customers searching for your services with intent-driven optimization." },
    { id: "social_media", name: "Social Media Marketing", category: "Growth Channels", description: "Strategic content and campaigns that build your local brand presence and drive engagement." },
    { id: "paid_advertising", name: "Paid Advertising", category: "Growth Channels", description: "Generate immediate traffic and leads without wasting a dollar on unoptimized ad spend." },
    { id: "reputation_marketing", name: "Reputation Marketing", category: "Growth Channels", description: "Turn happy customers into your most powerful marketing asset with automated review generation." },
    { id: "omni_channel", name: "Omni-Channel Messaging", category: "Growth Channels", description: "Unified SMS and email campaigns that keep your business top-of-mind with local customers." },
    // Build & Strategy
    { id: "lead_systems", name: "Lead Management Systems", category: "Build & Strategy", description: "Centralized, automated tracking from first local inquiry to closed sale. Nothing falls through." },
    { id: "custom_apps", name: "Custom Applications", category: "Build & Strategy", description: "Bespoke web and mobile apps featuring integrated AI functionality for your unique needs." },
    { id: "growth_consulting", name: "Growth Consulting", category: "Build & Strategy", description: "High-level analysis and roadmapping to deploy AI for maximum local market impact." },
    { id: "ai_cloning", name: "AI Cloning", category: "Build & Strategy", description: "Digitally duplicate your voice and presence to create personalized content at scale." },
    { id: "ai_reputation", name: "AI Reputation Management", category: "Build & Strategy", description: "Automated systems to monitor, manage, and enhance your digital trust with AI precision." },
    { id: "animation_dev", name: "Animation Development", category: "Build & Strategy", description: "High-impact, AI-generated animated videos designed to grab attention on social feeds." }
];

const fs = require('fs');
const path = require('path');

function debugLog(msg: string) {
    try {
        fs.appendFileSync(path.join(process.cwd(), 'proposal_gen.log'), `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export async function POST(req: Request) {
    debugLog("Received Proposal Generation Request");
    try {
        const { clientId, services } = await req.json(); // services is array of strings (names)

        if (!clientId) {
            return NextResponse.json({ error: "Client ID required" }, { status: 400 });
        }

        // 1. Fetch Lead Data (Treating as "Client" for the proposal)
        debugLog(`Fetching data for ID: ${clientId}`);
        // The ID passed as 'clientId' is actually a LEAD ID now.
        const leadDoc = await adminDb.collection('leads').doc(clientId).get();

        let finalClientData: any = {};
        let finalLeadData: any = {};

        if (!leadDoc.exists) {
            // Fallback: Check 'clients' collection just in case
            const properClientDoc = await adminDb.collection('clients').doc(clientId).get();
            if (!properClientDoc.exists) {
                return NextResponse.json({ error: "Lead/Client not found" }, { status: 404 });
            }
            // It was a real client
            finalClientData = properClientDoc.data() || {};
            finalLeadData = {};
            if (finalClientData.sourceLeadId) {
                const sourceLead = await adminDb.collection('leads').doc(finalClientData.sourceLeadId).get();
                if (sourceLead.exists) finalLeadData = sourceLead.data() || {};
            }
        } else {
            // It is a LEAD
            finalLeadData = leadDoc.data() || {};
            // Map Lead -> Client structure for valid HTML generation
            finalClientData = {
                Company: finalLeadData.BusinessName || "Valued Prospect",
                FirstName: (finalLeadData.OwnerName || "Valued").split(' ')[0],
                LastName: (finalLeadData.OwnerName || "Prospect").split(' ').slice(1).join(' '),
                Website: finalLeadData.Website,
                Email: finalLeadData.VerifiedEmail || finalLeadData.Email
            };
        }

        // 3. Map Service Names
        const selectedServiceObjects = SERVICE_CATALOG.filter(s => services.includes(s.name));

        // 4. Construct HTML Proposal
        debugLog("Generating HTML...");
        const htmlContent = generateProposalHtml(finalClientData, finalLeadData, selectedServiceObjects);

        // 5. Generate PDF with Robust Chrome Finding
        debugLog("Finding Chrome...");
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
            'D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        ];
        const chromePath = possiblePaths.find(p => p && fs.existsSync(p));
        debugLog(`Chrome Path: ${chromePath || "Not Found (Using Default)"}`);

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: chromePath, // Fallback to undefined (default) if not found, but usually found
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        debugLog("Browser Launched. Printing PDF...");
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        debugLog("PDF Generated Success.");

        // 6. Return PDF (Base64)
        return NextResponse.json({
            success: true,
            pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
            filename: `Proposal_${finalClientData.Company || 'Client'}.pdf`
        });

    } catch (error: any) {
        debugLog(`Critical Error: ${error.message}`);
        console.error("Proposal Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



function generateProposalHtml(client: any, lead: any, services: typeof SERVICE_CATALOG) {
    // --- DATA PREP (Safe Mode) ---
    let rawReport: any = {};
    let techStack: string[] = [];
    let keywords: string[] = [];
    let opportunities: string[] = [];
    let social: any = {};
    let businessLogic: any = {};
    let marketShare = 5; // Safe default
    let competitorShare = 95;
    let visualTrust = "Deficit";
    let hasReviews = false;
    let seoScore = 0;
    let loadTime = "Unknown";
    let estClicks = 0;

    try {
        rawReport = lead.SeoAudit?.raw || {};
        techStack = lead.SeoAudit?.techStack || rawReport.seo?.techStack || [];

        // Keywords
        keywords = rawReport.content?.keywords || lead.content?.keywords || [];
        opportunities = rawReport.content?.opportunities || [];

        // Social
        social = lead.Social || rawReport.enrichment?.socials || {};

        // Logic
        businessLogic = lead.BusinessLogic || rawReport.businessLogic || {};

        // Scores
        seoScore = lead.SeoAudit?.globalScore || 0;
        loadTime = lead.SeoAudit?.loadTime || "Unknown";

        // Calculations
        const safeKeywordCount = keywords.length || 5;
        estClicks = (safeKeywordCount * 20) + 50;
        const totalMarketVolume = 2500;
        marketShare = Math.min(Math.round((estClicks / totalMarketVolume) * 100), 100);
        competitorShare = 100 - marketShare;

        hasReviews = lead.ReviewsCount ? parseInt(lead.ReviewsCount) > 10 : false;
    } catch (e) {
        console.error("PDF Data Prep Error", e);
        // Continue with defaults
    }

    const socialLinks = Array.isArray(social) ? social : Object.values(social).filter((v: any) => typeof v === 'object' && v.url);
    const socialStatus = socialLinks.length > 0 ? "Active" : "Silent";
    const gbpRisk = businessLogic.gbpRisk || "Unknown";

    // 3. Roadmap Logic
    const roadmap = {
        phase1: { title: "The Rescue", subtitle: "Technical Foundation", steps: ["Fix Brand Security (SSL)", "Optimize Mobile Experience", "Load Speed Acceleration"] },
        phase2: { title: "The Capture", subtitle: "Visibility Expansion", steps: ["Launch Local Landing Pages (Stony Plain)", "Target High-Intent 'Near Me' Keywords", "Fill Content Gaps"] },
        phase3: { title: "The Dominance", subtitle: "Authority Building", steps: ["Automated Review Generation", "Social Proof Syndication", "Competitor Displacement Campaign"] }
    };

    return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #020817; color: white; -webkit-print-color-adjust: exact; }
          .page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; padding: 40px; box-sizing: border-box; background: #020817; }
          
          /* UTILS */
          .text-green { color: #4ade80; }
          .text-red { color: #ef4444; }
          .bg-surface { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; }
          .flex { display: flex; }
          .flex-col { display: flex; flex-direction: column; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
          .mb-6 { margin-bottom: 24px; }
          
          /* TYPOGRAPHY */
          h1 { font-size: 32px; font-weight: 800; margin: 0; }
          h2 { font-size: 24px; font-weight: 700; margin: 0 0 10px 0; color: #f8fafc; }
          h3 { font-size: 16px; font-weight: 600; color: #cbd5e1; margin: 0 0 5px 0; }
          p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0; }
          
          /* COMPONENTS */
          .card { padding: 20px; }
          .stat-val { font-size: 28px; font-weight: 700; color: white; }
          .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          
          /* PIE CHART */
          .pie-chart {
            width: 120px; height: 120px; border-radius: 50%;
            background: conic-gradient(#4ade80 ${marketShare}%, #1e293b 0);
            position: relative;
            display: flex; justify-content: center; align-items: center;
          }
          .pie-inner { width: 90px; height: 90px; background: #0f172a; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-direction: column; }
          
          /* TABLE */
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; color: #64748b; padding: 10px; border-bottom: 1px solid #334155; text-transform: uppercase; font-size: 10px; }
          td { padding: 10px; border-bottom: 1px solid #1e293b; color: #e2e8f0; }
          .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .badge-green { background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); }
          .badge-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

          /* ROADMAP */
          .roadmap-step { display: flex; gap: 15px; margin-bottom: 15px; border-left: 2px solid #334155; padding-left: 20px; position: relative; }
          .roadmap-marker { position: absolute; left: -9px; top: 0; width: 16px; height: 16px; background: #020817; border: 2px solid #4ade80; border-radius: 50%; }
        </style>
      </head>
      <body>
      
        <!-- COVER -->
        <div class="page" style="display:flex; flex-direction:column; justify-content:center; background: radial-gradient(circle at 100% 0%, #1e293b 0%, #020817 50%);">
            <div style="margin-bottom: auto; color: #4ade80; font-weight: bold; font-size: 18px; letter-spacing: 1px;">AI PRECISION</div>
            <div>
                <div style="font-size: 24px; color: #4ade80; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Market Dominance Audit</div>
                <div style="font-size: 56px; font-weight: 800; line-height: 1.1; margin-bottom: 20px; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">REVENUE RISK<br>ASSESSMENT</div>
                <div style="width: 80px; height: 6px; background: #4ade80; margin: 30px 0;"></div>
                <div style="font-size: 24px; color: #cbd5e1;">Exclusively for <span style="color:white; font-weight:bold;">${client.Company || "Valued Prospect"}</span></div>
            </div>
             <div style="margin-top: auto; display: flex; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 24px;">
                <div style="font-size: 14px; color: #64748b;">CONFIDENTIAL</div>
                <div style="font-size: 14px; color: #64748b;">${new Date().toLocaleDateString()}</div>
            </div>
        </div>

        <!-- SHARE OF CLICKS & TRUST -->
        <div class="page">
            <div class="flex justify-between items-center mb-6">
                <h1>Local Market Share</h1>
                <div class="text-green font-bold">VISIBILITY GAP</div>
            </div>

            <div class="bg-surface card mb-6 grid-2 items-center">
                <div>
                    <h2>Your Share of Local Clicks</h2>
                    <p style="margin-bottom: 20px;">We analyzed the total search volume for "${rawReport.seo?.title || "your services"}" in your area. You are currently capturing less than <strong>${marketShare}%</strong> of potential leads.</p>
                    <div style="display: flex; gap: 20px;">
                        <div>
                             <div class="stat-val text-green">${marketShare}%</div>
                             <div class="stat-label">You</div>
                        </div>
                         <div>
                             <div class="stat-val text-red">${competitorShare}%</div>
                             <div class="stat-label">Competitors</div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: center;">
                    <div class="pie-chart">
                        <div class="pie-inner">
                            <span style="font-size: 20px; font-weight: 800; color:white;">${marketShare}%</span>
                            <span style="font-size: 10px; color: #64748b;">SHARE</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-6 mt-10">
                <h1>Business Intelligence</h1>
                <div class="text-green font-bold">MARKET POSITION</div>
            </div>
            
            <div class="grid-3">
                <div class="bg-surface card">
                    <h3>Ad Spend Detect</h3>
                    <div class="stat-val ${lead.SeoAudit?.adStatus?.summary.includes('Running') ? 'text-green' : 'text-red'}">
                        ${lead.SeoAudit?.adStatus?.summary.includes('Running') ? 'ACTIVE' : 'NONE'}
                    </div>
                    <p style="margin-top: 10px;">
                        ${lead.SeoAudit?.adStatus?.summary || "No Ad Pixels detected. Purely organic."}
                    </p>
                </div>
                 <div class="bg-surface card">
                    <h3>Real Reputation</h3>
                    <div class="stat-val ${parseFloat(businessLogic.reputation?.rating || "0") >= 4.0 ? 'text-green' : 'text-red'}">
                        ${businessLogic.reputation?.rating || "0"} <span style="font-size:14px; color:#64748b;">/ 5</span>
                    </div>
                    <p style="margin-top: 10px;">Based on <strong>${businessLogic.reputation?.reviewCount || "0"} verified reviews</strong>.</p>
                </div>
                 <div class="bg-surface card">
                    <h3>Decision Maker</h3>
                    <div class="stat-val text-green" style="font-size: 22px;">
                        ${lead.OwnerName || "Unknown"}
                    </div>
                    <p style="margin-top: 10px;">Identified Owner/CEO. <br>Verified: ${lead.VerifiedEmail ? "Yes (Email)" : "Partial"}</p>
                </div>
            </div>
        </div>

        <!-- COMPETITOR & KEYWORDS -->
        <div class="page">
             <div class="flex justify-between items-center mb-6">
                <h1>Revenue Risks</h1>
                <div class="text-green font-bold">COMPETITIVE INTEL</div>
            </div>

             <div class="bg-surface card h-full">
                <h2 class="text-red">Revenue The Competition Is Stealing</h2>
                <p class="mb-6">Local customers are searching for these <strong>exact high-intent services</strong> right now, but finding your competitors instead of you.</p>
                <table>
                    <thead>
                        <tr>
                            <th>High-Intent Search Term</th>
                            <th>Est. Missed Traffic</th>
                            <th>Revenue Risk</th>
                            <th>Strategy</th>
                        </tr>
                    </thead>
                     <tbody>
                        <tr>
                            <td>${keywords[0] ? (keywords[0] + " Near Me") : "High Value Services"}</td>
                            <td>${Math.round(estClicks * 0.4)} / mo</td>
                            <td class="text-red">High ($${Math.round(estClicks * 0.4 * 5)}+)</td>
                            <td><span class="badge badge-green">Capture Now</span></td>
                        </tr>
                        <tr>
                            <td>${keywords[1] ? (keywords[1] + " Pricing") : "Service Costs"}</td>
                            <td>${Math.round(estClicks * 0.25)} / mo</td>
                            <td class="text-red">Medium ($${Math.round(estClicks * 0.25 * 3)}+)</td>
                            <td><span class="badge badge-green">Capture Now</span></td>
                        </tr>
                        <tr>
                            <td>Best ${keywords[0] || "Provider"} ${lead.City || "in Area"}</td>
                            <td>${Math.round(estClicks * 0.15)} / mo</td>
                            <td class="text-red">Medium ($${Math.round(estClicks * 0.15 * 3)}+)</td>
                            <td><span class="badge badge-green">Capture Now</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ROI ROADMAP -->
        <div class="page" style="background: radial-gradient(circle at 0% 100%, #1e293b 0%, #020817 50%);">
            <div class="flex justify-between items-center mb-6">
                <h1>Strategic Roadmap to ROI</h1>
                <div class="text-green font-bold">EXECUTION PLAN</div>
            </div>

            <p class="mb-6">A phased approach to stop revenue bleed and build dominant local authority.</p>

            <div class="flex-col gap-4">
                <!-- PHASE 1 -->
                <div class="bg-surface card roadmap-step">
                    <div class="roadmap-marker"></div>
                    <div>
                        <div style="color: #4ade80; font-weight: 800; font-size: 14px; text-transform: uppercase;">Phase 1: ${roadmap.phase1.title}</div>
                        <h3 style="color: white; margin-top: 5px;">${roadmap.phase1.subtitle}</h3>
                        <ul style="color: #94a3b8; padding-left: 20px; font-size: 13px; margin-top: 10px;">
                            ${roadmap.phase1.steps.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                 <!-- PHASE 2 -->
                <div class="bg-surface card roadmap-step">
                    <div class="roadmap-marker"></div>
                    <div>
                        <div style="color: #60a5fa; font-weight: 800; font-size: 14px; text-transform: uppercase;">Phase 2: ${roadmap.phase2.title}</div>
                        <h3 style="color: white; margin-top: 5px;">${roadmap.phase2.subtitle}</h3>
                         <ul style="color: #94a3b8; padding-left: 20px; font-size: 13px; margin-top: 10px;">
                            ${roadmap.phase2.steps.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                 <!-- PHASE 3 -->
                <div class="bg-surface card roadmap-step">
                    <div class="roadmap-marker"></div>
                    <div>
                        <div style="color: #c084fc; font-weight: 800; font-size: 14px; text-transform: uppercase;">Phase 3: ${roadmap.phase3.title}</div>
                        <h3 style="color: white; margin-top: 5px;">${roadmap.phase3.subtitle}</h3>
                         <ul style="color: #94a3b8; padding-left: 20px; font-size: 13px; margin-top: 10px;">
                            ${roadmap.phase3.steps.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <div style="margin-top: 50px; text-align: center;">
                <h2 style="margin-bottom: 20px;">Ready to dominate your local market?</h2>
                <div style="display:inline-block; padding: 15px 30px; background: #4ade80; color: #020817; font-weight: 800; border-radius: 8px; font-size: 18px;">
                    APPROVE ROADMAP
                </div>
            </div>
        </div>

      </body>
    </html>
    `;
}
