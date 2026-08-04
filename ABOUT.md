# About SkinTwin

**SkinTwin is a skincare wellness app that turns a selfie into measured skin data, then keeps
measuring — so a person can finally tell whether their routine is actually working.**

Most skincare decisions are made from memory and mirror-checking. People buy a serum, use it for a
month, and have no idea whether their skin changed, whether the change came from the serum, from
sleeping better, or from the season. SkinTwin closes that loop: it uses Perfect Corp's YouCam APIs
to score ten dimensions of skin from a photo, logs the habits and products in between scans, and
produces a scan-to-scan progress report that says what moved, by how much, and what was happening in
the user's routine while it moved.

---

## Project description

Skincare is a category where people spend for years and get almost no feedback. A serum goes on the
shelf, a month passes, and the only evidence anyone has is a memory of what their face looked like in
a different bathroom light. SkinTwin fixes the missing measurement.

**Take a selfie.** SkinTwin runs it through Perfect Corp's YouCam AI Skin Analysis API and returns a
scored reading across ten dimensions — hydration, redness, acne, pores, texture, wrinkles, dark
circles, pigmentation, radiance, and oiliness — rolled into a single SkinTwin Score, with mask
overlays that show *where* on the face each concern was detected. The YouCam Facial Color Tones API
adds undertone and tone indices; the YouCam Skin Simulation API renders the user's own face on four
future trajectories, including the one where they keep skipping SPF.

**Then keep living.** Log sleep, water, SPF, and stress. Add products to a shelf with start and stop
dates. The app builds a sensitivity-aware AM/PM routine from the measured scores, ranks catalog
products against the user's actual concern deficits, undertone, skin type, and budget, and surfaces
patterns — missed SPF against pigmentation, a new exfoliant against rising redness, short sleep
against dark circles.

**Then scan again.** This is where SkinTwin earns its name. The progress report compares two scans and
explains the delta using what was logged in between: what improved, what declined, what held steady,
which products were running, and how consistent the habits were. It is deliberately honest —
dimensions measured in only one scan are excluded rather than guessed, moves inside ±3 points are
called noise rather than progress, and habit and product links are labeled as timing overlaps with a
confidence grade, never as proven cause. The app will tell a user their product did nothing. That is
the feature.

**Why it matters commercially.** Diagnostic-led recommendation converts better and returns less than
quiz-led guessing, because it is grounded in a real reading of a real face. Scanning is inherently
recurring, so measurement itself becomes the retention loop. And the progress report gives a brand
something marketing copy cannot buy: individual, timestamped evidence that a customer's skin changed
while their product was on the shelf — stated with a confidence grade the customer can trust. For the
consumer, it converts skincare from a purchase habit into a measurable practice. For a retailer, it
converts a catalog into a diagnostic service with first-party skin data underneath it.

SkinTwin is wellness guidance, not medicine. It recommends ingredient families and product
categories, grades its own confidence, and points persistent or severe concerns to a dermatologist.

---

## The YouCam APIs in SkinTwin

SkinTwin is built on Perfect Corp's YouCam / Perfect Corp server-to-server (S2S) APIs. Three are
integrated, each backing a distinct product surface.

### 1. AI Skin Analysis — the core measurement engine

**Where:** `/scan`, `/scan/[scanId]`, `/dashboard`, `/progress`, `/trends`
**Code:** `lib/perfect/skinAnalysisPipeline.ts`, `lib/perfect/perfectClient.ts`

This is the API the whole product stands on. Every score, chart, routine, recommendation, and
progress report in SkinTwin traces back to a Skin Analysis task.

The full S2S v2.1 flow is implemented end to end:

1. `POST /s2s/v2.1/file/skin-analysis` with content type, filename, and byte size to obtain a
   `file_id` and a presigned upload target.
2. `PUT` the raw image bytes to the presigned URL with the headers Perfect returns.
3. `POST /s2s/v2.1/task/skin-analysis` with `src_file_id`, the requested `dst_actions`, and
   `miniserver_args: { enable_mask_overlay: true }`.
