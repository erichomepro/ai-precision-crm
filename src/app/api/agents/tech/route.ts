import { NextResponse } from 'next/server';
import { load } from 'cheerio';

export async function POST(req: Request) {
    try {
        const { websiteUrl } = await req.json();
        
        console.log(`🕵️ Tech Detective: Analyzing stack of ${websiteUrl}...`);
        
        const res = await fetch(websiteUrl);
        const html = await res.text();
        const $ = load(html);
        
        const scripts = $('script').map((i, el) => $(el).html() || $(el).attr('src')).get().join(' ');
        
        // Detection Logic
        const techStack = {
            hasFbPixel: scripts.includes('fbq(') || scripts.includes('fbevents.js'),
            hasGtm: scripts.includes('googletagmanager.com'),
            hasGa4: scripts.includes('gtag(') || scripts.includes('google-analytics.com'),
            hasChatbot: false,
            chatbotName: null as string | null,
            platform: 'Unknown'
        };

        // Detect Chatbots
        if (scripts.includes('intercom')) { techStack.hasChatbot = true; techStack.chatbotName = 'Intercom'; }
        else if (scripts.includes('drift')) { techStack.hasChatbot = true; techStack.chatbotName = 'Drift'; }
        else if (scripts.includes('tidio')) { techStack.hasChatbot = true; techStack.chatbotName = 'Tidio'; }
        else if (scripts.includes('tawk.to')) { techStack.hasChatbot = true; techStack.chatbotName = 'Tawk.to'; }
        else if (html.includes('chat-widget')) { techStack.hasChatbot = true; techStack.chatbotName = 'Generic Widget'; }

        // Detect CMS
        if (html.includes('wp-content')) techStack.platform = 'WordPress';
        else if (html.includes('shopify')) techStack.platform = 'Shopify';
        else if (html.includes('wix.com')) techStack.platform = 'Wix';
        else if (html.includes('squarespace')) techStack.platform = 'Squarespace';
        else if (html.includes('__NEXT_DATA__')) techStack.platform = 'Next.js (React)';

        return NextResponse.json(techStack);

    } catch (error: any) {
        console.error('Tech Detective Error:', error);
        return NextResponse.json({ error: "Could not analyze tech stack" }, { status: 500 });
    }
}
