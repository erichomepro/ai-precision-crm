import { NextResponse } from 'next/server';
import { db, admin } from '../../../../../lib/firebase_admin'; // Switched to admin

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, userId, ...dna } = body; // NEW: Get userId

        if (!dna || !dna.name) {
            return NextResponse.json({ error: "Invalid Brand DNA data" }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "User ID is required for isolation." }, { status: 401 });
        }

        const payload: any = {
            ...dna,
            userId, // KEY: Associate with User
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'Brand Analyst AI',
        };

        if (!id) {
            payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        if (id) {
            const docRef = db.collection("brands").doc(id);
            await docRef.update(payload);
            return NextResponse.json({
                success: true,
                id: id,
                action: 'updated'
            });
        } else {
            const docRef = await db.collection("brands").add(payload);
            return NextResponse.json({
                success: true,
                id: docRef.id,
                action: 'created'
            });
        }

    } catch (error: any) {
        console.error("Save Brand Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
