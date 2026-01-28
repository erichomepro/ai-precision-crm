const fetch = require('node-fetch'); // Or native fetch in newer node

async function testVideo() {
    try {
        console.log("Testing API...");
        const res = await fetch('http://localhost:3000/api/marketing/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        const text = await res.text();
        console.log("Status:", res.status);
        try {
            const json = JSON.parse(text);
            console.log("JSON Response:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("Raw Response:", text);
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testVideo();
