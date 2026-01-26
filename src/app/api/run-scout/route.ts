import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, tenantId } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const jobId = `scout-${Date.now()}`;
        const scraperPath = path.join(process.cwd(), 'execution', 'maps_scraper.js');
        const logPath = path.join(process.cwd(), 'scout_launch.log');

        console.log(`[API] Launching Scout Job: ${jobId}`);
        console.log(`[API] CWD: ${process.cwd()}`);
        console.log(`[API] Node: ${process.execPath}, Script: ${scraperPath}`);

        // Open log file for detached process (Robust)
        let stdioConfig: any = 'ignore';
        try {
            const out = fs.openSync(logPath, 'a');
            const err = fs.openSync(logPath, 'a');
            stdioConfig = ['ignore', out, err];
        } catch (filesErr) {
            console.error('[API] Failed to open log file, falling back to ignore:', filesErr);
        }

        // Spawn detached process using absolute Node path
        const child = spawn(process.execPath, [scraperPath, query, tenantId || 'default', jobId], {
            detached: true,
            stdio: stdioConfig
        });

        child.unref();

        return NextResponse.json({
            success: true,
            message: 'Scout mission launched in background.',
            jobId: jobId
        });

    } catch (error: any) {
        console.error('[API] Scraper launch failed:', error);
        return NextResponse.json({ error: 'Scout launch failed', details: error.message }, { status: 500 });
    }
}