4. `GET /s2s/v2.1/task/skin-analysis/{task_id}` on a 2-second poll (up to 45 attempts) until
   `task_status` is `success`.

**HD-first with an SD fallback.** SkinTwin requests the ten HD concerns by default —
`hd_moisture`, `hd_redness`, `hd_acne`, `hd_pore`, `hd_texture`, `hd_wrinkle`, `hd_dark_circle`,
`hd_age_spot`, `hd_radiance`, `hd_oiliness` — because they map 1:1 onto the ten dimensions the UI
renders. If the account lacks HD entitlement, the pipeline detects that the *actions* were rejected
(rather than the photo) and retries once on the SD triad `acne`, `wrinkle`, `age_spot`, reusing the
already-uploaded file. HD and SD are never mixed in one task. `PERFECT_DST_ACTIONS` overrides the
set. Each scan is stored with the tier that actually ran.

**Only measured dimensions are shown.** Perfect's `output[]` rows are mapped to app metric keys, and
the app records exactly which keys came back (`analyzedMetricKeys`). Anything Perfect did not
measure is excluded from the radar chart, the metric grid, and every scan-to-scan comparison rather
than being rendered at a placeholder value — a fake 50 sitting next to real readings reads as a real
reading, which is exactly the kind of thing that erodes trust in a consumer health-adjacent product.

**Mask overlays.** Because tasks are submitted with `enable_mask_overlay`, each concern comes back
with a per-concern overlay image showing *where* on the face it was detected. SkinTwin extracts
those URLs, copies the images into its own Supabase Storage bucket (Perfect's presigned links
expire), and renders them in an interactive viewer on the scan result page and side-by-side in
progress reports (`components/SkinMaskViewer.tsx`, `components/ProgressMaskCompare.tsx`,
`lib/supabase/persistMasks.ts`). This is what turns a number into something a user can see.

**Honest error handling.** Perfect's rejection codes are translated into actionable guidance instead
of a generic failure — `error_src_face_too_small` becomes "use a well-lit photo where your face
fills most of the frame," `error_src_face_out_of_bound` becomes "center your head and avoid tight
crops." Photo rejections never silently degrade into mock data.

### 2. AI Facial Color Tones Analyzer — undertone and tone indices

**Where:** scan results, `/recommendations`
**Code:** `lib/perfect/facialTonePipeline.ts`

Runs the same file → task → poll flow against `/s2s/v2.1/*/facial-color-tones`, returning the user's
undertone (warm / cool / neutral / olive) plus pigmentation and redness indices. Undertone feeds the
product recommendation engine's `undertoneFit` matching, so shade- and tone-sensitive
recommendations reflect the user's actual skin rather than a generic average.

### 3. AI Skin Simulation — future-trajectory scenarios

**Where:** `/future`
**Code:** `lib/perfect/skinSimulationPipeline.ts`

Uses Perfect's Skin Simulation v2 flow (`/s2s/v2.0/*/skin-simulation`) to render what the user's own
face plausibly looks like on four different trajectories. Each scenario is a distinct intensity
profile across ten simulation dimensions (wrinkle, radiance, oiliness, acne, eye bags, dark circle,
spots, pores, texture, redness) so the scenarios are visibly different rather than four copies of
one image:

| Scenario | Framing |
| --- | --- |
| `consistent_spf_routine` | Daily SPF and routine consistency held |
| `current_trajectory` | Current habit consistency continued |
| `skip_spf` | Inconsistent sun protection |
| `stop_routine` | Skincare abandoned |

Results are shown through a before/after slider (`components/BeforeAfterSlider.tsx`) and labeled as
illustrative simulations, not predictions.

### Graceful degradation

If `PERFECT_API_KEY` / `PERFECT_API_BASE_URL` are absent, every pipeline returns deterministic mock
responses so the app is fully explorable without credentials. Anything mock-backed is labeled in the
UI (`components/DataModeBadge.tsx`, `mockFallbackNote`), and simulation fallbacks carry a plain
explanation of *why* the real call didn't complete. Real analysis is never quietly swapped for fake
numbers.

