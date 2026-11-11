# Laptimes

Log sim racing lap times, chase your mates on the leaderboards, and share ghosts and setups.

Built with Next.js (App Router, TypeScript), Tailwind CSS and Supabase (Postgres, auth, file storage). Deployed on Vercel.

## What's in it

- **Log a lap** in a few taps. The time box accepts `1:31.510`, `01.31.510`, `131510` and friends, and the form remembers your last track, car and rig.
- **Leaderboards** per track + car, per track (any car) and per car, with gap to the leader, gap to you, a theoretical best from sectors, and filters for assists, input device, date range, verified laps and your crew.
- **Timing-screen colours** everywhere: purple = record, green = personal best, amber = slower lap.
- **Head to head** between any two drivers with a "who is the king" tally.
- **Driver profiles** with personal best progression, consistency stats and a track x car coverage grid.
- **Files**: attach a ghost, setup, replay or screenshot to a lap. In Chrome or Edge on desktop, pick your `Documents/Assetto Corsa` folder once in Settings and files install to the right subfolder with one click; other browsers get a normal download.
- **Crews**: private groups with their own records, joined by invite code.
- **Moderation**: report button, and an admin page to hide laps and approve driver claims.

## Run it locally

```bash
npm install
npm run dev
```

The Supabase URL and publishable key live in `.env`. They are public by design (they ship to the browser); the data is protected by Row Level Security policies in the database.

## Database

The schema, security policies and storage bucket are in `supabase/migrations/0001_init.sql`.

Laps imported from the original spreadsheet belong to "placeholder" drivers. A real person takes one over by signing up and pressing "these are my laps" on that driver's page; an admin approves it at `/admin`.

## Where Assetto Corsa files go

| File | Installed to (inside `Documents/Assetto Corsa`) |
| --- | --- |
| Setup (`.ini`) | `setups/<car folder>/<track folder>/` |
| Ghost (`.ghost`) | `ghostcar/<track folder>/` |
| Replay (`.acreplay`) | `replay/` |

One-click install needs the track and car to have their game folder name filled in (for example `ks_barcelona`). Admins, or whoever added the track or car, can edit that on its page.
