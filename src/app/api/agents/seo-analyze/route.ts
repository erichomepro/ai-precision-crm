import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    let auditData, businessName, websiteUrl;

    try {
        const body = await req.json();
        auditData = body.auditData;
        businessName = body.businessName;
        websiteUrl = body.websiteUrl;

        if (!auditData) {
            return NextResponse.json({ error: 'Audit data is required' }, { status: 400 });
        }

        // Check for API Key
        if (!process.env.GEMINI_API_KEY) {
            console.warn("Missing GEMINI_API_KEY, using simulation mode.");

            const checks = [];
            if (auditData.mobileResponsive) checks.push("✅ Mobile Friendly"); else checks.push("❌ Mobile Issues Detected");
            if ((auditData.titleLength || 0) < 30) checks.push("❌ Title Tag too short");
            if ((auditData.h1Count || 0) !== 1) checks.push("❌ H1 Header missing or duplicated");

            const mockSummary = `**Initial Audit Summary (Simulation)**\n\nWe analyzed **${businessName}** and found significant opportunities for growth.\n\n**Critical Technical Status:**\n${checks.map(c => `- ${c}`).join('\n')}\n\n**Recommendation:**\nBased on the ${auditData.words || 0} words of content found, your site is under-optimized for local search terms. We recommend an immediate technical fix campaign to address the errors listed above.\n\n*(System Note: Add GEMINI_API_KEY to .env to enable full AI generation)*`;

            return NextResponse.json({
                success: true,
                summary: mockSummary
            });
        }

        // Initialize Gemini with current standard model
        // gemini-2.0-flash is the latest fast model
        let model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        Role: You are an expert SEO Consultant auditing a client's website.
        Client: ${businessName || "The Business"} (${websiteUrl})
        Context: The user has provided a raw JSON SEO audit.
        Task: Write a concise, professional summary for the client.
        
        Guidelines:
        - Use simple, persuasive "Client-Friendly" language.
        - Highlight 3 Key Strengths (if any).
        - Highlight 3 Critical Weaknesses/Opportunities (e.g. "Your site isn't mobile friendly, losing 50% of customers").
        - End with a one-sentence "Verdict" (e.g. "Excellent foundation" or "Needs immediate repair").
        - detailed technical jargon should be explained simply.
        
        Raw Audit Data:
        ${JSON.stringify(auditData).substring(0, 25000)} 
        `; // truncate to avoid token limits if data is massive

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            success: true,
            summary: text
        });

    } catch (error: any) {
        console.error('SEO Analyze Error (Falling back to simulation):', error);

        // FAIL-SAFE FALLBACK
        // If the AI call fails (404, 401, quota, etc), we return the simulation report
        // so the user experience is not broken.

        const checks = [];
        if (auditData.mobileResponsive) checks.push("✅ Mobile Friendly"); else checks.push("❌ Mobile Issues Detected");
        if ((auditData.titleLength || 0) < 30) checks.push("❌ Title Tag too short");
        if ((auditData.h1Count || 0) !== 1) checks.push("❌ H1 Header missing or duplicated");

        const mockSummary = `**Initial Audit Summary (Simulation)**\n\nWe analyzed **${businessName}** and found significant opportunities for growth.\n\n**Critical Technical Status:**\n${checks.map(c => `- ${c}`).join('\n')}\n\n**Recommendation:**\nBased on the ${auditData.words || 0} words of content found, your site is under-optimized for local search terms. We recommend an immediate technical fix campaign to address the errors listed above.\n\n*(System Note: AI Generation failed, displayed fallback report. Error: ${error.message})*`;

        return NextResponse.json({
            success: true,
            summary: mockSummary
        });
    }
}