---

## What the app does

### Scan
Live camera selfie capture with an upload fallback. The photo runs through Skin Analysis and Facial
Color Tones, and returns a **SkinTwin Score** (a weighted composite across measured dimensions —
hydration and radiance weigh heaviest, oiliness is directional and excluded from the score), the top
concerns, the ten-dimension radar, and the per-concern mask overlays.

### Progress — the differentiating feature
`/progress` compares any two scans and explains the change using what was logged in between. It is
deliberately conservative, because an over-confident health claim is worse than no claim:

- Only dimensions measured in **both** scans are compared; the rest are explicitly listed as not
  comparable.
- Moves within ±3 points are reported as **steady**, since Perfect's scores carry real lighting and
  framing noise between sessions.
- Habit and product links are framed as *timing overlaps*, never as proven cause, and each carries a
  confidence grade derived from window length and logging consistency.
- The report also surfaces adherence: SPF rate, average sleep, water, stress, and log rate over the
  window, plus which products were started, running, or stopped during it.
- Mask overlays from both scans are shown side by side, so a change in a pigmentation score can be
  checked against where the pigmentation actually is.

### Trends
Scan history charted over time, per dimension, so slow movement becomes visible.

### Habits
Daily logging of sleep, water, SPF, stress, and exercise. This is the input that makes progress
reports explanatory rather than merely descriptive.

### Products
A personal product shelf with active ingredients, AM/PM usage, frequency, and start/stop dates. Start
and stop dates are what allow the progress engine to line a product up against a window of change.

### Routine
A generated AM/PM routine derived from measured scores plus the user's profile (skin type,
sensitivity, experience, budget, goals). It is rule-driven and safety-aware: high sensitivity
suppresses acid and active-treatment steps and populates an explicit **avoid for now** list; low
logged sleep paired with low dark-circle scores adds a sleep-consistency step instead of pushing
another eye product.

### Recommendations / Shop
Products from a catalog scored 0–100 against the user's ranked concern deficits, skin type,
undertone, and budget, each with a plain-language "why this matches you" headline and explicit
warnings when a product carries a high-risk active for sensitive skin.

### Insights
Pattern detection across scans, habits, and products — low sleep against dark circles, missed SPF
days against pigmentation, a newly introduced exfoliant against rising redness, low water intake
against hydration. Every insight ships with its evidence, a recommended action, and a confidence
level.

### Future
The four Skin Simulation scenarios, as a motivation surface rather than a diagnostic one.

### Onboarding, auth, and demo mode
Goal/sensitivity/budget onboarding, Supabase Auth when configured with a local demo session
otherwise, and a one-click demo seed so the full experience can be evaluated in seconds.

---

## Consumer and retail value

**For the consumer.** Skincare is one of the few categories where people spend continuously for
years with almost no feedback signal. SkinTwin replaces "I think my skin looks better" with a
measured, repeatable reading of ten dimensions, an image showing where each concern sits on the
face, and a report that connects the change to the SPF they did or didn't wear and the serum they
started three weeks ago. That converts skincare from a purchase habit into a measurable practice —
and it tells users the uncomfortable thing too, which is the part that builds trust: that a product
did nothing, or that the ±2 point "improvement" is noise.

**For brands and retailers.** The same loop is a commercial engine:

- **Diagnostic-led merchandising.** Recommendations are grounded in a real reading and the user's
  undertone, skin type, sensitivity, and budget — not a quiz. Grounded recommendations convert
  better and get returned less.
- **Proof of efficacy at the individual level.** The progress report is the first thing a brand can
  point a customer at to show their product coincided with a measured change, with an honest
  confidence grade attached. That is a repurchase argument no marketing copy can make.
- **Retention through measurement.** Scanning is inherently recurring. Every scan is a session,
  every progress report is a reason to come back, and the habit tracker gives a reason to open the
  app on days without a scan.
