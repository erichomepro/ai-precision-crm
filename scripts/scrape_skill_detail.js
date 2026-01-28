
const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeSkillContent(skillName) {
    console.log(`Scraping content for ${skillName}...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // Guessing the file structure. Usually SKILL.md or README.md
        // The tree view won't show content directly. 
        // We'll go to the folder and find the .md file.
        const folderUrl = `https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/${skillName}`;
        await page.goto(folderUrl, { waitUntil: 'networkidle0' });

        const mdFileLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            // prioritize SKILL.md, then README.md
            const skill = links.find(a => a.innerText === 'SKILL.md');
            if (skill) return skill.href;
            const readme = links.find(a => a.innerText === 'README.md');
            return readme ? readme.href : null;
        });

        if (!mdFileLink) {
            console.log("No MD file found in folder.");
            return;
        }

        console.log(`Found file: ${mdFileLink}`);
        await page.goto(mdFileLink, { waitUntil: 'networkidle0' });

        // Extract raw content
        // GitHub displays markdown in an <article> tag usually.
        const content = await page.evaluate(() => {
            const article = document.querySelector('article');
            return article ? article.innerText : "No article content";
        });

        console.log("--- CONTENT START ---");
        console.log(content.substring(0, 500)); // Preview
        console.log("... (saving full content) ...");

        fs.writeFileSync(`${skillName}.md`, content, 'utf8');
        console.log(`Saved to ${skillName}.md`);

    } catch (e) {
        console.error("Scrape failed:", e);
    } finally {
        await browser.close();
    }
}

scrapeSkillContent('systematic-debugging');
