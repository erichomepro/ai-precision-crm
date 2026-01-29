import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/firebase_admin';

// Modal Webhook URL (Cloud Scraper)
const MODAL_WEBHOOK_URL = "https://lisac-ai-precision-crm-scout-scout-webhook.modal.run";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, tenantId } = body;

        if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

        // 1. Create Job in Firestore (Pending)
        const jobRef = await db.collection('jobs').add({
            type: 'SCOUT',
            query: query,
            tenantId: tenantId || 'default',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            logs: []
        });

        const jobId = jobRef.id;
        console.log(`[API] Job Created: ${jobId}`);

        // 2. Trigger Cloud Scraper (Modal)
        console.log(`[API] Triggering Cloud Scraper at: ${MODAL_WEBHOOK_URL}`);

        // Fire and forget (or await acknowledgement)
        const response = await fetch(MODAL_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                tenantId: tenantId || 'default',
                jobId: jobId
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Modal Webhook Failed: ${response.status} ${errText}`);
        }

        return NextResponse.json({
            success: true,
            jobId: jobId,
            message: 'Scout deployed to Cloud (Modal).'
        });

    } catch (error: any) {
        console.error('[API] Scout Trigger Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
