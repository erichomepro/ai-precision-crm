# Deploying to Vercel

Follow these steps to get your AI Marketing CRM live on the web.

## 1. Prepare your GitHub Repo
1. Create a **Private** repository on GitHub.
2. In your local terminal, run:
   ```powershell
   git init
   git add .
   git commit -m "feat: multi-user isolation and deployment prep"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## 2. Connect to Vercel
1. Go to [Vercel](https://vercel.com) and click **"Add New" -> "Project"**.
2. Select your GitHub repository.
3. **Environment Variables**: This is the most important part. Copy these from your local `.env`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `GEMINI_API_KEY`
   
   **CRITICAL: FIREBASE_PRIVATE_KEY**
   - Vercel handles multiline strings carefully.
   - When pasting `FIREBASE_PRIVATE_KEY`, ensure it starts with `-----BEGIN PRIVATE KEY-----` and ends with `-----END PRIVATE KEY-----`.
   - Vercel usually accepts it as-is, but if it fails, try wrapping it in double quotes.

## 3. Secure the Database (Firebase Console)
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Project Settings -> Authentication -> Settings -> Authorized Domains**.
3. Add your Vercel URL (e.g., `your-app.vercel.app`) to the list.
4. Navigate to **Firestore Database -> Rules**.
5. Copy the contents of the `firestore.rules` file in your project root and paste them there. Click **Publish**.

## 4. Run!
Once the build finishes, your site will be live at the provided Vercel URL. You can then log in with your "Eric Wick" account or any new account you create!
