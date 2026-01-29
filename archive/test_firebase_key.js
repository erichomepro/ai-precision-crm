require('dotenv').config();
const axios = require('axios');

async function testKey() {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        console.error("No NEXT_PUBLIC_FIREBASE_API_KEY found in environment.");
        return;
    }

    console.log(`Testing API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);

    try {
        // We use a dummy sign-up request to test key validity
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            email: "test_key_validity@example.com",
            password: "temporary_password",
            returnSecureToken: true
        });
        console.log("✅ Success! The API Key is recognized by Google APIs.");
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            console.error(`❌ Error from Google APIs: ${error.response.data.error.message}`);
            if (error.response.data.error.message === "API_KEY_INVALID") {
                console.error("This confirms the key in your .env is LITERALLY invalid or has been revoked.");
            }
        } else {
            console.error("❌ Network or unknown error:", error.message);
        }
    }
}

testKey();
