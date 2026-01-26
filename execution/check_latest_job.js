const admin = require('firebase-admin');
// const serviceAccount = require('./service-account.json'); 

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'ai-precision-crm'
    });
}
const db = admin.firestore();

(async () => {
    try {
        const snapshot = await db.collection('jobs')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('No jobs found.');
            return;
        }

        snapshot.forEach(doc => {
            console.log('Latest Job ID:', doc.id);
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) {
        console.error('Error fetching jobs:', e);
    }
})();
