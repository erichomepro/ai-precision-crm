
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    try {
        const { brandId, prompt, style, camera, useBrandDNA, brandName, brandOverview } = await req.json();

        // Construct a rich prompt based on user inputs
        let richPrompt = `
        Subject: ${prompt}
        Visual Style: ${style || "Photorealistic"}
        Camera Perspective: ${camera || "Standard View"}
        `;

        // Inject Brand DNA if requested
        if (useBrandDNA) {
            richPrompt += `
        Brand Context: ${brandName || "Unknown Brand"}
        Business Overview: ${brandOverview || "A professional company."}
        mood: Consistent with brand identity.
            `;
        }

        richPrompt += `
        Directives:
        - Generate a high-quality, professional image.
        - NO TEXT on the image.
        - High resolution, 4k.
        `.trim();

        console.log(`[Gemini/Nano Banana Pro] Generating image for ${brandName}...`);

        if (!GEMINI_API_KEY) {
            console.warn("[Gemini] API Key missing. Using simulation.");
            return NextResponse.json({
                success: true,
                images: getSimulationImages(),
                meta: { engine: "Simulation (Missing Key)" }
            });
        }

        try {
            // NOTE: The standard GoogleGenerativeAI SDK for Node often separates Image generation
            // into a specific model call. As of "Gemini-2.0/Nano", access might be via 'imagen-3.0-generate-001'.
            // Since the SDK wrapper varies, we'll try a direct fetch to the likely endpoint 
            // used by "Nano Banana" (Vertex AI / Generative Language API) logic.

            // Attempting standard Imagen 3 endpoint pattern via REST if SDK method implies text-only
            // Or using the model.generateContent if multimodal output is supported.
            // For stability in this environment, checking if we can use the SDK model first.

            // Using the user-specified "Nano Banana Pro" model ID
            const MODEL_ID = 'gemini-3-pro-image-preview';

            console.log(`[Gemini] Calling model: ${MODEL_ID}`);

            // Direct REST call to the Generative Language API
            // CORRECTION: This model supports 'generateContent', not 'predict'.
            // CORRECTION 2: "Multiple candidates not enabled" -> We must make parallel requests manually.

            const REQUEST_COUNT = 2; // Generate 2 distinct images via parallel calls

            const generateImageCall = async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: richPrompt }]
                        }],
                        generationConfig: {
                            temperature: 1,
                            maxOutputTokens: 8192
                            // candidateCount removed (must be 1 for this model)
                        }
                    })
                });

                if (!response.ok) {
                    const txt = await response.text();
                    throw new Error(`API ${response.status}: ${txt}`);
                }

                const data = await response.json();
                // Extract image from response
                if (data.candidates?.[0]?.content?.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }
                return null;
            };

            // Run requests in parallel
            const results = await Promise.allSettled(Array(REQUEST_COUNT).fill(null).map(generateImageCall));

            const images = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => (r as PromiseFulfilledResult<string>).value);

            if (images.length > 0) {
                return NextResponse.json({
                    success: true,
                    images,
                    meta: { engine: "Nano Banana Pro (Gemini 3)" }
                });
            }

            // If all failed, throw the error of the first rejection
            const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
            if (firstError) throw new Error(firstError.reason.message);

            throw new Error("No images returned from API"); // Fallback

        } catch (apiError: any) {
            console.error("[Gemini Image Gen] Failed:", apiError);

            // RETURN THE ERROR to the frontend for debugging instead of silent Picsum fallback
            return NextResponse.json({
                success: false, // Mark as failed so UI shows the error
                error: apiError.message || "Unknown API Error",
                isSimulation: true // Flag to tell UI this was a failure
            });
        }

    } catch (error: any) {
        console.error("Image Gen Route Error:", error);
        return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
    }
}

function getSimulationImages() {
    const randomSeed = Math.floor(Math.random() * 1000);
    return [
        `https://picsum.photos/seed/${randomSeed}/800/800`,
        `https://picsum.photos/seed/${randomSeed + 1}/800/800`
    ];
}
