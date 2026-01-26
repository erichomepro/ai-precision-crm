const admin = require('firebase-admin');
const { spawn } = require('child_process');
const fs = require('fs');

// Manual .env.local parsing (No dependencies needed)
try {
    if (fs.existsSync('.env.local')) {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && !line.trim().startsWith('#')) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (key) process.env[key] = val;
            }
        });
    }
} catch (e) { console.error('Error loading .env.local manually', e); }

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-precision-crm'
    });
}
const db = admin.firestore();

(async () => {
    console.log('🚀 Initializing Manual Scout Launch...');

    try {
        // 1. Create a REAL Job Document
        const jobRef = await db.collection('jobs').add({
            type: 'SCOUT',
            query: 'Baker Stony Plain',
            tenantId: 'beast_mode',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            isManual: true,
            logs: []
        });

        console.log(`✅ Job Created via Firestore. ID: ${jobRef.id}`);
        console.log('🤖 Spawning Scraper...');

        // 2. Spawn the Scraper with this REAL ID
        // Quote the query so it is treated as one argument by the shell
        const scraper = spawn('node', ['execution/maps_scraper.js', '"Baker Stony Plain"', 'beast_mode', jobRef.id], {
            stdio: 'inherit', // Pipe output to console so user sees it
            shell: true
        });

        scraper.on('close', (code) => {
            console.log(`\n✨ Mission Complete. Exit Code: ${code}`);
            console.log(`👉 Check Dashboard for Job ID: ${jobRef.id}`);
            process.exit(code);
        });

    } catch (error) {
        console.error('❌ Failed to create job:', error);
    }
})();
