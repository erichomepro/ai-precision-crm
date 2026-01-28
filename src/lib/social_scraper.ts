import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface SocialProfile {
    platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube' | 'unknown';
    url: string;
    followerCount?: string;
    lastPostDate?: string;
    isActive: boolean; // True if posted in last 30 days
}


// ... (existing imports)

export interface ContactDetails {
    emails: string[];
    phones: string[];
    keyNames: string[]; // Potential owners
    socials: SocialProfile[];
}

function debugLog(msg: string) {
    try {
        fs.appendFileSync(path.join(process.cwd(), 'headhunter_debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export async function scrapeContactDetails(websiteUrl: string, businessName?: string): Promise<ContactDetails> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const details: ContactDetails = { emails: [], phones: [], keyNames: [], socials: [] };

    debugLog(`Starting Scrape for: ${websiteUrl} (${businessName})`);

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Get Business Name from title if missing
        if (!businessName) {
            const title = await page.title();
            businessName = title.split('|')[0].split('-')[0].trim();
        }
        debugLog(`Business Name Resolved: ${businessName}`);

        // 1. Scrape Homepage Socials & Details
        const homeContent = await page.content();
        details.socials = await extractSocials(page);
        extractContactInfo(homeContent, details);

        // 2. Find Contact/About Page
        const links = await page.$$eval('a', (as: any[]) => as.map((a: any) => ({ href: a.href, text: a.innerText })));
        const contactLink = links.find(l => /contact|about|team/i.test(l.text) || /contact|about|team/i.test(l.href)); // check href too

        if (contactLink && contactLink.href.startsWith('http')) {
            debugLog(`Navigating to Internal Page: ${contactLink.href}`);
            try {
                await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
                const contactContent = await page.content();
                extractContactInfo(contactContent, details);


                // Owner Hunt (On-Page)
                const innerText = await page.$eval('body', (b: any) => b.innerText);
                const titleRegexes = [
                    /(?:Owner|Founder|President|CEO|Principal)\s*[:\-]?\s*([A-Z][a-z]+\s[A-Z][a-z]+)/i, // Title: Name
                    /([A-Z][a-z]+\s[A-Z][a-z]+)\s*[,-]?\s*(?:Owner|Founder|President|CEO|Principal)/i, // Name, Title
                    /Founded by ([A-Z][a-z]+\s[A-Z][a-z]+)/i // Founded by Name
                ];

                for (const regex of titleRegexes) {
                    let match;
                    // Reset regex if global? No, they are singular here.
                    // We need to loop through matches if global, but these are mostly finding the first clear one.
                    // Let's iterate the text for global matches using a helper or just RegExp execution.
                    // Simple approach: Match the first clear one.
                    const found = innerText.match(new RegExp(regex, 'g'));
                    if (found) {
                        for (const f of found) {
                            const m = f.match(regex);
                            if (m && m[1]) {
                                debugLog(`On-Page Match: ${m[1]}`);
                                if (!details.keyNames.includes(m[1]) && m[1].split(' ').length === 2) {
                                    // Filter garbage
                                    if (!['Contact Us', 'Our Team', 'Read More'].includes(m[1])) details.keyNames.push(m[1]);
                                }
                            }
                        }
                    }
                }
            } catch (err: any) {
                debugLog(`Internal Page Navigation Failed: ${err.message}`);
            }
        } else {
            debugLog("No Contact/About link found.");
        }

        // 3. Headhunter Search (If no owner found)
        if (details.keyNames.length === 0 && businessName) {
            debugLog(`No on-page owner. Starting Headhunter Search...`);

            // Strategy A: LinkedIn Specific
            let queries = [
                `site:linkedin.com "${businessName}" (Owner OR Founder OR CEO)`,
                `${businessName} owner name` // Broad fallback
            ];

            for (const query of queries) {
                if (details.keyNames.length > 0) break; // Found one? Stop.

                try {
                    debugLog(`Query: ${query}`);
                    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });

                    const results = await page.$$eval('div.g', (els: any[]) => els.slice(0, 5).map((e: any) => e.innerText));

                    for (const text of results) {
                        // Pattern 1: LinkedIn Title "Name - Title"
                        const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+) -/);
                        if (nameMatch && nameMatch[1]) {
                            const name = nameMatch[1];
                            const blacklist = ['Your Name', 'Business Owner', 'Profile', 'Linkedin', 'View The', 'Contact Us', 'Web Design', 'Our Team', 'Read More', 'Skip To'];
                            if (!blacklist.some(b => name.includes(b))) {
                                debugLog(`Headhunter Match (Title): ${name}`);
                                details.keyNames.push(name);
                            }
                        }
                        // Pattern 2: "Name is the owner"
                        const snippetMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+) is the (?:owner|founder|ceo|president|principal)/i);
                        if (snippetMatch && snippetMatch[1]) {
                            const name = snippetMatch[1];
                            if (!['This Business', 'The Owner'].includes(name)) {
                                debugLog(`Headhunter Match (Snippet): ${name}`);
                                details.keyNames.push(name);
                            }
                        }
                        // Pattern 3: "Owner: Name"
                        const colonMatch = text.match(/(?:Owner|Founder|Principal|CEO|President):\s*([A-Z][a-z]+ [A-Z][a-z]+)/i);
                        if (colonMatch && colonMatch[1]) {
                            const name = colonMatch[1];
                            const blacklist = ['Contact', 'Email', 'Phone', 'Address', 'Copyright', 'All Rights'];
                            if (!blacklist.some(b => name.includes(b))) {
                                debugLog(`Headhunter Match (Colon): ${name}`);
                                details.keyNames.push(name);
                            }
                        }
                    }
                } catch (searchErr: any) {
                    debugLog(`Headhunter Search Failed: ${searchErr.message}`);
                }
            }
        }

    } catch (e: any) {
        debugLog(`Main Loop Failed: ${e.message}`);
    } finally {
        await browser.close();
    }

    // Dedupe
    details.emails = [...new Set(details.emails)];
    details.phones = [...new Set(details.phones)];
    details.keyNames = [...new Set(details.keyNames)];

    debugLog(`Final Contact Details: ${JSON.stringify(details)}`);
    return details;
}

