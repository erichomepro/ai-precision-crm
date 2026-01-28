'use server'

import { db } from '../../../lib/firebase_admin';
import { spawn } from 'child_process';
import path from 'path';

export async function launchScout(formData: FormData) {
    const query = formData.get('query') as string;
    const userId = formData.get('userId') as string; // NEW: Get userId

    if (!query) {
        return { success: false, message: 'Query is required' };
    }

    if (!userId) {
        return { success: false, message: 'User ID is required for isolation.' };
    }

    try {
        console.log(`[Server Action] Launching Scout for: ${query} (User: ${userId})`);

        // 1. Create Job in Firestore
        const jobRef = db.collection('jobs').doc();
        const jobId = jobRef.id;

        await jobRef.set({
            type: 'SCOUT',
            query: query,
            tenantId: userId, // KEY: Use userId as the scope/tenant
            userId: userId,   // Also explicit userId for clarity
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            isManual: true,
            engine: 'python_spawn'
        });

        // 2. Spawn Python Script
        // We need the absolute path to the execution folder
        const projectRoot = process.cwd();
        const scriptPath = path.join(projectRoot, 'execution', 'universal_scraper.py');

        console.log(`[Server Action] Spawning script at: ${scriptPath}`);

        // Spawn detached process so it keeps running even if the request finishes
        const pythonProcess = spawn('python', [scriptPath, query, userId, jobId], { // PASS userId
            cwd: projectRoot,
            detached: true,
            stdio: 'ignore' // or 'inherit' for debugging, but 'ignore' for detached
        });

        pythonProcess.unref(); // Allow Node to exit/continue without waiting for Python

        return {
            success: true,
            message: `Scout Launched! Job ID: ${jobId}`,
            jobId: jobId
        };

    } catch (error: any) {
        console.error("Launch Error:", error);
        return { success: false, message: error.message };
    }
}
