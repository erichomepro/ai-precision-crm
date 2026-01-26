
const { db } = require('../src/lib/firebase_admin');

async function checkLatestLead() {
    console.log("Fetching latest lead...");
    const snapshot = await db.collection('leads')
        .orderBy('SeoAudit.timestamp', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log("No leads found with SEO Audit data.");

        // Fallback to just last updated lead
        const fallback = await db.collection('leads')
            .orderBy('scoutedAt', 'desc')
            .limit(1)
            .get();

        if (!fallback.empty) {
            console.log("Latest Lead (No Audit):", JSON.stringify(fallback.docs[0].data(), null, 2));
        }
        return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log(`Lead ID: ${doc.id}`);
    console.log(`Business: ${data.BusinessName}`);
    console.log(`URL: ${data.Website}`);
    console.log("SEO Audit Data:");
    console.log(JSON.stringify(data.SeoAudit, null, 2));

    console.log("\nSocial Data:");
    console.log(JSON.stringify(data.Social, null, 2));
}

checkLatestLead().catch(console.error);
