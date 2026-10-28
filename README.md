# Rate a Renter

A **demo** website for searching, viewing, and writing reviews of **renters**, **roommates**, and **landlords** — similar in spirit to Yelp or Rate My Professor, focused on rental relationships.

Reviews are stored in **Supabase** and shared across visitors (not just your browser).

## Open locally

```bash
cd /workspace/rate-a-renter && python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

You can also open `index.html` via `file://`, but loading the Supabase CDN may be restricted by some browsers offline.

## Backend (Supabase)

| | |
|---|---|
| Project URL | `https://bnsnbadmsxesyouaiafe.supabase.co` |
| Client key | Legacy **anon** JWT (publishable) — embedded in `app.js` by design |

Tables: `profiles`, `reviews`, `review_flags`. The anon key is safe to ship in the frontend; it is constrained by Row Level Security. This demo opens read/update for moderation and verification so the static site can function without a signed-in user.

## What’s included

- **Search** by name or location; filter by renter / roommate / landlord
- **Profile pages** with average stars (half-star steps), review list, and popular trait tags
- **Write a review** with rating (0–5), free text, multi-select traits, anonymous option
- **Optional photos** — up to 4 images, resized client-side (~800px), stored as JSON data URLs on the review
- **Demo email verification** — on-screen code `482917` (or one-click); sets `is_verified=true` in Supabase
- **Moderation panel** (`#/moderation`) — flags via `review_flags`, hide/unhide reviews
- **Sponsored ads** — sidebar + inline placeholders for carpet / house cleaning

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page shell + Supabase JS CDN |
| `styles.css` | Layout and theme |
| `app.js` | Routing, Supabase data layer, UI |
| `README.md` | This file |

## Limitations

- Demo-open RLS: anyone with the anon key can insert/update reviews and flags — fine for a prototype, not for production
- Photos as data URLs can be large; keep uploads small
- Email verification is simulated (no messages are sent)
- Ad links are placeholders (`example.com`), not real affiliates
- Not a background check and not legal advice
