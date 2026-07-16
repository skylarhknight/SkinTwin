# SkinForward Build Contract

## 0. Purpose

Build **SkinForward**, a hackathon-ready skincare wellness web app.

SkinForward lets users:
1. onboard with skin goals/profile/products,
2. upload a selfie for AI skin analysis,
3. view skin metrics, score, top concerns, and radar chart,
4. log habits such as water, sleep, SPF, and stress,
5. track skincare products,
6. get personalized AM/PM routine recommendations,
7. detect patterns between skin, habits, and products,
8. view trend charts,
9. generate future-aging simulation scenarios.

Primary build target: **working demo app**, not production-grade medical software.

---

## 1. Stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Supabase optional
- Perfect Corp APIs through backend only
- Deterministic mock fallback for all Perfect API calls

Do not use:

- frontend-exposed API keys
- complex ML training
- medical diagnosis language
- unnecessary abstractions
- unrelated redesigns once core flow works

---

## 2. Core Product Promise

**Track your skin. Understand your habits. See your future.**

SkinForward turns skincare into a measurable feedback loop by combining:
- AI skin analysis,
- habit/product tracking,
- personalized recommendations,
- visual progress,
- future-aging motivation.

---

## 3. User

Primary user: skincare consumer who wants to know:
- whether products are working,
- what habits affect skin,
- what routine to follow,
- how consistency changes long-term skin outcomes.

Secondary user: beauty/skincare retailer seeking:
- personalized product discovery,
- better conversion confidence,
- routine-based product bundling,
- recurring engagement.

---

## 4. Required Demo Flow

The app must support this exact flow:

