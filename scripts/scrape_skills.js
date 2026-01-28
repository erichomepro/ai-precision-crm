
const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeSkills() {
    console.log("Launching custom browser (JS)...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const targetUrl = 'https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills';
        console.log(`Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });

        // Extract links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => href.includes('/sickn33/antigravity-awesome-skills/tree/main/skills/'))
                .filter(href => !href.endsWith('/.github') && !href.endsWith('/assets'));
        });

        const uniqueLinks = [...new Set(links)];
        console.log(`\nFound ${uniqueLinks.length} skills. Saving...`);

        const content = uniqueLinks.map(l => {
            const name = l.split('/').pop();
            return `- ${name}  [${l}]`;
        }).join('\n');

        fs.writeFileSync('skills_list_clean.txt', content, 'utf8');
        console.log("Saved list to skills_list_clean.txt");

    } catch (e) {
        console.error("Scrape failed:", e);
    } finally {
        await browser.close();
    }
}

scrapeSkills();
