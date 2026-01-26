import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { db } from '../../../../../lib/firebase_admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, tenantId } = body;

        if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

        // 1. Create Job
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

        // 2. Spawn Scraper (Node Engine - maps_scraper.js)
        const scriptPath = path.join(process.cwd(), 'execution', 'maps_scraper.js');
        const logPath = path.join(process.cwd(), 'scout_launch.log');

        console.log(`[API] Spawning Node: ${scriptPath} "${query}"`);

        // Robust Logging
        let stdioConfig: any = 'ignore';
        try {
            const fs = require('fs');
            const out = fs.openSync(logPath, 'a');
            const err = fs.openSync(logPath, 'a');
            stdioConfig = ['ignore', out, err];
        } catch (e) {
            console.error('[API] Log file open failed, using ignore:', e);
        }

        const scraperProcess = spawn(process.execPath, [scriptPath, query, tenantId || 'default', jobId], {
            cwd: process.cwd(),
            detached: true,
            stdio: stdioConfig
        });

        scraperProcess.unref();

        return NextResponse.json({
            success: true,
            jobId: jobId,
            message: 'Scout deployed (Node.js).'
        });

    } catch (error: any) {
        console.error('[API] Spawn failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
