
export interface LogicResult {
    partnership: {
        hasNovus: boolean;
        status: string;
    };
    gbp: {
        reviewCount: number;
        rating: number;
        risk: "Low" | "High" | "Unknown";
    };
    competitors: {
        hasBookingWidget: boolean;
        friction: "Low" | "High" | "Unknown";
    };
}

export function checkPartnership(textContent: string): { hasNovus: boolean; status: string } {
    const hasNovus = textContent.toLowerCase().includes("novus");
    return {
        hasNovus,
        status: hasNovus ? "Brand Authority: High (Partner Found)" : "Outdated Brand Authority (NOVUS Missing)"
    };
}

// These will be expanded with actual scraping logic later
export function analyzeReputation(reviews: number, lastReviewMonths: number): "Low" | "High" {
    if (reviews < 50 || lastReviewMonths > 3) return "High"; // Risk is high
    return "Low";
}
