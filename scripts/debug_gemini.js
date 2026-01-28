const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

async function testGemini() {
    try {
        console.log("Checking API Key...");

        // Load from .env.local manually for this script
        let key = process.env.GEMINI_API_KEY;
        if (!key) {
            try {
                const envPath = path.join(__dirname, '..', '.env.local');
                const envContent = fs.readFileSync(envPath, 'utf8');
                const match = envContent.match(/GEMINI_API_KEY=(.*)/);
                if (match) key = match[1].trim();
            } catch (err) {
                console.log("Could not read .env.local");
            }
        }

        if (!key) {
            console.error("❌ GEMINI_API_KEY is missing from environment and .env.local.");
            return;
        }
        console.log("Key present (starts with " + key.substring(0, 4) + ")");

        const genAI = new GoogleGenerativeAI(key);

        const modelsToTest = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];

        for (const modelName of modelsToTest) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Say hello");
                const response = await result.response;
                console.log(`✅ ${modelName} Success:`, response.text().trim());
            } catch (e) {
                console.error(`❌ ${modelName} Failed:`, e.message.split('\n')[0]);
            }
        }

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

testGemini();
