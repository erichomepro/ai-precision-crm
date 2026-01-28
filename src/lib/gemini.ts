import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Initialize Gemini
// We export this so it can be reused if needed, but the main utility is the retry function
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface RetryOptions {
    retries?: number;
    initialDelay?: number;
    factor?: number;
}

/**
 * Generates content using the Gemini model with exponential backoff retry logic.
 * Specifically handles 429 Too Many Requests errors.
 */
export async function generateContentWithRetry(
    model: GenerativeModel,
    prompt: string,
    options: RetryOptions = {}
): Promise<any> {
    const { retries = 3, initialDelay = 2000, factor = 2 } = options;
    let attempt = 0;
    let delay = initialDelay;

    while (attempt <= retries) {
        try {
            return await model.generateContent(prompt);
        } catch (error: any) {
            // Check if it's a 429 error (Resource Exhausted)
            // Error messages from the library might vary slightly, but usually contain "429" or "Resource exhausted"
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Resource exhausted');

            if (isRateLimit && attempt < retries) {
                console.warn(`[Gemini Retry] Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Exponential backoff
                delay *= factor;
                attempt++;
            } else {
                // If it's not a rate limit error, or we've run out of retries, throw the error
                throw error;
            }
        }
    }
}
