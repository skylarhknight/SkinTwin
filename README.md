# SkinTwin

SkinTwin is a hackathon skincare wellness app that uses AI skin analysis, habit tracking, product tracking, personalized routines, and future-aging simulations to help users understand and improve their skincare consistency.

## Features

- Logged-out marketing home page and logged-in returning-user home experience
- Login/create-account flow with Supabase Auth when configured and local demo sessions otherwise
- Live camera selfie capture plus upload fallback for skin scans
- Onboarding for skin goals, sensitivity, budget, and products
- AI-powered skin scan flow with mock fallback
- SkinTwin score and top concerns
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

The app is designed to integrate:

- AI Skin Analysis
- AI Facial Color Tones Analyzer
- AI Aging Simulation

If API credentials are missing, the app uses deterministic mock responses for demo reliability.

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
