import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the model
// Used for extraction and analysis
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export { model };
