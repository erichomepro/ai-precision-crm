import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

    // 1. Local Development (Service Account File)
    if (fs.existsSync(serviceAccountPath)) {
        console.log("Initializing Firebase Admin with Service Account (Local)");
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error("Local Service Account Error:", error);
        }
    }
    // 2. Production / Cloud (Environment Variables)
    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log("Initializing Firebase Admin with Environment Variables (Production)");
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Handle Vercel's multiline string nuances
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        } catch (error) {
            console.error("Environment Variable Init Error:", error);
        }
    }
    // 3. Fallback (GCP Defaults)
    else {
        console.log("Initializing Firebase Admin with Application Default Credentials");
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-precision-crm'
        });
    }
}

const db = admin.firestore();

export { db, admin };
