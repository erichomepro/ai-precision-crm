
import puppeteer from 'puppeteer';

async function scrapeSkills() {
    console.log("Launching custom browser...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Safety args for root
    });
    const page = await browser.newPage();

    try {
        console.log("Navigating to repo...");
        // Going to the file list view
        await page.goto('https://github.com/sickn33/antigravity-awesome-skills', { waitUntil: 'networkidle0' });

        // Extract file names (skills are likely folders)
        const items = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.react-directory-row'));
            return rows.map(row => {
                const nameLink = row.querySelector('h3 a, a.Link--primary');
                const typeIcon = row.querySelector('svg[aria-label="Directory"]');
                return {
                    name: nameLink?.textContent?.trim(),
                    isFolder: !!typeIcon,
                    href: nameLink?.getAttribute('href')
                };
            }).filter(i => i.name && i.isFolder); // Only list folders/skills
        });

        console.log(`\nFound ${items.length} Potential Skills:`);
        items.forEach(i => console.log(`- ${i.name}`));

        // Also try to get README content
        const readme = await page.evaluate(() => {
            const article = document.querySelector('article');
            return article ? article.innerText.substring(0, 1000) + "..." : "No README found";
        });

        console.log("\n--- README PREVIEW ---");
        console.log(readme);

    } catch (e) {
        console.error("Scrape failed:", e);
    } finally {
        await browser.close();
    }
}

scrapeSkills();
