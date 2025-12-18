# Authentication Setup Guide

This guide will help you set up Google OAuth authentication for Content Beaver.

## Prerequisites

- A Google Cloud account
- Node.js and npm installed

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project or create a new one

### 1.2 Enable Google+ API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### 1.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for testing) or **Internal** (for organization)
   - App name: **yiyo**
   - User support email: your email
   - Developer contact: your email
4. Application type: **Web application**
5. Name: **Content Beaver**
6. Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Add your production domain when deploying
7. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - Add your production callback URL when deploying (e.g., `https://your-domain.com/api/auth/callback/google`)
8. Click **Create**
9. Copy the **Client ID** and **Client Secret** (you'll need these for .env.local)

## Step 2: Generate NextAuth Secret

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output - this will be your `AUTH_SECRET`.

## Step 3: Create Environment Variables File

1. In the `content_to_social_ui` directory, create a file named `.env.local`
2. Add the following variables (replace with your actual values):

```env
# Google OAuth Credentials from Google Cloud Console
AUTH_GOOGLE_ID=your-google-client-id-here
AUTH_GOOGLE_SECRET=your-google-client-secret-here

# NextAuth Secret (generated with openssl)
AUTH_SECRET=your-generated-secret-here

# Application URL (NextAuth v5 auto-detects in development, but you can set it explicitly)
NEXTAUTH_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

**Note:** NextAuth v5 uses the `AUTH_*` prefix for environment variables. The `NEXTAUTH_URL` is optional in development but recommended for production.

## Step 4: Install Dependencies

```bash
cd content_to_social_ui
npm install
```

## Step 5: Run the Application

```bash
npm run dev
```

The app should now be running at `http://localhost:3000`.

## Step 6: Test Authentication

1. Navigate to `http://localhost:3000`
2. You should be redirected to the login page
3. Click "Sign in with Google"
4. You'll be redirected to Google's OAuth consent screen
5. Select your Google account and approve the permissions
6. You should be redirected back to the app at `/prompt`
7. Your profile picture and name should appear in the navbar

## Troubleshooting

### Error: "redirect_uri_mismatch"

- **Cause:** The redirect URI in your Google Cloud Console doesn't match the one being used
- **Solution:** Make sure `http://localhost:3000/api/auth/callback/google` is in your Authorized redirect URIs

### Error: "Invalid client_id or client_secret"

- **Cause:** Incorrect credentials in `.env.local`
- **Solution:** Double-check your `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from Google Cloud Console

### Error: "There was a problem with the server configuration"

- **Cause:** Missing or invalid `AUTH_SECRET` or incorrect environment variable names
- **Solution:**
  - Ensure you're using `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (not `CLIENT_ID`/`CLIENT_SECRET`)
  - Regenerate the secret with `openssl rand -base64 32` and set as `AUTH_SECRET`
  - Restart the development server after changing `.env.local`

### Session not persisting

- **Cause:** Missing or invalid `AUTH_SECRET`
- **Solution:** Regenerate the secret with `openssl rand -base64 32` and update `.env.local`

### CORS or cookie issues

- **Cause:** Incorrect `NEXTAUTH_URL` or browser security settings
- **Solution:** Ensure `NEXTAUTH_URL` matches your development URL exactly (usually `http://localhost:3000`)

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console:**

   - Add your production domain to Authorized JavaScript origins
   - Add your production callback URL to Authorized redirect URIs

2. **Update Environment Variables:**

   - Set `NEXTAUTH_URL` to your production URL (e.g., `https://your-domain.com`)
   - Keep the same `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`

3. **Platform-Specific Setup:**
   - **Vercel:** Add environment variables in Project Settings → Environment Variables
   - **Netlify:** Add environment variables in Site settings → Build & deploy → Environment
   - **Other platforms:** Follow their documentation for setting environment variables

## Multi-User Data Isolation

Each user's data is automatically isolated using their Google account ID:

- Content items are stored with user-specific keys
- Schedules are scoped per user
- Users cannot access each other's data

## Security Notes

- Session cookies are HTTP-only (not accessible via JavaScript)
- CSRF protection is enabled by default
- Sessions expire after 7 days of inactivity
- All authentication logic runs on the server

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set correctly
4. Ensure Google Cloud Console configuration matches your redirect URIs
