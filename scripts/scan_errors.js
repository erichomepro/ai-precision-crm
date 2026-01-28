
const fs = require('fs');

try {
    const filename = process.argv[2] || 'build_log_5.txt';
    const raw = fs.readFileSync(filename);
    let content = "";
    // Handle UTF-16LE BOM if present
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8');
    }

    const lines = content.split('\n');
    console.log(`Scanning ${filename} (${lines.length} lines)...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Error') || line.includes('Type error') || line.includes('Failed to compile')) {
            console.log(`\n[LINE ${i + 1}]`);
            // Print context (3 lines before, 5 lines after)
            for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 10); j++) {
                console.log(lines[j].trimEnd());
            }
            i += 10; // Skip ahead to avoid duplicate context
        }
    }
} catch (e) {
    console.error("Read failed:", e);
}
