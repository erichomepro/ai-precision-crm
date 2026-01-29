'use server'

import { db } from '../../../lib/firebase_admin';

// Modal Webhook URL (Cloud Scraper)
const MODAL_WEBHOOK_URL = "https://erichomepro-ai-precision-crm-scout-scout-webhook.modal.run";

export async function launchScout(formData: FormData) {
    const query = formData.get('query') as string;
    const userId = formData.get('userId') as string;

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
            tenantId: userId,
            userId: userId,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            isManual: true,
            engine: 'modal_cloud' // Updated engine name
        });

        // 2. Trigger Cloud Scraper (Modal)
        console.log(`[Server Action] Triggering Cloud Scraper at: ${MODAL_WEBHOOK_URL}`);

        try {
            const response = await fetch(MODAL_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    tenantId: userId, // Pass userId as tenantId for context
                    jobId: jobId
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Log but don't crash the user UI, returning success as job is queued
                console.error(`[Server Action] Modal Webhook Error: ${response.status} ${errText}`);

                // Update job status to failed if immediate connection fails
                await jobRef.update({ status: 'FAILED', error: `Webhook Error: ${errText}` });
                return { success: false, message: `Could not start cloud agent: ${response.statusText}` };
            }
        } catch (netError: any) {
            console.error(`[Server Action] Network Error calling Modal: ${netError.message}`);
            await jobRef.update({ status: 'FAILED', error: `Network Error: ${netError.message}` });
            return { success: false, message: `Cloud connection failed: ${netError.message}` };
        }

        return {
            success: true,
            message: `Scout Launched! Job ID: ${jobId} (Cloud)`,
            jobId: jobId
        };

    } catch (error: any) {
        console.error("Launch Error:", error);
        return { success: false, message: error.message };
    }
}
