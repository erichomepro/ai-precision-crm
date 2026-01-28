import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { content, platforms, imageUrl, scheduledAt } = await req.json();

        // 1. Basic Validation
        if (!content || (typeof content !== 'object' && typeof content !== 'string') && !imageUrl) {
            return NextResponse.json({ error: "Post must have content or an image" }, { status: 400 });
        }

        // Ensure content is an object for Make.com if string provided (fallback)
        const finalContent = typeof content === 'string' ? { default: content } : content;

        if (!platforms || platforms.length === 0) {
            return NextResponse.json({ error: "At least one platform is required" }, { status: 400 });
        }

        // 2. Webhook Configuration
        // Ideally this comes from process.env, but for now we'll allow a fallback or placeholder
        const webhookUrl = process.env.MAKE_WEBHOOK_URL;

        if (!webhookUrl) {
            console.warn("[Social Schedule] MAKE_WEBHOOK_URL is not defined in environment variables.");
            // For now, we simulate success so the UI can be tested without the active webhook
            return NextResponse.json({
                success: true,
                message: "Simulated schedule: Webhook not configured.",
                data: { content: finalContent, platforms, scheduledAt }
            });
        }

        // 3. Send to Make.com
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: finalContent, // Sending the full object (linkedin, twitter, etc.)
                platforms,
                imageUrl,
                scheduledAt: scheduledAt || new Date().toISOString(),
                source: "Ai Precision CRM"
            })
        });

        if (!response.ok) {
            throw new Error(`Make.com webhook failed: ${response.statusText}`);
        }

        return NextResponse.json({ success: true, message: "Request sent to deployment pipeline" });

    } catch (error: any) {
        console.error("[Social Schedule Error]:", error);
        return NextResponse.json({ error: error.message || "Scheduling failed" }, { status: 500 });
    }
}
