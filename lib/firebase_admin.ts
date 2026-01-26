import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-precision-crm' // Fallback or env
    });
}

const db = admin.firestore();

export { db, admin };
