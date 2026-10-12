# Deploying Slotly to Vercel

Follow these steps to deploy your Slotly application to production on **Vercel**.

---

## 1. Managed PostgreSQL Database (Required)
Slotly uses PostgreSQL to store users, events, and bookings. If you do not already have a hosted PostgreSQL database:
- **Neon** (Recommended - free serverless PostgreSQL): [neon.tech](https://neon.tech)
- **Supabase**: [supabase.com](https://supabase.com)
- **Vercel Postgres**: Available directly inside the Vercel dashboard under the **Storage** tab.

Copy your connection string (`DATABASE_URL`). Example:
```text
postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Deploy via GitHub & Vercel Dashboard (Recommended)

### Step A: Push to GitHub
1. Create a repository on [GitHub](https://github.com/new).
2. In your terminal:
   ```bash
   git add .
   git commit -m "Initial commit for Slotly with Google Meet integration"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

### Step B: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Select your GitHub repository and click **Import**.
4. Framework Preset will be automatically detected as **Next.js**.

---

## 3. Configure Environment Variables in Vercel

Under **Environment Variables** in Vercel settings, add the following:

| Variable Name | Description | Example / Instructions |
| --- | --- | --- |
| `DATABASE_URL` | Hosted PostgreSQL connection string | `postgresql://...neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_URL` | Your live deployment URL | `https://your-project.vercel.app` |
| `NEXTAUTH_SECRET` | NextAuth JWT signing key | Run `openssl rand -base64 32` or any random 32+ character string |
| `CALENDAR_ENCRYPTION_KEY` | AES-256 key for calendar token encryption | Any 32-character secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID *(Optional / for Google Calendar & Meet)* | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret *(Optional / for Google Calendar & Meet)* | From Google Cloud Console |

---

## 4. Google Cloud Console Redirect URI (For Google Calendar & Meet)

If you use Google Calendar & Google Meet:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **Credentials**.
3. Edit your OAuth 2.0 Web Client.
4. Under **Authorized redirect URIs**, add your production callback URL:
   ```text
   https://your-project.vercel.app/api/calendar/callback
   ```
5. Save changes.

---

## 5. Verify Deployment
Click **Deploy** in Vercel. Once completed:
1. Visit your production URL (`https://your-project.vercel.app`).
2. Register an account or log in.
3. Configure an Event Type with **Google Meet**, **External Meeting URL**, or **In-person**.
4. Test the booking flow — database tables and migrations will auto-provision on first request!