```txt
Landing
→ Onboarding
→ Product setup
→ Selfie upload
→ Skin report
→ Dashboard
→ Habit log
→ Routine recommendation
→ Trends
→ Insights
→ Future simulation

This flow must work with no live Perfect Corp credentials.

5. MVP Pages

Required routes:

/
 /onboarding
 /scan
 /scan/[scanId]
 /dashboard
 /habits
 /products
 /routine
 /trends
 /insights
 /future
 /settings

Global nav:

Home | Scan | Trends | Routine | Future

Secondary nav:

Products | Insights | Settings
6. Perfect Corp API Contract

Required integrations:

AI Skin Analysis
daily scan metrics
skin report
trends
recommendations
insights
AI Facial Color Tones Analyzer
tone tracking
redness/pigmentation support
hyperpigmentation progress
AI Aging Simulation
future face scenarios
SPF/routine consistency motivation

All Perfect API calls must go through backend route/service code.

Never call Perfect directly from client components.

If Perfect API env vars are missing, return mock responses.

7. Mock Mode Contract

The app must work fully in mock mode.

If any required Perfect API env var is missing:

use mock response
set isMock: true
do not crash
show subtle "Demo data" label

Mock skin metrics:

export const mockSkinMetrics = {
  hydration: 62,
  redness: 70,
  acne: 84,
  pores: 76,
  texture: 82,
  wrinkles: 88,
  darkCircles: 66,
  pigmentation: 68,
  radiance: 74,
  oiliness: 58
};

Mock profile:

{
  skinType: "combination",
  sensitivityLevel: "high",
  routineExperience: "beginner",
  budgetLevel: "$$",
  primaryGoals: [
    "reduce_redness",
    "fade_dark_spots",
    "improve_hydration"
  ]
}

Mock insights:

Low sleep may be affecting dark circles.
SPF consistency is supporting tone improvement.
Possible irritation from new exfoliant.
Low water intake may be affecting hydration.
8. Data Normalization

All skin metrics must be normalized to:

0 = worst / highest concern
100 = best / healthiest / lowest concern

Core metrics:

type SkinMetrics = {
  hydration: number;
  redness: number;
  acne: number;
  pores: number;
  texture: number;
  wrinkles: number;
  darkCircles: number;
  pigmentation: number;
  radiance: number;
  oiliness: number;
};

If raw API returns severity where higher is worse, invert:

normalized = 100 - rawSeverity

Clamp all scores:

Math.max(0, Math.min(100, score))
9. SkinForward Score

Calculate overall score:

overall =
  hydration * 0.18 +
  radiance * 0.15 +
  texture * 0.15 +
  acne * 0.12 +
  pores * 0.10 +
  pigmentation * 0.10 +
  redness * 0.08 +
  darkCircles * 0.07 +
  wrinkles * 0.05;

Round to nearest integer.

Top concerns = lowest 3 metric scores.

10. Shared Types

Create /lib/types.ts.

export type SkinMetrics = {
  hydration: number;
  redness: number;
  acne: number;
  pores: number;
  texture: number;
  wrinkles: number;
  darkCircles: number;
  pigmentation: number;
  radiance: number;
  oiliness: number;
};

export type UserProfile = {
  skinType: "dry" | "oily" | "combination" | "normal" | "unsure";
  sensitivityLevel: "low" | "medium" | "high";
  routineExperience: "beginner" | "intermediate" | "advanced";
  budgetLevel: "$" | "$$" | "$$$";
  primaryGoals: string[];
};

export type DailyHabit = {
  logDate: string;
  waterIntakeMl: number;
  sleepHours: number;
  usedSpf: boolean;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  exerciseMinutes?: number;
  notes?: string;
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  activeIngredients: string[];
  usageTime: "AM" | "PM" | "Both";
  frequency: string;
  dateStarted: string;
  dateStopped?: string;
  notes?: string;
};

export type SkinScan = {
  id: string;
  userId?: string;
  imageUrl: string;
  scanDate: string;
  overallScore: number;
  metrics: SkinMetrics;
  topConcerns: string[];
  summary?: string;
  isMock: boolean;
  rawSkinAnalysisResponse?: unknown;
  rawColorToneResponse?: unknown;
};

export type RoutineStep = {
  stepOrder: number;
  category: string;
  productId?: string;
  instruction: string;
  rationale: string;
  frequency?: string;
};

export type RoutineResponse = {
  routines: {
    routineType: "AM" | "PM";
    steps: RoutineStep[];
  }[];
  avoidForNow?: string[];
  disclaimer?: string;
};

export type Insight = {
  id?: string;
  insightType: string;
  title: string;
  description: string;
  evidence: string[] | Record<string, unknown>;
  recommendedAction: string;
  confidence: "low" | "medium" | "high";
  severity?: "low" | "medium" | "high";
};

export type SimulationResponse = {
  simulationId: string;
  scenarioType:
    | "consistent_spf_routine"
    | "skip_spf"
    | "stop_routine"
    | "current_trajectory";
  sourceImageUrl: string;
  simulatedImageUrl: string;
  scenarioDescription: string;
  simulationYears: number;
  isMock: boolean;
};
11. Required Library Files

Create:

/lib/types.ts
/lib/mock/mockSkinData.ts
/lib/skin/skinScore.ts
/lib/perfect/perfectClient.ts
/lib/recommendations/routineEngine.ts
/lib/insights/insightEngine.ts
/lib/demoUser.ts
/lib/storage/localStorageKeys.ts
12. /lib/skin/skinScore.ts

Exports:

normalizeSkinMetrics(raw: unknown): SkinMetrics
calculateOverallScore(metrics: SkinMetrics): number
getTopConcerns(metrics: SkinMetrics, count?: number): string[]

Rules:

Normalize to 0–100.
Clamp values.
Top concerns = lowest scores.
Return stable fallback if raw response missing.
13. /lib/perfect/perfectClient.ts

Exports:

analyzeSkin(input): Promise<{
  metrics: SkinMetrics;
  raw: unknown;
  isMock: boolean;
}>

analyzeFacialTone(input): Promise<{
  facialToneData: unknown;
  raw: unknown;
  isMock: boolean;
}>

simulateAging(input): Promise<SimulationResponse>

Behavior:

If PERFECT_API_KEY and PERFECT_API_BASE_URL exist:
  call real configured endpoint.
Else:
  return deterministic mock response.

Required env vars:

PERFECT_API_KEY=
PERFECT_API_BASE_URL=
PERFECT_SKIN_ANALYSIS_ENDPOINT=
PERFECT_FACIAL_TONE_ENDPOINT=
PERFECT_AGING_SIMULATION_ENDPOINT=

Implementation rule:

Isolate request payload construction in:
buildSkinAnalysisRequest()
buildFacialToneRequest()
buildAgingSimulationRequest()
Add TODO comments for mapping final Perfect API docs.
Never expose key to client.
14. /lib/recommendations/routineEngine.ts

Export:

generateRoutine(input: {
  profile?: UserProfile;
  latestScan?: SkinScan;
  products?: Product[];
  habits?: DailyHabit[];
}): RoutineResponse

Rules:

If redness low score + high sensitivity

Recommend:

gentle cleanser
barrier moisturizer
SPF
avoid exfoliants/retinoids temporarily
If hydration low

Recommend:

hydrating serum
moisturizer
reduce strong actives
water/sleep support
If pigmentation low score or fade_dark_spots goal

Recommend:

daily SPF
brightening serum category
vitamin C / niacinamide / azelaic acid category
If acne/oiliness concern

Recommend:

gentle cleanser
lightweight moisturizer
non-comedogenic SPF
salicylic acid category if sensitivity not high
If dark circles + low sleep

Recommend:

sleep consistency
hydration
gentle eye-area care

Always return:

AM routine
PM routine
rationale per step
avoid-for-now section
disclaimer
15. /lib/insights/insightEngine.ts

Export:

generateInsights(input: {
  scans?: SkinScan[];
  habits?: DailyHabit[];
  products?: Product[];
  profile?: UserProfile;
}): Insight[]

Rules:

Sleep insight

If average sleep < 6.5h and darkCircles score is low/worsening:

title: Low sleep may be affecting dark circles.
confidence: medium
SPF insight

If SPF missed 3+ days in last 7 and pigmentation score low/worsening:

title: Missed SPF may increase pigmentation risk.
confidence: high if both conditions true
Product irritation insight

If product started within 7–14 days and redness score low/worsening:

title: New product may be contributing to redness.
confidence: low or medium
Hydration insight

If water below goal and hydration score low/worsening:

title: Low water intake may be affecting hydration.
confidence: medium

Each insight must include:

title
description
evidence
recommendedAction
confidence
16. Local Storage Keys

Use these exact keys for demo fallback:

export const LS_KEYS = {
  profile: "skinforward_profile",
  products: "skinforward_products",
  latestScan: "skinforward_latest_scan",
  scanHistory: "skinforward_scan_history",
  habits: "skinforward_habits",
  routines: "skinforward_routines",
  insights: "skinforward_insights",
  simulations: "skinforward_simulations"
};
17. Supabase Contract

Supabase is optional for demo. App must not crash if missing.

Env vars:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

If missing:

use localStorage/demo mode.
API routes return mock/demo data.

Create /supabase/schema.sql.

Tables:

users
user_profiles
skin_scans
daily_habits
products
routines
routine_steps
insights
simulations

Minimal schema:

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skin_type TEXT,
  sensitivity_level TEXT,
  routine_experience TEXT,
  budget_level TEXT,
  primary_goals JSONB DEFAULT '[]',
  water_goal_ml INTEGER DEFAULT 2000,
  sleep_goal_hours NUMERIC DEFAULT 7.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skin_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score NUMERIC,
  hydration_score NUMERIC,
  redness_score NUMERIC,
  acne_score NUMERIC,
  pore_score NUMERIC,
  texture_score NUMERIC,
  wrinkle_score NUMERIC,
  dark_circle_score NUMERIC,
  pigmentation_score NUMERIC,
  radiance_score NUMERIC,
  oiliness_score NUMERIC,
  facial_tone_data JSONB,
  raw_skin_analysis_response JSONB,
  raw_color_tone_response JSONB,
  is_mock BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE daily_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  water_intake_ml INTEGER,
  sleep_hours NUMERIC,
  used_spf BOOLEAN,
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  exercise_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  active_ingredients JSONB DEFAULT '[]',
  usage_time TEXT,
  frequency TEXT,
  date_started DATE,
  date_stopped DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  generated_from_scan_id UUID REFERENCES skin_scans(id),
  rationale TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  category TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  instruction TEXT NOT NULL,
  rationale TEXT,
  frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',
  recommended_action TEXT,
  confidence TEXT,
  severity TEXT,
  related_scan_id UUID REFERENCES skin_scans(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_scan_id UUID REFERENCES skin_scans(id),
  scenario_type TEXT NOT NULL,
  source_image_url TEXT NOT NULL,
  simulated_image_url TEXT NOT NULL,
  simulation_years INTEGER DEFAULT 20,
  scenario_description TEXT,
  raw_api_response JSONB,
  is_mock BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
18. Demo User

Create /lib/demoUser.ts.

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_EMAIL = "demo@skinforward.app";

Do not require auth for hackathon demo unless explicitly requested later.

19. API Routes

Required backend routes:

GET    /api/me

POST   /api/profile
GET    /api/profile

POST   /api/scans
GET    /api/scans
GET    /api/scans/latest
GET    /api/scans/[id]

POST   /api/habits
GET    /api/habits
GET    /api/habits/today

POST   /api/products
GET    /api/products
PATCH  /api/products/[id]
DELETE /api/products/[id]

POST   /api/routines/generate
GET    /api/routines/active

POST   /api/insights/generate
GET    /api/insights

GET    /api/trends

POST   /api/simulations
GET    /api/simulations

GET    /api/dashboard

API behavior:

Use Supabase if configured.
Otherwise return demo/mock response.
Never crash because env vars are missing.
Validate input minimally.
Return JSON with useful errors.
20. API Response Contracts
POST /api/scans

Request:

multipart/form-data
image: File
scanDate?: string

Response:

{
  scanId: string;
  imageUrl: string;
  overallScore: number;
  metrics: SkinMetrics;
  topConcerns: string[];
  summary: string;
  isMock: boolean;
}

Backend flow:

receive image
create temporary/local/object URL
call analyzeSkin
call analyzeFacialTone
normalize metrics
calculate score
calculate top concerns
save if DB available
return response
GET /api/scans/latest

Response:

SkinScan | null
GET /api/scans

Query:

from?: YYYY-MM-DD
to?: YYYY-MM-DD
limit?: number

Response:

{ scans: SkinScan[] }
GET /api/scans/[id]

Response:

SkinScan
POST /api/profile

Request:

UserProfile

Response:

{ profile: UserProfile; status: "saved" }
GET /api/profile

Response:

UserProfile
POST /api/habits

Request:

DailyHabit

Response:

{ habit: DailyHabit; status: "saved" }
GET /api/habits/today

Response:

DailyHabit | null
GET /api/habits

Query:

from?: YYYY-MM-DD
to?: YYYY-MM-DD

Response:

{ habits: DailyHabit[] }
POST /api/products

Request:

Product

Response:

{ product: Product; status: "created" }
GET /api/products

Response:

{ products: Product[] }
PATCH /api/products/[id]

Request:

Partial<Product>

Response:

{ product: Product; status: "updated" }
DELETE /api/products/[id]

Response:

{ status: "deleted" }
POST /api/routines/generate

Request:

{
  scanId?: string;
  includeExistingProducts: boolean;
}

Response:

RoutineResponse
GET /api/routines/active

Response:

RoutineResponse
POST /api/insights/generate

Request:

{ lookbackDays?: number }

Response:

{ insights: Insight[] }
GET /api/insights

Response:

{ insights: Insight[] }
GET /api/trends

Query:

range=7d|30d|90d
metrics=hydration,redness,pigmentation,darkCircles,texture,radiance

Response:

{
  range: "7d" | "30d" | "90d";
  series: Record<string, { date: string; value: number }[]>;
  radar: {
    baseline: Partial<SkinMetrics>;
    current: Partial<SkinMetrics>;
  };
  callouts: string[];
}
POST /api/simulations

Request:

{
  sourceScanId?: string;
  scenarioType:
    | "consistent_spf_routine"
    | "skip_spf"
    | "stop_routine"
    | "current_trajectory";
  simulationYears: number;
}

Response:

SimulationResponse
GET /api/simulations

Response:

{ simulations: SimulationResponse[] }
GET /api/dashboard

Response:

{
  latestScan: SkinScan | null;
  streaks: {
    spf: number;
    routine: number;
    scan: number;
  };
  todayHabits: DailyHabit | null;
  topInsight: Insight | null;
  activeRoutinePreview: {
    AM: string[];
    PM: string[];
  };
}
21. Page Contracts
/

Landing page.

Must include:

app name
headline
subheadline
3 value cards
CTA to /onboarding

Copy:

Track your skin. Understand your habits. See your future.

Subheadline:

Daily AI skin scans, habit tracking, personalized routines, and future-aging simulations.

CTA:

Start Skin Scan
/onboarding

Client-side multi-step flow.

Steps:

Goals
Skin profile
Product shelf setup
Baseline scan CTA

Goals:

reduce_acne
improve_hydration
reduce_redness
fade_dark_spots
improve_texture
prevent_aging
reduce_dark_circles
build_consistency

Persist:

profile to skinforward_profile
products to skinforward_products

Final CTA goes to /scan.

/scan

Must include:

image upload
preview image
scan guidance
analyze button
loading state

Scan guidance:

Face bright, even light.
Remove glasses if possible.
Keep neutral expression.
Center face in frame.

On analyze:

call POST /api/scans
store response in localStorage
redirect to /scan/[scanId]
/scan/[scanId]

Must include:

overall score
top 3 concerns
radar chart
metric cards
scan summary
mock/demo label if isMock
CTA to /routine
CTA to /dashboard
/dashboard

Must include:

latest score
top concerns
streak cards
top insight
habit quick summary
routine preview
CTA to scan
CTA to future simulation

If no scan exists:

show empty state with CTA to /scan.
/habits

Must include form:

waterIntakeMl
sleepHours
usedSpf
stressLevel
exerciseMinutes
notes

Persist to:

localStorage
API route if available
/products

Must include:

product list
add product form/modal
edit product
delete product
smart labels

Smart labels:

New product: started within 14 days
Possible trigger: exfoliant/retinoid + latest redness < 75
Supports pigmentation: vitamin_c, niacinamide, azelaic_acid
Barrier support: ceramides, glycerin, hyaluronic_acid
/routine

Must include:

AM routine
PM routine
step rationale
avoid-for-now section
disclaimer

Generate from:

latest scan
profile
products
habits

CTA:

view trends
log habits
/trends

Must include:

7D / 30D / 90D toggle
metric selector
line chart
radar chart
callout cards

Metrics:

hydration
redness
pigmentation
darkCircles
texture
radiance

If no history:

generate mock historical series from latest scan.
/insights

Must include insight cards:

title
description
confidence
evidence
recommended action

Include CTA to:

routine
habits
future
/future

Must include:

latest/current image
scenario selector
generate simulation button
current/future image panel
scenario explanation
disclaimer
mock label if mock mode

Scenarios:

consistent_spf_routine
skip_spf
stop_routine
current_trajectory

Scenario descriptions:

consistent_spf_routine:
Illustrative 20-year simulation assuming daily SPF and routine consistency.

skip_spf:
Illustrative 20-year simulation assuming inconsistent sun protection.

stop_routine:
Illustrative 20-year simulation assuming skincare routine abandonment.

current_trajectory:
Illustrative 20-year simulation based on current habit consistency.
/settings

Must include:

demo mode indicator
privacy preferences UI
delete local demo data button
disclaimer
env/API status if useful
22. Chart Requirements

Use Recharts.

Radar chart:

compare current metrics.
optionally compare baseline vs current.

Line chart:

show metric trend over selected date range.

Do not hardcode many custom colors unless necessary.
Keep charts readable and responsive.

23. UI Style

Style direction:

clean
premium wellness
mobile-first
soft cards
clear hierarchy
minimal clutter
high contrast text
no childish gamification

Use:

rounded cards
subtle borders
large score display
concise insight cards
simple CTAs

Avoid:

dense dashboards
medical-looking warnings
overanimated UI
excessive gradients
tiny chart labels
24. Copy Rules

Use plain, responsible language.

Good:

Your hydration score is lower this week.

Avoid:

You are dehydrated.

Good:

Missed SPF may contribute to pigmentation risk.

Avoid:

You will develop sun damage.

Good:

This simulation is illustrative.

Avoid:

This is what you will look like.
25. Required Disclaimer

Use on routine, insights, scan report, and future pages:

SkinForward provides wellness and skincare guidance only. It does not diagnose, treat, or prevent medical conditions. For persistent or severe skin concerns, consult a licensed dermatologist.
26. Insight Confidence Rules

Confidence values:

low | medium | high

Guidance:

low: weak correlation, limited data, one event
medium: repeated pattern across several days
high: repeated pattern + matching scan trend + strong habit/product signal
27. Streak Rules

Streaks:

SPF streak: consecutive days usedSpf === true
Scan streak: consecutive days with scan
Routine streak: mock or inferred from routine completion; fallback to demo number

If insufficient data:

display 0 or mock demo value with demo label.
28. Trend Fallback

If fewer than 2 scans exist:

create synthetic historical demo series from mock data.
Keep deterministic.
Do not randomize on every refresh.

Example:

baseline = current metric - small delta
current = latest metric
29. Product Smart Label Rules
isNew = dateStarted within 14 days

possibleTrigger =
  category includes "exfoliant" or "retinoid" or activeIngredients include "aha", "bha", "retinol"
  AND latestScan.metrics.redness < 75

supportsPigmentation =
  activeIngredients include "vitamin_c", "niacinamide", "azelaic_acid"

barrierSupport =
  activeIngredients include "ceramides", "glycerin", "hyaluronic_acid"
30. Future Simulation Rules

If real Perfect aging API unavailable:

return placeholder simulated image.
acceptable mock methods:
reuse source image with overlay label,
use static placeholder,
use CSS split panel with scenario text.

Response must include:

isMock: true
scenarioDescription
simulatedImageUrl
31. File Upload Rules

For MVP:

client previews local image.
API accepts multipart image.
if no storage configured, use mock URL or data URL fallback.
do not block demo due to storage setup.

Production note may be TODO.

32. Environment Variables

Create .env.example:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Perfect Corp
PERFECT_API_KEY=
PERFECT_API_BASE_URL=
PERFECT_SKIN_ANALYSIS_ENDPOINT=
PERFECT_FACIAL_TONE_ENDPOINT=
PERFECT_AGING_SIMULATION_ENDPOINT=

# Demo
NEXT_PUBLIC_DEMO_MODE=true
33. README Requirements

Create README.md with:

project summary
feature list
tech stack
setup
env vars
demo mode
Perfect API notes
disclaimer

Minimal setup:

npm install
cp .env.example .env.local
npm run dev
34. Build Order

Implement in this order:

Core types and mock data
Skin score utility
Perfect client mock wrapper
Routine engine
Insight engine
App shell/navigation
Landing page
Onboarding
Scan upload + mock analysis
Scan result page
Dashboard
Habits
Products
Routine page
Trends page
Insights page
Future page
Supabase optional integration
Perfect real API wrapper TODO mapping
QA/polish

Do not start Perfect real API mapping before mock demo flow works.

35. Quality Bar

The final app must:

run locally,
build without TypeScript errors,
have no broken required routes,
complete demo flow in mock mode,
not crash without Supabase,
not crash without Perfect credentials,
show radar chart,
show line chart,
show skin score,
show recommendations,
show future simulation mock or real result,
include disclaimers,
keep API keys server-only.
36. Error Handling

API routes must return:

{
  error: string;
  details?: unknown;
}

Use appropriate status codes:

400 invalid input
404 not found
500 unexpected server error

Client must show user-friendly error cards.

37. Security Rules
Never expose PERFECT_API_KEY.
Never call Perfect API from browser.
Do not commit .env.local.
Use server-side API routes for external calls.
In demo mode, avoid storing sensitive real face data unless storage is configured.
Include local data reset in settings.
38. Accessibility

Minimum:

buttons have accessible text
forms have labels
charts have textual summaries
image upload has label
color is not only signal
sufficient contrast
39. Performance

MVP expectations:

avoid huge dependencies beyond chosen stack
lazy-load heavy chart components if needed
keep API responses small
do not store massive base64 images repeatedly in localStorage unless necessary
40. Acceptance Criteria

The project is complete when:

User lands on /.
User can complete onboarding.
User can upload/select selfie.
App returns skin analysis in mock mode.
User sees score, concerns, radar chart, and metric cards.
User can log habits.
User can add products.
User can generate routine.
User can view trends with line chart and radar chart.
User can view insights.
User can generate future simulation scenario.
Demo works without Perfect credentials.
Demo works without Supabase credentials.
Build passes.
README and .env.example exist.
41. Agent Instructions

When implementing:

Build only the requested slice.
Do not refactor unrelated files.
Keep code typed and simple.
Prioritize demo reliability.
Use mock fallback first.
Avoid premature optimization.
After each task, output only:
changed files
env vars needed
known issues

Do not output long explanations unless asked.

42. Compact Agent Prompt

Use this to start the build:

Build SkinForward per BUILD_CONTRACT.md.

Use Next.js App Router, TypeScript, Tailwind, Recharts. Supabase and Perfect Corp APIs must be optional with deterministic mock fallback. Never expose Perfect API keys to the frontend.

Implement in slices:
1. shared types/utilities/mock data
2. app shell/navigation
3. onboarding
4. scan mock flow
5. scan results
6. dashboard/habits/products
7. routine engine/page
8. trends/charts
9. insights
10. future simulation
11. optional Supabase/Perfect wrappers
12. QA polish

Prioritize the required demo flow:
Landing → Onboarding → Scan → Skin Report → Dashboard → Habits → Routine → Trends → Insights → Future.

Do not build medical diagnosis features. Include wellness disclaimer on scan, routine, insights, and future pages.

After each slice, list changed files, env vars, and known issues only.
43. Definition of Done
npm install works
npm run dev works
npm run build works
all required pages load
mock scan works
mock future simulation works
charts render
localStorage fallback works
Supabase missing env does not break app
Perfect missing env does not break app
disclaimers visible
README exists
.env.example exists