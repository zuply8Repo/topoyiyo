# ContentBeaver Frontend Setup Guide

## Prerequisites

- Node.js 18+ installed
- Backend API running (see `../yiyoBackend/README.md`)
- Database schema deployed (see `../db/schema/`)

## Environment Variables

Create a `.env.local` file in the `content_to_social_ui` directory with the following variables:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Environment Variable Details

- `NEXT_PUBLIC_API_URL`: The base URL for the backend API (without trailing slash)
  - Development: `http://localhost:8000/api/v1`
  - Production: Update to your production API URL

- `NEXTAUTH_URL`: The URL where your frontend is hosted
  - Development: `http://localhost:3000`
  - Production: Your production domain

- `NEXTAUTH_SECRET`: A random secret for NextAuth session encryption
  - Generate with: `openssl rand -base64 32`

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
  - Get from: https://console.cloud.google.com/

## Installation

```bash
# Install dependencies
npm install

# Or if using pnpm
pnpm install
```

## Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at http://localhost:3000

## Features

### Campaign Generation Workflow

1. **Prompt Page** (`/prompt`)
   - User enters campaign brief
   - Click "Validate" to start generation
   - Brief is saved to database
   - Backend job is created

2. **Loading Page** (`/loading?job_id=xxx`)
   - Polls backend for job status every 5 seconds
   - Shows real-time progress
   - Displays estimated completion time (~10 minutes)
   - Auto-redirects to review page when complete

3. **Review Page** (`/review`)
   - View generated campaign content
   - Approve/reject individual items

## API Integration

The frontend communicates with the backend via REST API:

### Create Campaign
```typescript
POST /api/v1/campaigns/generate
{
  "user_id": "string",
  "brief_text": "string"
}
```

Returns: `{ job_id: string, message: string }`

### Check Status
```typescript
GET /api/v1/campaigns/status/{job_id}
```

Returns: 
```typescript
{
  job_id: string,
  status: "pending" | "processing" | "completed" | "failed",
  progress_percentage: number,
  error_message?: string,
  campaign_id?: string
}
```

## Troubleshooting

### Backend Connection Issues

If you see errors connecting to the backend:

1. Verify backend is running: `curl http://localhost:8000/docs`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Ensure CORS is configured in backend

### Job Status Not Updating

If the loading page shows "pending" indefinitely:

1. Check backend logs for errors
2. Verify database tables are created (see `../db/schema/`)
3. Check that background tasks are running

### Authentication Issues

If Google OAuth isn't working:

1. Verify Google OAuth credentials in `.env.local`
2. Check redirect URIs in Google Console
3. Ensure `NEXTAUTH_SECRET` is set

## Development Tips

- Use browser DevTools Network tab to inspect API calls
- Check browser console for client-side errors
- Backend API docs available at: http://localhost:8000/docs
- Test with demo user_id: "guest" (no authentication required)

## Next Steps

After setup:

1. Test the complete workflow from prompt → loading → review
2. Monitor backend logs during campaign generation
3. Check database for saved briefs and jobs
4. Configure email notifications (optional, see backend docs)

