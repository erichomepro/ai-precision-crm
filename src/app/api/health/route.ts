import { NextResponse } from 'next/server';
import { db as adminDb } from '../../../../lib/firebase_admin';

export async function GET() {
    const startTime = performance.now();
    const healthData: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        services: {}
    };

    try {
        // 1. Database Check
        const dbStart = performance.now();
        await adminDb.collection('leads').limit(1).get();
        const dbLatency = Math.round(performance.now() - dbStart);

        healthData.services.database = {
            status: 'connected',
            latency: `${dbLatency}ms`
        };
    } catch (e: any) {
        healthData.status = 'degraded';
        healthData.services.database = {
            status: 'error',
            error: e.message
        };
    }

    // 2. Compute Runtime Stats
    healthData.uptime = process.uptime();
    healthData.total_latency = `${Math.round(performance.now() - startTime)}ms`;

    const status = healthData.status === 'healthy' ? 200 : 500;
    return NextResponse.json(healthData, { status });
}
