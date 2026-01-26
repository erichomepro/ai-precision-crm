const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = "D:\\Website_Analysis_&_Insights.Oct_2025_-_Dec_2025.pdf";

async function readPdf() {
    try {
        if (!fs.existsSync(pdfPath)) {
            console.error("File not found:", pdfPath);
            return;
        }

        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);

        console.log("--- PDF CONTENT START ---");
        console.log(data.text);
        console.log("--- PDF CONTENT END ---");

    } catch (error) {
        console.error("Error reading PDF:", error.message);
    }
}

readPdf();
