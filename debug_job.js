const admin = require('firebase-admin');
const fs = require('fs');

// Init Firebase
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        // Fallback to default if no key file (ADC)
        admin.initializeApp({
            projectId: 'ai-precision-crm'
        });
    }
}
const db = admin.firestore();

async function checkLatestJob() {
    console.log("Checking latest job...");
    const jobsRef = db.collection('jobs');
    const q = jobsRef.orderBy('createdAt', 'desc').limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log("No jobs found.");
        return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log(`Job ID: ${doc.id}`);
    console.log(`Status: ${data.status}`);
    if (data.error) console.log(`ERROR FIELD: ${data.error}`);
    console.log(`Query: ${data.query}`);
    console.log(`Created At: ${data.createdAt}`);
    console.log(`Logs:`);
    if (data.logs && data.logs.length) {
        data.logs.slice(-5).forEach(log => console.log(` - [${log.time}] ${log.msg}`));
    } else {
        console.log(" - No logs yet.");
    }
}

checkLatestJob().catch(console.error);