- **Regimen expansion at the right moment.** Concern deficits surface the specific gap in a
  customer's shelf — and the routine engine only recommends into it when sensitivity signals allow.
- **Sun-care behavior change.** SPF adherence is tracked, tied to pigmentation outcomes, and
  visualized through the `skip_spf` simulation — the single highest-leverage behavior in the whole
  category.
- **First-party skin data.** Cohort-level concern distributions, adherence rates, and before/after
  outcomes, generated as a byproduct of a service users want to use.

**Where it stays in its lane.** SkinTwin is wellness guidance, not medicine. It does not diagnose,
treat, or prevent medical conditions, it recommends product *categories* and ingredient families
rather than making clinical claims, it grades its own confidence, and it surfaces a disclaimer
pointing persistent or severe concerns to a licensed dermatologist.

---

## Building on the Skin API

### Was there a moment where the Skin API surprised you?

Twice, in opposite directions.

The good one: `enable_mask_overlay`. We started out treating Skin Analysis as a scoring
endpoint — ten numbers, a radar chart, done. Then we flipped on `miniserver_args:
{ enable_mask_overlay: true }` and got back per-concern overlay images showing *where* on the face
each concern was detected. That single flag changed the product. A pigmentation score of 62 is an
abstraction a user has no way to verify; a map of their own face with the pigmentation regions lit
up is evidence. It's the reason `components/SkinMaskViewer.tsx` and `ProgressMaskCompare.tsx` exist
at all, and it's what makes the progress report checkable instead of merely assertable — you can
look at whether the pigmentation actually receded in the same places the number moved.

The frustrating one: HD entitlement failing like a bad photo.** We built the whole app against
the ten HD concerns (`hd_moisture`, `hd_redness`, `hd_acne`, …) because they map 1:1 onto the ten
dimensions the UI renders. On an account without HD entitlement, the task fails — but the failure
arrives shaped a lot like a rejected photo. Our first pass showed users "retake your selfie in
better light" for an image that was completely fine, which is the worst possible failure mode in a
health-adjacent app: it blames the user for a billing state. Distinguishing "your *actions* were
rejected" from "your *photo* was rejected" turned into a real piece of engineering rather than an
afterthought.

The other surprise was more subtle: score noise between sessions. The same face, same day, different
window light produces meaningfully different readings. That's physics, not a bug — but it forced a
product decision, and it's why anything inside ±3 points is reported as **steady** rather than as
progress.

### Industries and use cases nobody's talking about yet

Most of the conversation around skin APIs is beauty retail and derm-adjacent triage. The scoring
engine is more general than that, and the interesting cases are the ones where skin is a *readout*
of something else:

- **Clinical trial and cosmetic-efficacy evidence.** Efficacy studies currently run on expensive
  standardized-lighting imaging booths and human grader panels. A phone-based, repeatable,
  timestamped ten-dimension reading with region masks is a plausible companion arm for at-home
  compliance measurement between site visits — the same progress-report machinery, with the ±3
  noise floor and confidence grading already built in because trials care about exactly that.
- **Occupational health and PPE programs.** Mask-related dermatitis in healthcare, solvent and
  cutting-fluid exposure in manufacturing, chlorine in aquatics, sun exposure in construction,
  agriculture, and roofing. Redness and texture trending across a workforce is an early indicator
  of a PPE or process failure, and it's currently detected by someone complaining.
- **Insurance and corporate wellness, on the sun-care lane specifically.** SPF adherence is one of
  the highest-leverage and least-measured preventive behaviors in existence. Tying logged SPF to a
  measured pigmentation trajectory — and showing the `skip_spf` simulation of the person's own face
  — is a behavior-change loop that a generic wellness app cannot construct.
- **Sleep, hydration, and stress research.** Dark circles, hydration, and radiance are visible
  proxies for things researchers currently capture by self-report questionnaire. Self-report is
  the weakest data in the field. This is an objective, passive, daily-cadence alternative.
