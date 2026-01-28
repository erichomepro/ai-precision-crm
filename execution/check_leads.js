const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'ai-precision-crm'
    });
}
const db = admin.firestore();

(async () => {
    try {
        const snapshot = await db.collection('leads')
            .orderBy('scoutedAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('No leads found.');
            return;
        }

        snapshot.forEach(doc => {
            console.log('Latest Lead:', JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) {
        console.error('Error fetching leads:', e);
    }
})();
