import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
// Forced Key for Debugging
const genAI = new GoogleGenerativeAI("AIzaSyAkTNkKu5t7tSGWEaXpnlwxglv5fZtvh60");

// Get the model
// Used for extraction and analysis
// Confirmed working model for this API Key
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export { model };
