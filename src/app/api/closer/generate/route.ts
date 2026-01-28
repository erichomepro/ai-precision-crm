import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { db as adminDb } from '../../../../../lib/firebase_admin';
import { model } from '../../../../../lib/gemini';
import fs from 'fs';
import path from 'path';

// --- EDUCATIONAL DATA MODULES ---
const EDUCATIONAL_MODULES = [
    {
        title: "The Problem with Traditional Websites",
        subtitle: "Why 'Brochure' Sites Don't Sell",
        icon: "🛑",
        problem: "Most business websites are digital brochures. They list services but don't guide visitors toward a sale. It's like having a store with no salesperson—visitors wander around and leave.",
        solution: "High-Converting Sales Funnels",
        solutionText: "We don't just build websites; we build 'Conversion Engines'. We use dedicated landing pages for each service that focus on one goal: getting the customer's contact info.",
        roi: "Funnels typically convert 2-3x higher than standard websites. That means double the leads for the same ad spend.",
        stat: "2.5x",
        statLabel: "Conversion Lift"
    },
    {
        title: "The 'Missed Call' Revenue Leak",
        subtitle: "The Cost of Slow Response Times",
        icon: "📉",
        problem: "62% of calls and inquiries to small businesses go unanswered or go to voicemail. In 2024, if you don't answer in 5 minutes, that lead goes to your competitor.",
        solution: "AI Sales Agents (24/7 Chat)",
        solutionText: "We deploy an intelligent AI agent on your site and SMS. It engages visitors instantly, 24/7, answers questions, and books appointments while you sleep.",
        roi: "Businesses capturing leads within 5 minutes see a 9x increase in closing rates. Stop losing money to voicemail.",
        stat: "24/7",
        statLabel: "Lead Capture"
    },
    {
        title: "Invisibility on Google",
        subtitle: "You Can't Sell if They Can't Find You",
        icon: "👻",
        problem: "Over 90% of clicks happen on Page 1 of Google. If you're on Page 2, you're invisible. Traditional SEO is slow and often vague.",
        solution: "Semantic & Map-Pack Dominance",
        solutionText: "We focus on 'High-Intent' local SEO. We optimize your Google Business Profile and create content that answers exactly what your high-value customers are asking.",
        roi: "Ranking in the 'Local Pack' (Top 3 Map results) drives 40-60% of all local calls for service businesses.",
        stat: "#1",
        statLabel: "Target Ranking"
    },
    {
        title: "The Trust Deficit",
        subtitle: "Reviews Are Your Digital Currency",
        icon: "⭐",
        problem: "People buy from who they trust. A lack of recent, positive reviews is a red flag to potential customers. One bad unanswered review can kill 10 future sales.",
        solution: "Automated Reputation Management",
        solutionText: "We automate the review request process. Every happy customer gets a text asking for a review. We also AI-generate professional responses to every review, showing Google you are active.",
        roi: "A rating increase of just 1 star can boost revenue by 5-9%.",
        stat: "+9%",
        statLabel: "Revenue / Star"
    }
];

