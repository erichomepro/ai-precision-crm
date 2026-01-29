
import axios from 'axios';

async function testBlogApi() {
    const topic = "AI Agents in 2025";
    console.log(`[Doctor] Testing Blog API with topic: "${topic}"...`);

    try {
        const response = await axios.post('http://localhost:3000/api/marketing/autonomous-blog', {
            topic: topic
        }, {
            timeout: 60000 // 60s timeout
        });

        console.log("[Doctor] Status Code:", response.status);
        console.log("[Doctor] Full Response Data:");
        console.dir(response.data, { depth: null, colors: true });

        if (response.data.success && response.data.stage === 'brief') {
            console.log("✅ API PASS: Brief generated successfully.");
        } else {
            console.log("❌ API FAIL: Semantic check failed.");
        }

    } catch (error: any) {
        console.error("❌ API CRASH:", error.message);
        if (error.response) {
            console.error("Error Data:", error.response.data);
        }
    }
}

testBlogApi();
