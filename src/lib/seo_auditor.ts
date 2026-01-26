
import puppeteer from 'puppeteer';

export interface SeoAuditResult {
    url: string;
    title: string;
    description: string;
    h1Count: number;
    h1Text: string;
    mobileFriendly: boolean; // Based on viewport
    secure: boolean;
    loadTime: number; // ms
    globalScore: number; // 0-100
    summary: string;
    textContent?: string; // For AI analysis
    techStack?: string[];
    adStatus?: {
        hasFbPixel: boolean;
        hasGoogleAds: boolean;
        hasTiktokPixel: boolean;
        hasLinkedinInsight: boolean;
        summary: string;
    };
}

export async function auditWebsite(url: string): Promise<SeoAuditResult> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set decent viewport
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const startTime = Date.now();
    let loadTime = 0;
    let errorMsg = "";

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        loadTime = Date.now() - startTime;
    } catch (e: any) {
        console.error(`[Auditor] Failed to load ${url}:`, e);
        errorMsg = e.message;
        // Proceed with what we can inspect if partial load, else return fatal
        if (!page.url() || page.url() === "about:blank") {
            await browser.close();
            throw new Error("Could not load website for audit.");
        }
    }

    // ... (existing code)

    // 1. Audit Factors
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => "");
    const h1s = await page.$$eval('h1', els => els.map(e => e.innerText));
    const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content')).catch(() => "");

    const isSecure = url.startsWith('https');
    const isMobileFriendly = !!viewport && viewport.includes('width=device-width');

    // --- TECH STACK DETECTION ---
    const html = await page.content();
    const techStack: string[] = [];

    // CMS Check
    if (html.includes('wp-content')) techStack.push('WordPress');
    if (html.includes('shopify.com') || html.includes('cdn.shopify')) techStack.push('Shopify');
    if (html.includes('squarespace')) techStack.push('Squarespace');
    if (html.includes('wix.com')) techStack.push('Wix');
    if (html.includes('webflow')) techStack.push('Webflow');

    // Analytics Check
    if (html.includes('googletagmanager.com')) techStack.push('Google Tag Manager');
    if (html.includes('google-analytics.com/analytics.js') || html.includes('gtag')) techStack.push('Google Analytics');
    if (html.includes('connect.facebook.net')) techStack.push('Facebook Pixel');

    // Framework Check
    if (html.includes('_next/static')) techStack.push('Next.js');
    if (html.includes('react-dom')) techStack.push('React');

    // --- AD TRACKING DETECTION ---
    const adStatus = {
        hasFbPixel: html.includes('fbevents.js') || html.includes('connect.facebook.net/en_US/fbevents.js'),
        hasGoogleAds: html.includes('googletagmanager.com') || html.includes('googleadservices.com') || html.includes('gtag('),
        hasTiktokPixel: html.includes('analytics.tiktok.com'),
        hasLinkedinInsight: html.includes('linkedin.com/insight') || html.includes('snap.licdn.com'),
        summary: ""
    };

    const activeChannels = [];
    if (adStatus.hasFbPixel) activeChannels.push("Facebook Ads");
    if (adStatus.hasGoogleAds) activeChannels.push("Google Ads");
    if (adStatus.hasTiktokPixel) activeChannels.push("TikTok Ads");
    if (adStatus.hasLinkedinInsight) activeChannels.push("LinkedIn Ads");

    adStatus.summary = activeChannels.length > 0
        ? `Running Ads on: ${activeChannels.join(', ')}`
        : "No Ad Pixels detected (Organic Only).";

    // Extract text for AI
    const textContent = await page.$eval('body', el => el.innerText).catch(() => "");

    // 2. Score Calculation
    let score = 100;
    const suggestions: string[] = [];

    // - Secure
    if (!isSecure) { score -= 20; suggestions.push("Site is not HTTPS."); }

    // - Title
    if (!title) { score -= 10; suggestions.push("Missing Title tag."); }
    else if (title.length < 10) { score -= 5; suggestions.push("Title tag too short."); }
    else if (title.length > 70) { score -= 5; suggestions.push("Title tag too long."); }

    // - Description
    if (!description) { score -= 15; suggestions.push("Missing Meta Description."); }
    else if (description.length < 50) { score -= 5; suggestions.push("Meta Description too short."); }

    // - H1
    if (h1s.length === 0) { score -= 15; suggestions.push("Missing H1 Header."); }
    else if (h1s.length > 1) { score -= 5; suggestions.push("Multiple H1 tags found (should be 1)."); }

    // - Mobile
    if (!isMobileFriendly) { score -= 20; suggestions.push("No mobile viewport detected."); }

    // - Speed (Rough benchmark)
    if (loadTime > 3000) { score -= 10; suggestions.push(`Slow load time (${(loadTime / 1000).toFixed(1)}s).`); }

    // Finalize
    score = Math.max(0, score);

    await browser.close();

    // --- CITATION CHECK (External) ---
    // Count results for "Business Name" minus their own site
    let citations = 0;
    try {
        // We need the domain to exclude it
        const domain = new URL(url).hostname.replace('www.', '');
        // Search heuristic
        // Note: usage of googleSearch inside auditWebsite might be circular if dependencies were complex, 
        // but here it is fine. we just need to import or reuse the function below.
        // Wait, googleSearch is exported from this same file. We can call it directly.
        // BUT googleSearch launches a NEW browser instance. This is inefficient but safe.
        // Optimization: In standard production we'd reuse the browser, but for now separate calls is robust.
        // We will do this check IN THE ROUTE handler to avoid blocking the audit or confusing this pure function.
        // Actually, let's keep auditWebsite pure DOM. The ROUTE can handle citations.
    } catch (e) { }

    return {
        url,
        title,
        description: description || "",
        h1Count: h1s.length,
        h1Text: h1s[0] || "",
        mobileFriendly: isMobileFriendly,
        secure: isSecure,
        loadTime,
        globalScore: score,
        summary: suggestions.length > 0 ? suggestions.join(" ") : "Technical SEO looks solid.",
        textContent: textContent.substring(0, 15000), // Limit size
        techStack,
        adStatus // New Field
    };
}



export async function googleSearch(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const results: { title: string; link: string; snippet: string }[] = [];

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });

        // Simple selector for Google results (classes change, but 'div.g' is stable-ish)
        // Note: Google actively fights this. This is a best-effort implementation.
        const elements = await page.$$('div.g');

        for (const el of elements.slice(0, 3)) { // Top 3
            const titleEl = await el.$('h3');
            const linkEl = await el.$('a');
            const snipEl = await el.$('div[style*="-webkit-line-clamp"]'); // Varies wildly

            if (titleEl && linkEl) {
                const title = await page.evaluate(e => e.innerText, titleEl);
                const link = await page.evaluate(e => e.getAttribute('href'), linkEl);
                const snippet = snipEl ? await page.evaluate(e => e.innerText, snipEl) : "";

                if (link && link.startsWith('http')) {
                    results.push({ title, link, snippet });
                }
            }
        }

    } catch (e) {
        console.error("Google Search failed:", e);
    } finally {
        await browser.close();
    }
    return results;
}
