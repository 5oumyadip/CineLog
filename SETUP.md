# CineLog setup

CineLog is a React + TypeScript movie diary and discovery app. The UI runs with sample movie data immediately; live movie metadata requires a TMDB API key, and accounts/persistent data require Supabase.

## 1. Requirements
- Node.js 18+
- npm
- A free TMDB developer API key
- A Supabase project (free tier is enough for development)

## 2. Install and run
```bash
npm install
cp .env.example .env
npm run dev
```
Open the local URL printed by Vite.

## 3. Enable live movie data
1. Create an account at https://www.themoviedb.org/
2. Request an API key from your account settings.
3. Put the key in `.env` as `VITE_TMDB_API_KEY`.
4. Restart the dev server.

TMDB attribution: This product uses the TMDB API but is not endorsed or certified by TMDB. See https://www.themoviedb.org/terms-of-use.

## 4. Configure Supabase authentication and database
1. Create a project at https://supabase.com/.
2. Open **Project Settings → API** and copy the Project URL and anon/public key.
3. Add them to `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Open **SQL Editor** in Supabase and run `supabase/schema.sql`.
5. In **Authentication → URL Configuration**, set your local site URL to `http://localhost:5173`.
6. Restart Vite and create an account in CineLog.

Never put a Supabase service-role key or any secret server key in a `VITE_` variable. The anon key is intended for client use when Row Level Security is correctly configured.

## 5. Current implementation notes
- Movie discovery, popular/trending views, search, and detail pages use TMDB when configured.
- Without a TMDB key, the app displays a small demo catalogue and placeholder poster artwork.
- Supabase email/password signup and login are wired.
- The schema includes profiles, reviews, watchlists, follows, custom lists and list items with Row Level Security.
- Watchlist and review writes are connected to Supabase. The starter UI keeps diary/watchlist state in memory for the current session; the next iteration should hydrate those collections from Supabase on login and add full follow/list/profile-edit workflows.
- The community feed currently uses starter example reviews until the next iteration connects public review queries.
- Review likes, comments, moderation, password reset and social notifications are not included yet.

## 6. Build for production
```bash
npm run build
npm run preview
```
Deploy the project to Vercel or Netlify. Add the same `VITE_` environment variables in the hosting dashboard and set your Supabase Auth redirect URLs to your production domain.
