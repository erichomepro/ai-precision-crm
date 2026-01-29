
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with application default credentials (works if GOOGLE_APPLICATION_CREDENTIALS is set)
// Or reuse existing config logic.
// Since we are in the project root, we can try to use the project's firebase_admin lib if compiling TS, 
// but a standalone JS script is safer/faster for debug.

// We need the service account. It's in .env.local usually.
require('dotenv').config({ path: '.env.local' });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore();

async function checkJob(jobId) {
    console.log(`Checking Job: ${jobId}`);
    const doc = await db.collection('jobs').doc(jobId).get();
    if (!doc.exists) {
        console.log("Job not found!");
    } else {
        console.log("Job Data:", JSON.stringify(doc.data(), null, 2));
    }
}

const jobId = process.argv[2];
if (jobId) {
    checkJob(jobId).catch(console.error);
} else {
    console.log("Please provide Job ID");
}
