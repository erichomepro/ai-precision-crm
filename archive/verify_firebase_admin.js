
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function testFirebase() {
    console.log("Testing Firebase Admin Connection...");
    const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

    if (!fs.existsSync(keyPath)) {
        console.error("FAIL: serviceAccountKey.json not found at", keyPath);
        process.exit(1);
    }

    try {
        const serviceAccount = require(keyPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        console.log("Initialized SDK. Attempting to read 'brands' collection...");

        const snapshot = await db.collection('brands').limit(1).get();
        console.log(`SUCCESS! Found ${snapshot.size} brands.`);

        process.exit(0);
    } catch (e) {
        console.error("FAIL:", e);
        process.exit(1);
    }
}

testFirebase();
