const axios = require('axios'); // Utilizing the same library as the API
const cheerio = require('cheerio');

async function testScraper(url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    console.log(`Testing Scraper against: ${url}`);

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        console.log("1. Attempting Fetch...");
        const response = await axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000,
            validateStatus: status => status < 500
        });

        console.log(`   Status: ${response.status}`);
        console.log(`   Data Length: ${response.data.length}`);

        console.log("2. Parsing HTML...");
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        console.log(`   Title Found: "${title}"`);

        const h1s = $('h1').map((i, el) => $(el).text()).get();
        console.log(`   H1s Found: ${h1s.join(', ')}`);

    } catch (error) {
        console.error("FAIL:", error.message);
        if (error.response) {
            console.error("   Response Status:", error.response.status);
            console.error("   Response Data:", error.response.data.substring(0, 200));
        }
    }
}

// Default to the one encountered earlier
testScraper(process.argv[2] || 'trimlineofparkland.com');
