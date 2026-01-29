const fs = require('fs');
const https = require('https');

function getApiKey() {
    try {
        const content = fs.readFileSync('.env', 'utf8');
        const match = content.match(/NEXT_PUBLIC_FIREBASE_API_KEY\s*=\s*([^\s]+)/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

async function testKey() {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("No NEXT_PUBLIC_FIREBASE_API_KEY found in .env.");
        return;
    }

    console.log(`Testing API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);

    const data = JSON.stringify({
        email: "test_key_validity_" + Date.now() + "@example.com",
        password: "temporary_password",
        returnSecureToken: true
    });

    const options = {
        hostname: 'identitytoolkit.googleapis.com',
        port: 443,
        path: `/v1/accounts:signUp?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
            const resp = JSON.parse(body);
            if (res.statusCode === 200) {
                console.log("✅ Success! The API Key is recognized by Google APIs.");
            } else {
                console.error(`❌ Error (${res.statusCode}): ${resp.error ? resp.error.message : body}`);
                if (resp.error && resp.error.message === "API_KEY_INVALID") {
                    console.error("This confirms the key in your .env is LITERALLY invalid or has been revoked.");
                }
            }
        });
    });

    req.on('error', (e) => {
        console.error("❌ Network error:", e.message);
    });

    req.write(data);
    req.end();
}

testKey();
