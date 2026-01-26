
const https = require('https');
const fs = require('fs');
const path = require('path');

// Minimal .env parser
function loadEnv() {
    const files = ['.env.local', '.env'];
    files.forEach(file => {
        try {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
                console.log(`Loading ${file}...`);
                const envFile = fs.readFileSync(envPath, 'utf8');
                envFile.split('\n').forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value && !process.env[key.trim()]) {
                        process.env[key.trim()] = value.trim();
                    }
                });
            }
        } catch (e) {
            // ignore
        }
    });
}

loadEnv();

const key = process.env.GEMINI_API_KEY;

if (!key) {
    console.error("Error: GEMINI_API_KEY not found in environment or .env file.");
    process.exit(1);
}

console.log("Checking available models for key: " + key.substring(0, 5) + "...");

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error.message);
            } else if (json.models) {
                console.log("\nAvailable Models:");
                json.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
            } else {
                console.log("Unexpected response:", data);
            }
        } catch (e) {
            console.error("Failed to parse JSON:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request Error:", e.message);
});
