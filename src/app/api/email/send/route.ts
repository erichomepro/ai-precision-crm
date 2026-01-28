import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { to, subject, html, attachments } = body;

        // Use environment variables
        const user = process.env.GMAIL_USER || 'aiprecisionmarketing@gmail.com';
        const pass = process.env.GMAIL_PASS;

        if (!pass) {
            return NextResponse.json({ error: 'GMAIL_PASS not set in environment variables.' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass,
            },
        });

        const mailOptions = {
            from: `"AI Precision Agent" <${user}>`,
            to: to,
            subject: subject || "Partnership Opportunity",
            html: html || "<p>Hello, this is an automated outreach from The Hydra.</p>",
            attachments: attachments || [], // Support array of { filename, path, content }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Sent:', info.messageId);

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            preview: nodemailer.getTestMessageUrl(info)
        });

    } catch (error: any) {
        console.error('[Email] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
