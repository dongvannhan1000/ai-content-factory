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

### Backend (Firebase Functions)
- All Gemini API calls happen in Cloud Functions:
  - `generateArticlesFromTopic` - Single/batch text generation
  - `generateArticleFromImage` - Image-to-text generation
  - `generateArticleFromWebsite` - URL-to-text generation  
  - `regenerateArticleText` - Text regeneration
  - `generateImage` - Image generation from prompt
  - `regenerateImagePrompt` - Image prompt regeneration
  - `processBatchGenerationJob` - Firestore-triggered batch processing
  - `checkScheduledPosts` - Scheduled post checker (runs every 5 minutes)

- **Authentication**: All callable functions require user authentication via Firebase Auth

## Deployment

### Setting the Gemini API Key
Before deploying functions:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### Build & Deploy
```bash
# Frontend
npm run build
firebase deploy --only hosting

# Backend
firebase deploy --only functions
```

## Important Notes
- Never commit `.env` files with secrets
- The Gemini API key is defined using `defineString("GEMINI_API_KEY")` in functions
- Frontend bundle is safe to inspect - no secrets exposed
