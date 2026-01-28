
import { db } from '../src/lib/constants'; // Trying to find a valid export. 
// Actually lets just re-init firebase cleanly in this script to be sure
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function main() {
    console.log("Checking Brands in Project:", firebaseConfig.projectId);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const snapshot = await getDocs(collection(db, "brands"));
    if (snapshot.empty) {
        console.log("No brands found.");
    } else {
        console.log(`Found ${snapshot.size} brands:`);
        snapshot.forEach(doc => {
            const d = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`   URL: "${d.website}"`);
            console.log(`   Name: "${d.name}"`);
            console.log("---");
        });
    }
}

main().catch(console.error);
