import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { genAI, generateContentWithRetry } from "@/lib/gemini";

// Initialize Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || ''); // Removed, using shared instance
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
    try {
        const { topic, competitorUrl, approvedBrief, targetUrl, action, currentContent, seoReport, imageFocus } = await req.json();

        // --- OPTIMIZATION ACTION ---
        if (action === 'optimize' && currentContent && seoReport) {
            console.log(`[Agent: Editor] Manual optimization requested...`);
            const rewriterPrompt = `
                You are an Expert Editor and SEO Specialist.
                
                Original Content:
                ${currentContent}

                SEO Audit Report:
                - Score: ${seoReport.score}
                - Issues: ${JSON.stringify(seoReport.issues)}
                - Suggestions: ${JSON.stringify(seoReport.suggestions)}

                Task:
                Rewrite the content to address the issues. 
                CRITICAL GUIDELINES:
                1. **Natural Language**: Do NOT "keyword stuff". Integrate keywords naturally into high-quality, professional prose.
                2. **Preserve Structure**: Keep the original Tone, H1, H2, and H3 structure. 
                3. **Semantic HTML**: Stay in pure Semantic HTML5.
                4. **NO Images**: Do not include any <img> tags in the response.
                5. **Readability First**: If an SEO suggestion conflicts with human readability, prioritize the human reader.
                
                Return ONLY the rewritten HTML content starting from the <meta> block (if present).
            `;

            const rewriteResult = await generateContentWithRetry(model, rewriterPrompt);
            const rewrittenText = rewriteResult.response.text();

            const finalContent = rewrittenText
                .replace(/```html/g, '')
                .replace(/```/g, '')
                .trim();

            // Re-run Audit
            const reAuditResult = await generateContentWithRetry(model, `
                Audit the following blog post for SEO:
                ${finalContent}
                Return JSON: { "score": number, "issues": string[], "suggestions": string[] }
            `);
            const reAuditJson = JSON.parse(reAuditResult.response.text().match(/\{[\s\S]*\}/)?.[0] || '{"score": 90, "issues": [], "suggestions": []}');

            return NextResponse.json({
                success: true,
                stage: "final",
                data: {
                    content: finalContent,
                    originalContent: currentContent,
                    seo: reAuditJson,
                    images: [] // frontend should merge or re-generate
                }
            });
        }

        // --- IMAGE RE-GENERATION ACTION ---
        if (action === 'generate_images' && currentContent) {
            console.log(`[Agent: Visual Director] Analyzing content for new images... Focus: ${imageFocus || 'None'}`);

            const imagePrompt = `
                You are a Visual Director. 
                Analyze the article text below and create 3 detailed AI image generation prompts.
                
                USER STYLE/FOCUS INSTRUCTION: "${imageFocus || 'Match the article theme exactly'}"
                (PRIORITIZE this instruction for the style and subject matter of all images).

                ARTICLE TEXT:
                ${currentContent.substring(0, 1500)}

                Task:
                1. Create 3 distinct image prompts.
                2. Be SPECIFIC to the concepts discussed. Avoid generic "business people" or "mountains".
                3. Prompt 1: Hero Image (Main Theme + User Focus style).
                4. Prompt 2: Contextual Illustration (Specific Detail mentioned in text).
                5. Prompt 3: Narrative/Outcome (Abstract or Lifestyle related to benefit).

                Return JSON strictly:
                { "images": [ { "prompt": "...", "alt": "..." } ] }
            `;

            const imagePlanResult = await generateContentWithRetry(model, imagePrompt);
            const imagePlanJson = JSON.parse(imagePlanResult.response.text().match(/\{[\s\S]*\}/)?.[0] || '{ "images": [] }');

            const generatedImages = await Promise.all(imagePlanJson.images.map(async (img: any) => {
                try {
                    const url = await generateImage(img.prompt, process.env.GEMINI_API_KEY || '');
                    // Use keyword-based placeholder. We extract nouns from the prompt for better relevance.
                    const keywords = (imageFocus + " " + img.alt).replace(/[^a-zA-Z]/g, ' ').split(' ').filter(w => w.length > 3).slice(0, 3).join(',');
                    const fallbackUrl = `https://loremflickr.com/800/600/${encodeURIComponent(keywords || 'technology')}`;
                    return { ...img, url: url || fallbackUrl };
                } catch (e) {
                    return { ...img, url: "https://picsum.photos/800/600" };
                }
            }));

            return NextResponse.json({
                success: true,
                data: { images: generatedImages }
            });
        }

        if (!topic && !approvedBrief) {
            return NextResponse.json({ error: "Topic or Approved Brief is required" }, { status: 400 });
        }

        // --- PATH A: GENERATE BRIEF (Researcher + Strategist) ---
        if (!approvedBrief) {
            console.log(`[Agent: Researcher] Scanning for info on: ${topic}`);

            const researcherPrompt = `
            You are a Senior Market Researcher.
            Topic: "${topic}"
            Competitor URL: "${competitorUrl || 'None provided'}"
            
            Task:
            1. Identify 3 key trending sub-topics or "News Angles" related to this topic.
            2. If a competitor URL is provided, analyze what they might be missing.
            3. Provide a list of 5 high-impact SEO keywords strictly related to this.

            Output JSON strictly:
            {
                "trends": ["trend1", "trend2", "trend3"],
                "competitorGap": "Analysis...",
                "keywords": ["kw1", "kw2"...]
            }
            `;

            const researchResult = await generateContentWithRetry(model, researcherPrompt);
            const researchText = researchResult.response.text();
            const researchJson = JSON.parse(researchText.match(/\{[\s\S]*\}/)?.[0] || '{}');


            console.log(`[Agent: Strategist] Developing brief...`);
            const strategistPrompt = `
            You are a Content Strategist.
            Research Data: ${JSON.stringify(researchJson)}

            Task:
            Create a detailed BLOG POST BRIEF.
            - Choose the single best angle from the trends.
            - Create a catchy, click-worthy Title.
            - Create a structured Outline (H2s and H3s).
            - define the Tone (e.g., Authoritative, Friendly).

            Output JSON strictly:
            {
                "title": "...",
                "angle": "...",
                "outline": "...",
                "tone": "..."
            }
            `;

            const strategyResult = await generateContentWithRetry(model, strategistPrompt);
            const strategyText = strategyResult.response.text();
            const strategyJson = JSON.parse(strategyText.match(/\{[\s\S]*\}/)?.[0] || '{}');

            return NextResponse.json({
                success: true,
                stage: "brief", // Signal that we stopped at brief
                data: {
                    research: researchJson,
                    strategy: strategyJson
                }
            });
        }

        // --- PATH B: EXECUTE WRITING (Writer + Auditor) ---
        if (approvedBrief) {
            console.log(`[Agent: Writer] Writing content based on approved brief...`);

            // approvedBrief contains { title, angle, outline, tone, keywords, research }

            // --- KEYWORD AGENT (Long-Tail Expansion) ---
            console.log(`[Agent: Vocabulary Expert] Expanding keywords for diversity...`);
            const vocabularyPrompt = `
            You are an SEO Vocabulary Expert.
            Base Keywords: ${approvedBrief.keywords?.join(', ')}
            Topic: ${approvedBrief.title}
            
            Task:
            Generate 10 "Long-tail" or semantic variations of the base keywords to help the writer avoid repetition.
            Return ONLY a comma-separated list of keywords.
            `;
            const vocabResult = await generateContentWithRetry(model, vocabularyPrompt);
            const longTailKeywords = vocabResult.response.text().trim();


            const writerPrompt = `
            You are an Expert Blog Writer.
            
            Brief:
            - Title: ${approvedBrief.title}
            - Angle: ${approvedBrief.angle}
            - Outline: ${approvedBrief.outline}
            - Tone: ${approvedBrief.tone}
            - Base Keywords: ${approvedBrief.keywords?.join(', ')}
            - **Vocabulary/Long-tail**: ${longTailKeywords} (Use these to avoid repetition!)
            - **Target Link**: "${targetUrl || '#'}" (Contextually link to this URL naturally within the text).

            Task:
            Write the full blog post in **Semantic HTML5**.
            - Use <h1> for the Main Title.
            - Use <h2> for main sections and <h3> for subsections.
            - Use <p> for paragraphs.
            - **Do NOT use Markdown.** Write raw HTML.
            
            Quality Guidelines:
            1. **Flow**: Write for humans. Use short sentences and varied vocabulary.
            2. **No Repetition**: Avoid reusing the same keywords repeatedly. Synonyms are preferred.
            3. **Clean Output**: Do NOT use hashtags (#). Do NOT use excessive dashes (-). Do NOT use "In conclusion".
            4. **Meta Block**: Start the response with a <meta name="description" content="..."> block.
            5. **NO Images**: Do NOT include any <img> tags, image placeholders, or descriptions of images in the text. Images will be added separately.

            Include a "Key Takeaways" section at the top (styled nicely).
            `;

            const writerResult = await generateContentWithRetry(model, writerPrompt);
            const fullContent = writerResult.response.text();

            // Post-processing cleaning (Light cleanup)
            const cleanedContent = fullContent
                .replace(/```html/g, '') // Remove code blocks if AI adds them
                .replace(/```/g, '')
                .trim();


            // --- IMAGE AGENT ---
            console.log(`[Agent: Visual Director] Planning visual assets...`);
            const imagePrompt = `
            You are a Visual Director for a blog.
            Based on the article below, create 3 detailed AI image generation prompts to illustrate the content.
            
            Article Summary: "${approvedBrief.title} - ${approvedBrief.angle}"
            
            Task:
            1. Create 3 distinct image prompts (Photorealistic style).
            2. Prompt 1: Hero Image (top of article).
            3. Prompt 2: Contextual Illustration (middle).
            4. Prompt 3: Detailed Chart or Abstract Representation (end).
            5. Write SEO-optimized Alt Text for each.

            Output JSON strictly:
            {
                "images": [
                    { "prompt": "...", "alt": "..." },
                    { "prompt": "...", "alt": "..." },
                    { "prompt": "...", "alt": "..." }
                ]
            }
            `;

            const imagePlanResult = await generateContentWithRetry(model, imagePrompt);
            const imagePlanText = imagePlanResult.response.text();
            const imagePlanJson = JSON.parse(imagePlanText.match(/\{[\s\S]*\}/)?.[0] || '{ "images": [] }');

            console.log(`[Agent: Designer] Generating ${imagePlanJson.images.length} images...`);

            const generatedImages = await Promise.all(imagePlanJson.images.map(async (img: any) => {
                try {
                    const url = await generateImage(img.prompt, process.env.GEMINI_API_KEY || '');
                    return { ...img, url: url || "https://picsum.photos/800/600" }; // Fallback if null
                } catch (e) {
                    console.error("Image gen failed for:", img.prompt, e);
                    return { ...img, url: "https://picsum.photos/800/600" };
                }
            }));


            console.log(`[Agent: Auditor] Reviewing integrity...`);
            const seoPrompt = `
            You are an SEO Specialist.
            Analyze this article for SEO.
            
            Article: "${fullContent.substring(0, 3000)}..." (truncated for analysis)
            Keywords: ${approvedBrief.keywords?.join(', ')}

            Output JSON:
            {
                "score": 85, // number 0-100
                "issues": ["issue1", "issue2"],
                "suggestions": ["fix1", "fix2"]
            }
            `;

            const seoResult = await generateContentWithRetry(model, seoPrompt);
            const seoText = seoResult.response.text();
            const seoJson = JSON.parse(seoText.match(/\{[\s\S]*\}/)?.[0] || '{"score": 70, "issues": [], "suggestions": []}');

            // --- SEO REWRITER AGENT ---
            console.log(`[Agent: Editor] Optimizing content based on audit...`);
            let finalContent = cleanedContent;

            if (seoJson.score < 100 && (seoJson.issues.length > 0 || seoJson.suggestions.length > 0)) {
                const rewriterPrompt = `
                You are an Expert Editor and SEO Specialist.
                
                Original Content:
                ${cleanedContent}

                SEO Audit Report:
                - Score: ${seoJson.score}
                - Issues: ${JSON.stringify(seoJson.issues)}
                - Suggestions: ${JSON.stringify(seoJson.suggestions)}

                Task:
                Rewrite the original content to address the issues and implement the suggestions.
                - Maintain the original tone and structure.
                - Ensure the content remains in Semantic HTML5.
                - IMPORTANT: Do NOT remove the <meta> description if present, but optimize it if needed.
                - Return ONLY the rewritten HTML content.
                `;

                try {
                    const rewriteResult = await generateContentWithRetry(model, rewriterPrompt);
                    const rewrittenText = rewriteResult.response.text();

                    // Clean up potential markdown blocks again
                    finalContent = rewrittenText
                        .replace(/```html/g, '')
                        .replace(/```/g, '')
                        .trim();

                    console.log(`[Agent: Editor] Rewrite complete.`);
                } catch (rewriteError) {
                    console.error("Rewrite failed, falling back to original content", rewriteError);
                }
            }

            return NextResponse.json({
                success: true,
                stage: "final",
                data: {
                    content: finalContent, // Return the rewritten content
                    originalContent: cleanedContent, // Keep original for reference if needed
                    seo: seoJson,
                    images: generatedImages
                }
            });
        }

    } catch (error: any) {
        console.error("[Autonomous Blog Error]:", error);
        return NextResponse.json({ error: error.message || "Workflow failed" }, { status: 500 });
    }
}

// Helper function to call Gemini Image Generation (Nano Banana Pro)
async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
    if (!apiKey) return null;

    // Using the user-specified "Nano Banana Pro" model ID pattern
    const MODEL_ID = 'gemini-3-pro-image-preview';

    try {
        console.log(`[Gemini/Nano Banana Pro] Generating image for prompt: ${prompt.substring(0, 50)}...`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 8192
                }
            })
        });

        if (!response.ok) {
            const txt = await response.text();
            console.error(`[Image API Error] ${response.status}: ${txt}`);
            return null;
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("[generateImage] Error:", e);
        return null;
    }
}
