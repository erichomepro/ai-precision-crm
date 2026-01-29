const { auditWebsite, googleSearch } = require('../src/lib/seo_auditor');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Mock browser environment for TS import workaround or just run raw logic if possible
// Ideally we run the TS file using ts-node but we can't easily here.
// Instead, I will rewrite the logic in this JS script for quick testing of the Model and Search.

try {
    if (fs.existsSync('.env.local')) {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').map(l => l.split('=')).forEach(([k, v]) => {
            if (k && v) process.env[k.trim()] = v.trim().replace(/"/g, '');
        });
    }
} catch (e) { }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testSeoflow() {
    console.log("Testing SEO Auditor Flow...");

    // 1. Test AI Model Name
    console.log("1. Testing AI Model: gemini-2.0-flash");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const res = await model.generateContent("Test");
        console.log("AI 2.0-flash Success:", res.response.text());
    } catch (e) {
        console.error("AI 2.0-flash FAILED:", e.message);
    }

    console.log("2. Testing AI Model: gemini-2.0-flash-exp");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const res = await model.generateContent("Test");
        console.log("AI 2.0-flash-exp Success:", res.response.text());
    } catch (e) {
        console.error("AI 2.0-flash-exp FAILED:", e.message);
    }
}

testSeoflow();
