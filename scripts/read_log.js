
const fs = require('fs');

try {
    const raw = fs.readFileSync('build_log.txt');
    let content = "";
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8');
    }

    console.log("--- BUILD LOG START ---");
    console.log(content.substring(0, 5000));
    console.log("--- BUILD LOG END ---");
} catch (e) {
    console.error("Read failed:", e);
}
