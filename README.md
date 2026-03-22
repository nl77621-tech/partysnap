# PartySnap — QR Code Photo & Video Collector

Collect photos and videos from your event guests via QR codes. No app install needed — guests just scan and upload. Display a live photo wall on a TV in real time.

## Features

- **Host Dashboard** — Create and manage parties, generate QR codes
- **QR Code Generation** — Unique codes per party, downloadable as PNG or printable table tent PDF
- **Guest Upload** — Mobile-first, zero-friction upload page (no login required)
- **Google Drive Integration** — All media uploads go directly to the host's Google Drive folder
- **Live Slideshow** — Full-screen Ken Burns slideshow + mosaic grid mode, auto-refreshes with new uploads
- **Party Analytics** — Upload counts, photo/video breakdown, timeline chart

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with Google OAuth
- **Storage**: Google Drive API v3
- **Styling**: Tailwind CSS
- **QR Codes**: `qrcode` npm package
- **PDF Generation**: `jsPDF`

## Setup

### 1. Google Cloud Console

1. Create a new project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Drive API**
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Set application type to **Web application**
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (for local dev)
6. Copy the **Client ID** and **Client Secret**

### 2. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/partysnap
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

### 3. Database

```bash
npx prisma migrate dev --name init
```

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables Reference

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Railway) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `NEXTAUTH_URL` | Base URL of the app (e.g., `https://your-app.up.railway.app`) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption |

## Railway Deployment

1. Push this repo to GitHub
2. Connect the repo in [Railway](https://railway.app)
3. Add a PostgreSQL database plugin — Railway auto-provides `DATABASE_URL`
4. Set the environment variables above in Railway's dashboard
5. Update `GOOGLE_REDIRECT_URI` in Google Cloud Console to match your Railway URL

The included `railway.toml` handles build and deploy configuration automatically.

## How It Works

1. **Host** signs in with Google and creates a party
2. Host picks a Google Drive folder for uploads
3. App generates a unique QR code for the party
4. Host prints QR codes and places them on tables
5. **Guests** scan the QR code — no login needed — and upload photos/videos
6. Media streams directly to the host's Google Drive
7. Host opens the slideshow URL on a TV to display uploads in real time
