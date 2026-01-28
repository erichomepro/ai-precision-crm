
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { dna } = await req.json();
        console.log("[DEBUG] Generate Overview Request. DNA valid?", !!dna, "Raw Text Length:", dna?.rawText?.length);

        if (!dna || !dna.rawText) {
            console.error("[DEBUG] Missing DNA or rawText");
            return NextResponse.json({ error: "Missing DNA or raw text context" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        You are a Brand Strategist. Write a "Golden Source" Master Prompt (Business Overview) for the following brand based on their website text.
        
        Brand Name: ${dna.name || "Unknown"}
        Context: ${dna.rawText ? dna.rawText.substring(0, 10000) : "No text"}
        
        CRITICAL OUTPUT FORMAT:
        You must strictly follow this structure. Do not use markdown bolding in the labels if possible, just the sections.
        
        Role: [Define the Brand's Role/Archetype and Voice. E.g., "The authoritative guide to..."]
        
        Visuals: [Describe the visual identity, colors, fonts, and imagery style based on the text context]
        
        Offerings: [List specific packages, pricing, and core services found in the text. Be detailed.]
        
        DNA: [The core mission, values, and what makes them unique]
        `;

        const result = await model.generateContent(prompt);
        const responseData = await result.response;
        const overview = responseData.text();

        return NextResponse.json({
            success: true,
            overview: overview.trim()
        });

    } catch (error: any) {
        console.error("Overview Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