function debugLog(msg: string) {
    try {
        fs.appendFileSync(path.join(process.cwd(), 'proposal_gen.log'), `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

async function generateAiStrategy(businessName: string, audit: any) {
    try {
        const prompt = `
            Analyze this client for a marketing proposal.
            Client: ${businessName}
            
            Audit Data:
            - Google Rating: ${audit?.google?.totalScore || "Unknown"} stars (${audit?.google?.reviewsCount || 0} reviews)
            - Tech Stack: ${audit?.tech ? JSON.stringify(audit.tech) : "Unknown"}
            - Performance: ${audit?.performance ? `Speed ${audit.performance.performance}/100` : "Unknown"}

            Output JSON ONLY:
            {
                "executiveSummary": "2 sentences diagnosing their biggest problem.",
                "opportunity": "1 sentence on the revenue they are losing.",
                "recommendedPhase1": "Name of the first service they need (e.g. Reputation Management)",
                "recommendedPhase2": "Name of the second service (e.g. AI Sales Agent)"
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("AI Gen Failed, using defaults", e);
        return {
            executiveSummary: "We identified several key areas where automation can increase your revenue.",
            opportunity: "You are currently missing out on high-intent local traffic.",
            recommendedPhase1: "Foundation Setup",
            recommendedPhase2: "Growth Acceleration"
        };
    }
}

export async function POST(req: Request) {
    debugLog("Received Proposal Generation Request");
    try {
        const body = await req.json();

        // Handle Logic for Legacy vs New Call
        let clientData: any = {};
        let auditData: any = {};

        if (body.clientId) {
            const clientDoc = await adminDb.collection('clients').doc(body.clientId).get();
            if (!clientDoc.exists) return NextResponse.json({ error: "Client not found" }, { status: 404 });
            const data = clientDoc.data() || {};
            clientData = {
                Company: data.Company,
                FirstName: data.FirstName,
                LastName: data.LastName,
                Website: data.Website || "",
                Email: data.Email
            };
            auditData = data.Audit || {};
        } else {
            clientData = {
                Company: body.businessName,
                FirstName: body.candidates?.[0]?.name?.split(' ')[0] || "Valued",
                LastName: body.candidates?.[0]?.name?.split(' ').slice(1).join(' ') || "Prospect",
                Website: "",
                Email: ""
            };
            auditData = body.audit || {};
        }

        // 2. AI Strategy
        const aiStrategy = await generateAiStrategy(clientData.Company, auditData);

        // 3. Generate HTML
        const htmlContent = generateProposalHtml(clientData, auditData, aiStrategy);

        // 4. Puppeteer PDF
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
            'D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        ];
        const chromePath = possiblePaths.find(p => p && fs.existsSync(p));

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        return NextResponse.json({
            success: true,
            pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
            filename: `Proposal_${clientData.Company || 'Client'}.pdf`
        });

    } catch (error: any) {
        debugLog(`Error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function generateProposalHtml(client: any, audit: any, ai: any) {
    // defaults
    const googleScore = Number(audit?.google?.totalScore) || 0;
    const reviewCount = Number(audit?.google?.reviewsCount) || 0;
    const hasGoogleData = googleScore > 0;

    const speedScore = audit?.performance?.performance || 0;
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

    // --- GOOGLE DEEP DIVE ---
    const reviews = audit?.google?.reviews || [];
    // Filter generic/empty reviews from showing up in the 'Customer Voice' section to preserve quality
    const textReviews = reviews.filter((r: any) => r.text && r.text.length > 5);

    // --- STYLES ---
    const css = `
         body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #1e293b; -webkit-print-color-adjust: exact; }
         .page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; box-sizing: border-box; background: white; }
         .page-pad { padding: 50px; }
         
         /* UTILS */
         .text-green { color: #16a34a; }
         .text-red { color: #dc2626; }
         .text-blue { color: #2563eb; }
         .bg-dark { background: #0f172a; color: white; }
         .flex { display: flex; }
         .flex-col { display: flex; flex-direction: column; }
         .items-center { align-items: center; }
         .justify-between { justify-content: space-between; }
         .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
         
         /* TYPOGRAPHY */
         h1 { font-size: 36px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px; }
         h2 { font-size: 24px; font-weight: 700; margin: 0 0 15px 0; color: #0f172a; }
         h3 { font-size: 18px; font-weight: 600; color: #334155; margin: 0 0 10px 0; }
         p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0; }
         .label { text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; }

         /* COMPONENTS */
         .card { padding: 25px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 20px; }
         .stat-huge { font-size: 48px; font-weight: 800; line-height: 1; }
         .accent-bar { width: 60px; height: 6px; background: #2563eb; margin: 20px 0; }
         
         /* LEAKAGE METER */
         .leakage-container { margin: 40px 0; padding: 30px; background: #fff1f2; border: 2px solid #fecdd3; border-radius: 16px; text-align: center; }
         .leakage-val { font-size: 64px; font-weight: 900; color: #e11d48; }
         
         /* MODULE PAGE */
         .module-icon { font-size: 40px; margin-bottom: 20px; }
         .solution-box { background: #eff6ff; border-left: 5px solid #2563eb; padding: 25px; margin-top: 20px; }
         
         /* FOOTER */
         .footer { position: absolute; bottom: 30px; left: 50px; right: 50px; border-top: 1px solid #e2e8f0; paddingTop: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    `;

    // --- HTML GENERATORS ---

    const renderHeader = (title: string) => `
        <div style="margin-bottom: 40px;">
            <div style="font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">AI Precision Marketing</div>
            <h1 style="color: #0f172a;">${title}</h1>
            <div class="accent-bar"></div>
        </div>
    `;

    const renderFooter = () => `
        <div class="footer">
            <div>Prepared for ${client.Company}</div>
            <div>${new Date().toLocaleDateString()}</div>
        </div>
    `;

    // --- PAGE 1: COVER ---
    const coverPage = `
        <div class="page bg-dark" style="display:flex; flex-direction:column; justify-content:center; padding: 60px;">
             <div style="font-size: 14px; font-weight: bold; color: #60a5fa; letter-spacing: 2px; text-transform: uppercase;">Confidential Analysis</div>
             <div style="margin-top: 20px;">
                <h1 style="font-size: 64px; line-height: 1.1; margin-bottom: 20px; color: white;">Digital<br>Dominance<br>Blueprint</h1>
                <div style="width: 100px; height: 8px; background: #3b82f6; margin: 40px 0;"></div>
                <div style="font-size: 24px; color: #94a3b8; font-weight: 300;">A revenue-focused audit and roadmap for</div>
                <div style="font-size: 32px; color: white; font-weight: 700; margin-top: 10px;">${client.Company || "Valued Prospect"}</div>
             </div>
             
             <div style="margin-top: auto;">
                <div style="display: flex; gap: 40px; border-top: 1px solid #334155; padding-top: 30px;">
                    <div>
                        <div class="label" style="color:#64748b;">PREPARED BY</div>
                        <div style="color:white; font-weight:600; font-size:14px; margin-top:5px;">AI Precision Marketing</div>
                    </div>
                     <div>
                        <div class="label" style="color:#64748b;">DATE</div>
                        <div style="color:white; font-weight:600; font-size:14px; margin-top:5px;">${new Date().toLocaleDateString()}</div>
                    </div>
                </div>
             </div>
        </div>
    `;

    // --- PAGE 2: DIAGNOSIS & REVENUE LEAKAGE ---
    const diagnosisPage = `
        <div class="page page-pad">
            ${renderHeader("Executive Diagnosis")}
            
            <p style="font-size: 16px; font-weight: 500; color: #334155; margin-bottom: 30px;">
                We have performed a forensic audit of your current digital infrastructure. Our goal was simple: identify where you are losing money.
            </p>
            
            <div class="card" style="background: #f1f5f9;">
                <h2>The Verdict</h2>
                <p style="font-size: 15px;">"${ai.executiveSummary}"</p>
            </div>

            <div class="leakage-container">
                <div style="text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #be123c;">Estimated Efficiency Loss</div>
                <div class="leakage-val">${leakageScore}%</div>
                <p style="max-width: 400px; margin: 10px auto;">Your current digital setup is likely capturing less than half of the available market interest due to technical and strategy gaps.</p>
            </div>
            
            <div class="grid-2">
                 <div class="card">
                    <h3>Review Authority</h3>
                    <div style="font-size: 32px; font-weight: 700; color: ${googleScore > 4.0 ? '#16a34a' : '#dc2626'};">${googleScore > 0 ? googleScore : 'N/A'}</div>
                    <p style="font-size: 12px; margin-top: 5px;">Google Star Rating</p>
                </div>
                 <div class="card">
                    <h3>Response Speed</h3>
                    <div style="font-size: 32px; font-weight: 700; color: ${hasChatbot ? '#16a34a' : '#dc2626'};">${hasChatbot ? 'Instant' : 'Slow'}</div>
                    <p style="font-size: 12px; margin-top: 5px;">Lead Response Time</p>
                </div>
            </div>

            ${renderFooter()}
        </div>
    `;

    // --- PAGE 3: FORENSIC AUDIT (Using Data) ---
    // Only show sections that have data
    const auditPage = `
        <div class="page page-pad">
            ${renderHeader("Forensic Data Audit")}
            
            <div style="margin-bottom: 30px;">
                <p>We analyzed over 50 data points across your web presence. Here are the critical findings.</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                
                <!-- 1. GOOGLE MAPS -->
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <h3>📍 Google Business Profile</h3>
                         ${hasGoogleData ? '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">DETECTED</span>' : '<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">MISSING / LOW VISIBILITY</span>'}
                    </div>
                    ${hasGoogleData ? `
                        <div class="grid-2" style="margin-top: 15px;">
                            <div>
                                <div class="label">RATING</div>
                                <div style="font-size: 24px; font-weight: bold;">${googleScore} <span style="font-size:14px; font-weight:normal; color:#64748b;">(${reviewCount} reviews)</span></div>
                            </div>
                            <div>
                                <div class="label">IMPACT</div>
                                <div style="font-size: 13px; margin-top: 5px; color: ${googleScore < 4.0 ? '#dc2626' : '#16a34a'};">
                                    ${googleScore < 4.0 ? "Ratings below 4.0 deter 57% of consumers." : "Good foundation for trust."}
                                </div>
                            </div>
                        </div>
                    ` : `<p style="color: #dc2626; font-weight: 500; margin-top:10px;">We could not definitively locate a claimed Google Business Profile. You are invisible to local searches.</p>`}
                </div>

                <!-- 2. WEBSITE TECH -->
                <div class="card">
                    <h3>⚡ Website Infrastructure</h3>
                    <table style="width:100%; text-align:left; font-size: 14px; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 0;">Mobile Responsiveness</td>
                            <td style="font-weight: bold; color: ${mobileScore ? '#16a34a' : '#dc2626'}">${mobileScore ? "Optimized" : "Unoptimized"}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 0;">Page Speed (Lighthouse)</td>
                            <td style="font-weight: bold; color: ${speedScore > 50 ? '#16a34a' : '#d97706'}">${speedScore}/100</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 0;">Facebook Pixel</td>
                            <td style="font-weight: bold; color: ${hasPixel ? '#16a34a' : '#dc2626'}">${hasPixel ? "Installed" : "Missing (No Retargeting)"}</td>
                        </tr>
                         <tr>
                            <td style="padding: 10px 0;">AI Automation</td>
                            <td style="font-weight: bold; color: ${hasChatbot ? '#16a34a' : '#dc2626'}">${hasChatbot ? "Active" : "None Detected"}</td>
                        </tr>
                    </table>
                </div>

                <!-- 3. CUSTOMER VOICE (Only if we have reviews) -->
                ${textReviews.length > 0 ? `
                <div class="card">
                     <h3>💬 Customer Voice</h3>
                     <div style="font-style: italic; color: #475569; font-size: 13px;">
                        "${textReviews[0].text.length > 120 ? textReviews[0].text.substring(0, 120) + '...' : textReviews[0].text}"
                     </div>
                     <div style="margin-top: 5px; font-weight: bold; font-size: 12px;">- ${textReviews[0].author} ${'★'.repeat(textReviews[0].stars)}</div>
                </div>
                ` : ''}

            </div>
            ${renderFooter()}
        </div>
    `;

    // --- EDUCATIONAL MODULE PAGES ---
    const educationPages = EDUCATIONAL_MODULES.map(mod => `
        <div class="page page-pad">
            ${renderHeader(mod.title)}
            
            <div style="font-size: 20px; font-weight: 300; color: #64748b; margin-bottom: 30px;">
                ${mod.subtitle}
            </div>

            <div class="grid-2">
                <div>
                     <div class="module-icon">${mod.icon}</div>
                     <h2 style="font-size: 18px;">The Problem</h2>
                     <p>${mod.problem}</p>
                     
                     <div style="margin-top: 40px;">
                        <h2 style="font-size: 18px;">The Outcome</h2>
                        <div class="stat-huge text-blue">${mod.stat}</div>
                        <div class="label">${mod.statLabel}</div>
                     </div>
                </div>
                
                <div>
                    <div class="solution-box">
                        <div class="label" style="color: #1e40af; margin-bottom: 10px;">OUR SOLUTION</div>
                        <h2 style="color: #1e3a8a;">${mod.solution}</h2>
                        <p style="color: #1e3a8a;">${mod.solutionText}</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; border: 1px dashed #94a3b8; border-radius: 8px;">
                        <div class="label">ROI IMPACT</div>
                        <p style="margin: 5px 0 0 0; font-weight: 600; color: #0f172a;">${mod.roi}</p>
                    </div>
                </div>
            </div>

            ${renderFooter()}
        </div>
    `).join('');

    // --- ROADMAP PAGE ---
    const roadmapPage = `
        <div class="page page-pad bg-dark">
            <div style="margin-bottom: 40px;">
                <div style="font-size: 12px; font-weight: bold; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px;">Execution Plan</div>
                <h1 style="color: white;">Strategic Roadmap</h1>
                <div class="accent-bar" style="background: #3b82f6;"></div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 30px;">
                
                <div style="display: flex; gap: 20px;">
                    <div style="font-size: 48px; font-weight: 900; color: #3b82f6; opacity: 0.5;">01</div>
                    <div style="background: rgba(255,255,255,0.05); padding: 25px; border-radius: 12px; flex: 1; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: white;">Foundation & Quick Wins (Days 1-14)</h3>
                        <p style="color: #94a3b8;">Plug the revenue leaks immediately.</p>
                        <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                            <li>Deploy AI Sales Chatbot (Capture missed calls)</li>
                            <li>Optimize Google Business Profile (Visibility)</li>
                            <li>Launch Review Reactivation Campaign (Trust)</li>
                        </ul>
                    </div>
                </div>

                <div style="display: flex; gap: 20px;">
                    <div style="font-size: 48px; font-weight: 900; color: #60a5fa; opacity: 0.5;">02</div>
                     <div style="background: rgba(255,255,255,0.05); padding: 25px; border-radius: 12px; flex: 1; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: white;">Growth Engines (Days 15-45)</h3>
                        <p style="color: #94a3b8;">Scale traffic and authority.</p>
                        <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                            <li>Build High-Converting Landing Page Funnel</li>
                            <li>Start Weekly SEO Blog & Content</li>
                            <li>Launch Retargeting Ads (Facebook/Insta)</li>
                        </ul>
                    </div>
                </div>

                <div style="display: flex; gap: 20px;">
                    <div style="font-size: 48px; font-weight: 900; color: #93c5fd; opacity: 0.5;">03</div>
                    <div style="background: rgba(255,255,255,0.05); padding: 25px; border-radius: 12px; flex: 1; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: white;">Market Dominance (Ongoing)</h3>
                        <p style="color: #94a3b8;">Automate and optimize.</p>
                         <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                            <li>Omni-channel Nurture Sequences (SMS/Email)</li>
                            <li>Advanced AI Voice Agents</li>
                            <li>Competitor Conquesting Campaigns</li>
                        </ul>
                    </div>
                </div>

            </div>

             <div class="footer" style="border-top-color: #334155;">
                <div style="color: #64748b;">Prepared for ${client.Company}</div>
                <div style="color: #64748b;">${new Date().toLocaleDateString()}</div>
            </div>
        </div>
    `;

    return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>${css}</style>
      </head>
      <body>
        ${coverPage}
        ${diagnosisPage}
        ${auditPage}
        ${educationPages}
        ${roadmapPage}
      </body>
    </html>
    `;
}
