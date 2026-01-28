const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Manual .env.local parsing
try {
    if (fs.existsSync('.env.local')) {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && !line.trim().startsWith('#')) {
                process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
    }
} catch (e) { }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
    try {
        // There isn't a direct listModels method exposed nicely in the high level SDK sometimes, 
        // but we can try a basic generation to see if it fails with a list.
        // Actually, the error message itself suggests "Call ListModels".
        // Unfortunately the Node SDK wraps the REST API.
        // We will try 2.0-flash-exp first as a test.

        console.log("Testing Gemini Models...");
        const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-pro"];

        for (const m of models) {
            process.stdout.write(`Testing ${m}... `);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello?");
                const response = await result.response;
                console.log(`SUCCESS!`);
            } catch (e) {
                console.log(`FAILED: ${e.message.split(':')[0]}`);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

listModels();
