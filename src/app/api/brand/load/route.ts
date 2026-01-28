import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/firebase_admin'; // Switched to admin

export async function POST(req: Request) {
    try {
        const { url, id, userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required for isolation." }, { status: 401 });
        }

        if (!url && !id) {
            return NextResponse.json({ error: "URL or ID required" }, { status: 400 });
        }

        let brandData = null;
        let brandId = null;

        if (id) {
            console.log(`[DEBUG] Loading by ID: '${id}' for User: ${userId}`);
            const docRef = db.collection('brands').doc(id);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                // VERIFY OWNER
                if (data?.userId === userId) {
                    console.log(`[DEBUG] Found doc for ID: '${id}'`);
                    brandData = data;
                    brandId = docSnap.id;
                } else {
                    console.log(`[SECURITY] User ${userId} tried to access unauthorized brand ${id}`);
                    return NextResponse.json({ error: "Unauthorized access to brand" }, { status: 403 });
                }
            } else {
                console.log(`[DEBUG] NO doc found for ID: '${id}'`);
            }
        } else if (url) {
            console.log(`Loading brand by URL: '${url}'`);

            // Try exact match first
            let querySnapshot = await db.collection('brands')
                .where("website", "==", url)
                .where("userId", "==", userId)
                .get();

            // If failed, try normalized (trim trailing slash)
            if (querySnapshot.empty && url.endsWith('/')) {
                const trimmed = url.slice(0, -1);
                console.log(`Trying trimmed URL: '${trimmed}'`);
                querySnapshot = await db.collection('brands')
                    .where("website", "==", trimmed)
                    .where("userId", "==", userId)
                    .get();
            }

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                brandData = doc.data();
                brandId = doc.id;
                console.log(`Found brand: ${brandId}`);
            } else {
                console.log("No matching brand found.");
            }
        }

        if (!brandData) {
            return NextResponse.json({ success: false, error: "Brand not found" }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            data: brandData,
            id: brandId
        });

    } catch (error: any) {
        console.error("Load Brand Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
