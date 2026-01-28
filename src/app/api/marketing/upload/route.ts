import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload dir exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Generate unique name
        const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const filePath = path.join(uploadDir, uniqueName);

        await writeFile(filePath, buffer);

        // Return public URL
        const publicUrl = `/uploads/${uniqueName}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: file.name
        });

    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
