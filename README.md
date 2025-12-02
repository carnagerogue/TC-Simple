# TC Simple

TC Simple is a SaaS starter built with the Next.js App Router. It ships with Google authentication (NextAuth), protected pages, a PDF upload workflow, and Tailwind-powered UI elements that can be expanded into production features.

## Tech stack

- Next.js 14 (App Router + TypeScript)
- Tailwind CSS 3
- NextAuth.js (Google OAuth)
- Edge-ready middleware for route protection

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables**  
   Duplicate `env.example` to `.env.local` and supply your credentials:
   ```bash
   cp env.example .env.local
   ```
   - `NEXTAUTH_SECRET`: `openssl rand -hex 32`
   - `NEXTAUTH_URL`: typically `http://localhost:3000`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: created in the Google Cloud Console (OAuth consent screen + Web client). Enable Calendar, Gmail, and Drive APIs and add the scopes listed in `lib/auth.ts`.
   - `GOOGLE_DRIVE_FOLDER_ID` (optional): preset parent folder for uploaded docs.
3. **Run the development server**
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000/login` to authenticate via Google (Calendar, Gmail, Drive scopes).

## Available routes

- `/login` – Google sign-in entry point.
- `/dashboard` – Protected dashboard that greets the authenticated user.
- `/upload` – Protected page with a PDF-only uploader that writes documents to Google Drive.
- `/api/upload` – Validates PDF uploads and stores them in Drive using the authenticated user.
- `/api/calendar/events` – Creates Google Calendar events using stored OAuth tokens.
- `/api/email/send` – Sends templated Gmail messages to clients/vendors.

## Quality checks

- `npm run lint` – ESLint (Next.js config)

## Next steps

- Wire the upload endpoint to persistent storage (GCP, S3, etc.).
- Add domain logic to the dashboard and enrich the upload confirmation flow.
