
const fs = require('fs');

try {
    const raw = fs.readFileSync('skills_list.txt');
    // Try to detect encoding or just convert to string. 
    // PowerShell > often creates UTF-16LE (2 bytes per char).
    // If it starts with BOM (FF FE), it's UTF-16LE.

    let content = "";
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8'); // Fallback
    }

    console.log("--- START LIST ---");
    console.log(content.substring(0, 5000)); // Print first 5k chars to verify
    console.log("--- END LIST ---");
} catch (e) {
    console.error("Read failed:", e);
}
