// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { db } from '../../../../../lib/firebase_admin'; // Switched to admin
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    let browser;
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log("Launching Puppeteer...");

        // 1. SCRAPE FUNCTION
        const scrapePage = async (pageUrl: string) => {
            console.log(`[Scrape] Visiting ${pageUrl}...`);
            const p = await browser.newPage();
            try {
                await p.setViewport({ width: 1920, height: 1080 });
                // Wait for network idle to ensure styles/API calls are done
                await p.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });

                return await p.evaluate(() => {
                    const cleanText = (document.body.innerText || "").replace(/\s+/g, ' ').trim();

                    // Extract Links for navigation
                    const links = Array.from(document.querySelectorAll('a')).map(a => ({
                        text: a.textContent?.trim().toLowerCase() || "",
                        href: a.href
                    }));

                    // Extract Images
                    const images = Array.from(document.querySelectorAll('img'))
                        .filter(img => (img.src && (img.alt.toLowerCase().includes('logo') || img.className.toLowerCase().includes('logo') || img.src.toLowerCase().includes('logo'))))
                        .map(img => img.src)
                        .slice(0, 3);

                    // Extract Colors (Robust)
                    function getColors() {
                        const colorMap = new Map<string, number>();
                        const prioritySelectors = ['button', 'a', '.btn', 'header', 'footer', '.nav', 'h1', 'h2', 'h3', 'svg'];

                        // 1. Priority Elements
                        prioritySelectors.forEach(sel => {
                            document.querySelectorAll(sel).forEach(el => {
                                const style = getComputedStyle(el);
                                const bg = style.backgroundColor;
                                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)' && bg !== 'rgb(255, 255, 255)') {
                                    colorMap.set(bg, (colorMap.get(bg) || 0) + 5);
                                }
                                const text = style.color;
                                if (text && text !== 'rgba(0, 0, 0, 0)' && text !== 'rgb(0, 0, 0)' && text !== 'rgb(255, 255, 255)') {
                                    colorMap.set(text, (colorMap.get(text) || 0) + 2);
                                }
                            });
                        });

                        // 2. Sample General Elements
                        const allElements = document.querySelectorAll('*');
                        for (let i = 0; i < Math.min(allElements.length, 500); i++) {
                            const style = getComputedStyle(allElements[i]);
                            if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                                colorMap.set(style.backgroundColor, (colorMap.get(style.backgroundColor) || 0) + 1);
                            }
                        }

                        let colors = Array.from(colorMap.entries())
                            .sort((a, b) => b[1] - a[1])
                            .map(entry => entry[0])
                            .filter(c => c !== 'rgb(255, 255, 255)' && c !== 'rgb(0, 0, 0)')
                            .slice(0, 5);

                        // Ensure we have at least 3
                        if (colors.length < 3) {
                            if (!colors.includes('rgb(240, 240, 240)')) colors.push('rgb(240, 240, 240)');
                            if (!colors.includes('rgb(50, 50, 50)')) colors.push('rgb(50, 50, 50)');
                        }
                        return colors.slice(0, 3);
                    }

                    const bodyEl = document.body;
                    const bodyStyle = bodyEl ? getComputedStyle(bodyEl) : { fontFamily: 'sans-serif' } as any;
                    const h1El = document.querySelector('h1');
                    const h1Style = h1El ? getComputedStyle(h1El) : null;
                    const secondaryEl = document.querySelector('h2');
                    const secondaryStyle = secondaryEl ? getComputedStyle(secondaryEl) : null;

                    return {
                        text: cleanText,
                        links,
                        images,
                        style: {
                            colors: getColors(),
                            bodyFont: bodyStyle.fontFamily,
                            h1Font: h1Style ? h1Style.fontFamily : bodyStyle.fontFamily,
                            secondaryFont: secondaryStyle ? secondaryStyle.fontFamily : null
                        }
                    };
                });
            } catch (e) {
                console.warn(`[Scrape] Failed to scrape ${pageUrl}:`, e);
                return { text: "", links: [], images: [] };
            } finally {
                await p.close();
            }
        };

        // Launch Browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Scrape Homepage
        const homeData = await scrapePage(url);
        let rawText = `[SOURCE: HOMEPAGE]\n${homeData.text}\n`;
        let combinedImages = [...homeData.images];

        // Heuristic: Find "Pricing" or "Services" or "About" link
        const targetKeywords = ['pricing', 'rates', 'packages', 'services', 'offerings'];
        const subPageLink = homeData.links.find(l => targetKeywords.some(k => l.text.includes(k)));

        if (subPageLink && subPageLink.href && subPageLink.href.startsWith('http')) {
            console.log(`[Scrape] Found relevant subpage: ${subPageLink.text} -> ${subPageLink.href}`);
            const subData = await scrapePage(subPageLink.href);
            rawText += `\n\n[SOURCE: ${subPageLink.text.toUpperCase()}]\n${subData.text}`;
        }

        // Extract styling form content (simplified for brevity, normally we'd do the full style extraction on home)
        // For this refactor, let's assume valid style extraction happens on the first pass or we re-open home for it.
        // To save tokens/complexity, let's do a quick style check on Home again or just assume text is priority.

        // ... (Keep simpler style extraction or rely on the fact that we have the text now) ...

        // Extract styling from Homepage data (since we restored it)
        const extractedColors = homeData.style?.colors || ["#000000", "#ffffff"];
        const extractedFonts = {
            body: homeData.style?.bodyFont || "Inter",
            h1: homeData.style?.h1Font || "Inter"
        };

        // 2. ANALYZE (GEMINI)
        let dna;
        let existingId = null;
        let existingKnowledgeBase: string[] = [];
        let existingLogo = null;
        let existingPalette = null;

        try {
            // Check Database for existing brand
            try {
                const querySnapshot = await db.collection("brands").where("website", "==", url).get();

                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    existingId = doc.id;
                    const data = doc.data();
                    existingPalette = data.design_system?.palette;
                    existingLogo = data.design_system?.logo;
                    existingKnowledgeBase = data.knowledge_base || [];
                }
            } catch (dbErr) {
                console.warn("DB Query failed:", dbErr);
            }

            if (!process.env.GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY");
            }

            // Using gemini-2.0-flash (or fall back to pro if needed)
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            console.log("Generative Model (2.0 Flash)...");

            // LOGGING FOR DEBUGGING
            console.log(`[Analyze] Extracted Colors:`, extractedColors);
            console.log(`[Analyze] Extracted Fonts:`, extractedFonts);
            console.log(`[Analyze] Raw Text Length:`, rawText.length);
            console.log(`[Analyze] Raw Text Preview:`, rawText.substring(0, 100));

            const prompt = `
            Role: You are an Expert Brand Strategist.
            Task: Analyze the provided website content (Home + Subpages) and synthezise a "Golden Source" Brand DNA.
            
            Input Content:
            ${rawText.substring(0, 25000)}
            
            CRITICAL VISUAL CONTEXT (MUST USE):
            - Colors: ${extractedColors.join(', ')} (If these are hex codes, USE THEM exactly in the design system)
            - Primary Font: ${extractedFonts.body}
            - Heading Font: ${extractedFonts.h1}

            Goal: Create a master JSON object that captures the soul, voice, and commercial offering.
            IMPORTANT: Do NOT hallucinate generic data. If the text mentions specific services, use them. If colors are provided above, use them.

            Output Schema (JSON Only):
            {
              "name": "Brand Name",
              "business_overview": "Comprehensive 3rd-person summary (200-300 words). MUST follow this format:\n\nRole: [Define Role/Archetype]\n\nVisuals: [Describe colors, fonts, styles using the provided context]\n\nOfferings: [List packages, pricing, services found]\n\nDNA: [Mission/Values]",
              "tone": "Voice description",
              "audience": "Target demographics",
              "value_proposition": "Main promise",
              "keywords": ["SEO keyword 1", ...],
              "pillars": ["Content Pillar 1", ...],
              "offerings": [
                { "name": "Service Name", "price": "Price", "details": "Desc" }
              ],
              "design_system": {
                 "palette": ${JSON.stringify(extractedColors)}, 
                 "typography": "${extractedFonts.body}",
                 "h1Font": "${extractedFonts.h1}",
                 "aesthetic": "Visual vibe"
              }
            }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log("[Analyze] Raw Gemini Response:", text.substring(0, 200));

            const cleanedJson = text.replace(/```json|```/g, '').trim();
            try {
                dna = JSON.parse(cleanedJson);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                // Regex fallback if needed, but try/catch is safer
                throw new Error("Failed to parse AI response");
            }

            // Force override with scraped visuals if AI hallucinates different ones, 
            // OR let AI refine them. Ideally AI respects the prompt's injected values.
            // Let's ensure at least the palette is consistent if the AI returns empty.
            if (!dna.design_system?.palette?.length) {
                dna.design_system = dna.design_system || {};
                dna.design_system.palette = extractedColors;
            }

        } catch (aiError: any) {
            console.error("Gemini Error:", aiError.message);
            // Fallback DNA
            dna = {
                name: "Analyzed Site",
                tone: "Professional",
                rawText: rawText,
                business_overview: "Could not generate overview due to AI error.",
                design_system: {
                    palette: extractedColors,
                    typography: extractedFonts.body,
                    h1Font: extractedFonts.h1,
                    aesthetic: "Clean"
                }
            };
        }

        // Ensure rawText is always present even if AI succeeds
        if (dna) {
            dna.rawText = rawText;
        }

        return NextResponse.json({
            success: true,
            data: dna,
            meta: {
                // Fallback to homeData images if scraped properties unavailable
                scrapedColor: extractedColors[0],
                palette: existingPalette || extractedColors,
                logos: combinedImages,
                existingId: existingId,
                existingLogo: existingLogo,
                existingKnowledgeBase: existingKnowledgeBase
            }
        });

    } catch (error: any) {
        console.error('Brand Analysis Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to analyze brand.'
        }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
