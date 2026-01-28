import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { genAI, generateContentWithRetry } from "@/lib/gemini";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || ''); // Removed, using shared instance

export async function POST(req: Request) {
    try {
        const { dna, topic, platform = "Facebook" } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            // Mock response if no key
            return NextResponse.json({
                success: true,
                content: `[MOCK GENERATION] \n\nHere is a ${platform} post about ${topic}.\n\n(Add GEMINI_API_KEY to .env for real AI generation).`
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct the "Context Injection" Prompt
        let dnaContext = "";
        if (dna) {
            dnaContext = `
        BRAND DNA CONTEXT:
        - Name: ${dna.name}
        - Tone of Voice: ${dna.tone}
        - Target Audience: ${dna.audience}
        - Value Proposition: ${dna.value_proposition}
        - Key Pillars: ${dna.pillars?.join(', ')}
        - Keywords: ${dna.keywords?.join(', ')}
        
        INSTRUCTION: You must strictly adhere to the Tone of Voice above. Do not sound generic.
        `;
        } else {
            dnaContext = "Note: No specific Brand DNA provided. Use a professional, engaging tone.";
        }

        const prompt = `
    Role: You are an expert Social Media Manager.
    Task: Write a high-converting social media post for ${platform}.
    Topic: ${topic}
    
    ${dnaContext}
    
    Format Guidelines for ${platform}:
    - Use appropriate emojis for the platform.
    - Include 3-5 relevant hashtags.
    - Structure with a hook, value, and call-to-action (CTA).
    - If Facebook/LinkedIn, ensure good line breaks for readability.
    
    Output:
    Return ONLY the post content.
    `;

        const result = await generateContentWithRetry(model, prompt);
        // The retry function returns the generateContent result, which has .response
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            success: true,
            content: text
        });

    } catch (error: any) {
        console.error('Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
