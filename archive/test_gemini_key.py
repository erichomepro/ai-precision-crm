import os
import google.generativeai as genai

# Setup key - I will check if I can grab it from environment or if I need to use a placeholder 
# Since I cannot see .env directly, I'll try to use the library and see if it grabs from env, 
# otherwise I will use the one I found in the other file if referenced, or fail gracefully.
api_key = os.environ.get("GEMINI_API_KEY")

print(f"Checking API Key presence: {'Found' if api_key else 'Missing'}")

if not api_key:
    # Try to find it in the project files just in case it is hardcoded somewhere else like the other token
    # But for now, let's assume we need one.
    print("Skipping AI test due to missing key in current shell env.")
else:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
    
    try:
        response = model.generate_content("Hello, can you hear me?")
        print(f"Gemini Response: {response.text}")
    except Exception as e:
        print(f"Gemini Error: {e}")
