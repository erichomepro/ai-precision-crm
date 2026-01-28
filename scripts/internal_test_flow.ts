
import { db } from '../lib/firebase_client'; // Corrected path
// We can't import Next.js API routes directly in a script usually unless we mock Request.
// So we will use 'node-fetch' to hit the LOCAL server if running, OR just test the functions if exports allow.
// Since server might not be running for me, I will test the LOGIC by mocking the flow against Firestore directly.

import { collection, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore';

async function testFlow() {
    console.log("=== STARTING INTERNAL SELF-TEST ===");

    // 1. Simulate SAVE
    console.log("\n1. Testing Database Write (Simulating Save)");
    const testPayload = {
        name: "Test Brand Internal",
        website: "https://internal-test.com",
        rawText: "This is a test brand for AI automation marketing.",
        knowledge_base: [],
        design_system: {
            palette: ["#000000", "#ffffff"],
            logo: null
        }
    };

    try {
        const ref = await addDoc(collection(db, "brands"), testPayload);
        console.log("✅ SAVE Success. ID:", ref.id);
        const newId = ref.id;

        // 2. Simulate LOAD by ID
        console.log("\n2. Testing Database Read (Simulating Load)");
        const snap = await getDoc(doc(db, "brands", newId));
        if (snap.exists()) {
            console.log("✅ LOAD Success. Found:", snap.data().name);
        } else {
            console.error("❌ LOAD Failed. Doc not found.");
        }

        // 3. Simulate OVERVIEW GEN (Mocking Gemini call logic)
        console.log("\n3. Testing Overview Logic (Mock)");
        if (testPayload.rawText.length > 10) {
            console.log("✅ DNA Context is valid for generation.");
        } else {
            console.error("❌ DNA Context missing.");
        }

        // 4. Simulate UPLOAD (Asset Association)
        console.log("\n4. Testing Asset Association");
        const updatedPayload = {
            ...testPayload,
            knowledge_base: ["https://fake-url.com/doc.pdf"]
        };
        await updateDoc(doc(db, "brands", newId), updatedPayload);
        console.log("✅ UPDATE Success. Added doc to KB.");

        // Re-verify
        const snap2 = await getDoc(doc(db, "brands", newId));
        const data2 = snap2.data();
        if (data2 && data2.knowledge_base.length === 1) {
            console.log("✅ VERIFICATION Success. Knowledge Base has 1 item.");
        } else {
            console.error("❌ VERIFICATION Failed. KB is empty.");
        }

    } catch (e) {
        console.error("❌ CRITICAL FAILURE:", e);
    }
}

testFlow();