- **Dermatology waitlist triage and teledermatology intake.** Not diagnosis — prioritization. A
  structured, quantified intake with region masks attached arrives at a clinician far more useful
  than "photo plus paragraph."
- **Athletic and military field medicine.** Sun and wind exposure, friction, and heat injury
  monitoring for populations that are outdoors all day and have no routine skin surveillance.
- **Aesthetic post-procedure recovery tracking.** Laser, peel, and microneedling recovery is
  currently monitored by the patient texting a photo and the clinic squinting at it. Redness and
  texture curves with a defined noise floor turn that into an actual recovery baseline.

The common thread: the moment skin measurement becomes cheap, repeatable, and longitudinal, it
stops being a beauty feature and becomes a sensor.

### Where we hit a wall, and how we got around it

**Wall 1 — HD entitlement rejections masquerading as photo rejections.** Described above. The fix
lives in `lib/perfect/skinAnalysisPipeline.ts`: we inspect the failure to determine whether the
*requested actions* were rejected versus the *source image*, and only in the actions case do we
retry — once — on the SD triad (`acne`, `wrinkle`, `age_spot`), reusing the already-uploaded
`file_id` so the user doesn't pay a second upload. HD and SD are never mixed inside one task.
`PERFECT_DST_ACTIONS` overrides the set for testing. Each scan persists the tier that actually
ran, so a scan is never silently compared against a scan from a different tier.

**Wall 2 — expiring presigned mask URLs.** The overlay images that made the product work came back
as presigned links that expire. A progress report that compares a scan from today against one from
six weeks ago is worthless if half its images are dead. So masks are no longer treated as response
data — on task success we copy every overlay into our own Supabase Storage bucket and store our
URLs (`lib/supabase/persistMasks.ts`). Ingestion cost at scan time, permanence forever after.

**Wall 3 — missing dimensions rendering as real readings.** When the SD fallback runs, seven of the
ten dimensions simply don't exist. The naive handling — default them to 50 — produces a radar chart
where fabricated values sit visually indistinguishable from measured ones. In a health-adjacent
product that is not a cosmetic bug, it's a trust failure. The fix was to make "what was actually
measured" a first-class piece of data: every scan records `analyzedMetricKeys`, and the radar
chart, metric grid, composite score, and every scan-to-scan comparison operate only over that set.
Unmeasured dimensions are listed explicitly as not comparable rather than filled in.

**Wall 4 — between-session noise faking progress.** Lighting and framing variance moves scores by a
few points on an unchanged face. Reporting those moves as improvement would have made the app a
flattery machine. We set a ±3 point dead zone reported as **steady**, restricted comparisons to
dimensions present in both scans, and framed every habit and product association as a *timing
overlap* with a confidence grade derived from window length and logging consistency — never as
cause. The app will tell you your product did nothing.

**Wall 5 — a three-API async pipeline with no credentials in most dev environments.** Skin
Analysis, Facial Color Tones, and Skin Simulation each run a four-step file → upload → task → poll
flow, which is a miserable inner loop to develop UI against. Every pipeline falls back to
deterministic mock responses when `PERFECT_API_KEY` / `PERFECT_API_BASE_URL` are absent, so the
whole app is explorable with zero credentials. The rule that keeps that honest: anything
mock-backed is labeled in the UI (`components/DataModeBadge.tsx`, `mockFallbackNote`), and
simulation fallbacks carry a plain explanation of why the real call didn't complete. Real analysis
is never quietly swapped for fake numbers.

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · Supabase (Auth, Postgres, Storage)
· GSAP / Motion and custom WebGL shader surfaces for the visual layer · **Perfect Corp YouCam APIs**
(AI Skin Analysis, AI Facial Color Tones Analyzer, AI Skin Simulation).

---

_SkinTwin provides wellness and skincare guidance only. It does not diagnose, treat, or prevent
medical conditions. For persistent or severe skin concerns, consult a licensed dermatologist._
