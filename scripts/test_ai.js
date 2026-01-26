const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAI() {
    console.log("Testing Gemini API...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_KEY_HERE");
        console.log("Initialized client.");

        if (!process.env.GEMINI_API_KEY) {
            console.log("NO GEMINI_API_KEY FOUND IN ENV (Process env)");
            // We can't really test without a key, but at least the imports worked.
            return;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, world!");
        console.log("Response:", result.response.text());
        console.log("SUCCESS");
    } catch (e) {
        console.error("FAIL:", e);
    }
}

testAI();
