# AI Content Factory - Security & Architecture

## Security Model

### API Key Protection
- **Gemini API Key**: Stored ONLY in Firebase Functions as a secret parameter (`GEMINI_API_KEY`)
- **Never exposed**: The API key is never bundled in the frontend build
- **Backend-only access**: All AI generation happens server-side via Firebase Callable Functions

### Firebase Configuration
- Firebase config in frontend (`VITE_FIREBASE_*`) is safe to expose - these are public identifiers
- Security rules in Firestore protect data access
- Authentication is handled by Firebase Auth

## Architecture

### Frontend (React + Vite)
- Uses modern Firebase SDK v9+ (modular imports)
- Calls backend functions via `httpsCallable`
- No direct access to Gemini API
- **Firebase Storage**: Uploads images before processing to avoid payload size limits

### Backend (Firebase Functions)
- All Gemini API calls happen in Cloud Functions:
  - `generateArticlesFromTopic` - Single/batch text generation
  - `generateArticlesFromImages` - Image-to-text generation (fetches from Storage URLs)
  - `generateArticleFromWebsite` - URL-to-text generation  
  - `regenerateArticleText` - Text regeneration
  - `generateImage` - Image generation from prompt
  - `regenerateImagePrompt` - Image prompt regeneration
  - `processBatchGenerationJob` - Firestore-triggered batch processing
  - `checkScheduledPosts` - Scheduled post checker (runs every 5 minutes)

- **Authentication**: All callable functions require user authentication via Firebase Auth

### Image Processing Flow
1. Frontend uploads images to Firebase Storage (`user-images/{userId}/`)
2. Gets public download URLs from Storage
3. Sends URLs (not base64) to Cloud Function
4. Cloud Function fetches images from URLs and processes with Gemini
5. Frontend displays uploaded images using data URLs

## Deployment

### Setting the Gemini API Key
Before deploying functions:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### Deploy to Firebase Hosting (Recommended)
```bash
# Frontend
npm run build
firebase deploy --only hosting

# Backend
firebase deploy --only functions

# Storage Rules
firebase deploy --only storage
```

### Deploy to Netlify (Alternative)

**Required Environment Variables in Netlify:**
Add these in Site Settings → Environment Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Get values from Firebase Console → Project Settings → General → Your apps.

**Backend still deploys to Firebase:**
```bash
firebase deploy --only functions
```

The frontend on Netlify will call Firebase Functions via `httpsCallable`.

## Important Notes
- Never commit `.env` files with secrets
- The Gemini API key is defined using `defineString("GEMINI_API_KEY")` in functions
- Frontend bundle is safe to inspect - no secrets exposed
- Images are uploaded to Firebase Storage to avoid 500 errors with large payloads
- Storage rules allow public read but restrict writes to authenticated users