function extractContactInfo(html: string, details: ContactDetails) {
    // Emails
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
    const foundEmails = html.match(emailRegex) || [];
    details.emails.push(...foundEmails);

    // Phones (North America format primarily)
    const phoneRegex = /(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
    const foundPhones = html.match(phoneRegex) || [];
    details.phones.push(...foundPhones.map(p => p.trim()));
}

async function extractSocials(page: any): Promise<SocialProfile[]> {
    const hrefs = await page.$$eval('a', (anchors: any[]) => anchors.map((a: any) => a.href));
    const uniqueLinks = new Set(hrefs);
    const profiles: SocialProfile[] = [];

    for (const link of uniqueLinks as any) {
        if (typeof link !== 'string') continue;
        if (link.includes('facebook.com') && !link.includes('sharer')) profiles.push({ platform: 'facebook', url: link, isActive: false });
        else if (link.includes('instagram.com')) profiles.push({ platform: 'instagram', url: link, isActive: false });
        else if (link.includes('linkedin.com') && (link.includes('/company/') || link.includes('/in/'))) profiles.push({ platform: 'linkedin', url: link, isActive: false });
        else if (link.includes('twitter.com') || link.includes('x.com')) profiles.push({ platform: 'twitter', url: link, isActive: false });
    }
    return profiles;
}

// Keep existing function signature for backward compatibility if needed, or replace it.
// To avoid breaking existing imports, we will keep scrapeSocialPresence as a wrapper or alias if widely used,
// but the instruction says "replace content", so I will replace the logic.
// However, the original file only exported `scrapeSocialPresence`. 
// I will keep `scrapeSocialPresence` but redirect it to use the new logic logic/return style or just make it return socials.
export async function scrapeSocialPresence(websiteUrl: string): Promise<SocialProfile[]> {
    const details = await scrapeContactDetails(websiteUrl);
    return details.socials;
}

