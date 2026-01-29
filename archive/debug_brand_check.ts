
import { db } from '../lib/firebase_client';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function checkBrand() {
    console.log("Checking brand data for aiprecisionmarketing.ca...");
    try {
        // Try exact match or partial
        const q = query(collection(db, "brands"), where("website", ">=", "https://www"));
        const snapshot = await getDocs(q);

        console.log(`Found ${snapshot.size} brands.`);

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.website.includes("aiprecision")) {
                console.log(`\n--- Brand Found: ${doc.id} ---`);
                console.log(`Name: ${data.name}`);
                console.log(`Website: ${data.website}`);
                console.log(`Business Overview: ${data.business_overview ? data.business_overview.substring(0, 50) + "..." : "MISSING"}`);
                console.log(`Knowledge Base:`, data.knowledge_base);
                console.log(`Design System Logo:`, data.design_system?.logo);
                // console.log(`Full Data:`, JSON.stringify(data, null, 2));
            }
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

checkBrand();
