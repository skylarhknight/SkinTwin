# SkinTwin

SkinTwin is a skincare wellness app that uses AI skin analysis, habit tracking, product tracking, personalized routines, and future-aging simulations to help users understand and improve their skincare consistency.

## Features

- Logged-out marketing home page and logged-in returning-user home experience
- Login/create-account flow with Supabase Auth when configured and local demo sessions otherwise
- Live camera selfie capture plus upload fallback for skin scans
- Onboarding for skin goals, sensitivity, budget, and products
- AI-powered skin scan flow with mock fallback
- SkinTwin score and top concerns
- Per-concern mask overlays rendered directly from the Skin Analysis API
- Scan-to-scan progress reports with habit and product attribution
- Radar chart and trend charts
- Habit tracking for sleep, water, SPF, and stress
- Product shelf
- Personalized AM/PM routine
- Pattern insights
- Future-aging simulation scenarios

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Supabase
- Perfect Corp APIs

## Perfect Corp APIs

The app integrates:

- **AI Skin Analysis** — file upload → presigned PUT → task → poll, per the S2S v2.1 flow
- **AI Facial Color Tones Analyzer** — undertone plus pigmentation/redness indices
- **AI Skin Simulation** — the four future-trajectory scenarios on `/future`

If API credentials are missing, the app uses deterministic mock responses for demo reliability.

### Analysis tiers

Skin Analysis runs the **HD action set** by default, covering all ten dimensions the UI renders
(`hd_moisture`, `hd_redness`, `hd_acne`, `hd_pore`, `hd_texture`, `hd_wrinkle`, `hd_dark_circle`,
`hd_age_spot`, `hd_radiance`, `hd_oiliness`). If the account lacks HD entitlement, the pipeline
retries once on the SD triad (`acne`, `wrinkle`, `age_spot`) using the same uploaded file, and the
scan is labelled accordingly.

Override with `PERFECT_DST_ACTIONS` (comma-separated). Never mix HD and SD actions in one task.

**The UI only renders dimensions Perfect actually measured.** Unmeasured metrics are excluded from
the radar, the metric grid, and every scan-to-scan comparison rather than shown at a placeholder
value — a placeholder sitting next to real scores reads as a real reading.

### Mask overlays

Tasks are submitted with `miniserver_args.enable_mask_overlay`, and the per-concern overlay images
are extracted from the poll response, copied into Supabase Storage (Perfect's URLs are presigned and
expire), and rendered on the scan result page and in `/progress`.

## Progress reports

`/progress` compares two scans and explains the change using what was logged in between. It is
deliberately conservative:

- Only dimensions measured in **both** scans are compared; anything else is listed as not comparable.
- Moves within ±3 points are reported as steady, since Perfect's scores carry lighting and framing noise.
- Habit and product links are framed as timing overlaps, never as proven cause, and carry a
  confidence grade based on window length and logging consistency.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Authentication

If Supabase environment variables are configured, `/login` uses Supabase Auth. If they are missing, the app creates a local demo session so the hackathon demo still works.

## Demo Mode

Set:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Mock API responses will be used if Perfect Corp credentials are not configured.

## Disclaimer

SkinTwin provides wellness and skincare guidance only. It does not diagnose, treat, or prevent medical conditions. For persistent or severe skin concerns, consult a licensed dermatologist.
