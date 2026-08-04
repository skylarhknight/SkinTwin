# SkinForward Demo Checklist

## 1) Future Simulation (Highest Priority)

- [ ] Confirm `.env.local` has `PERFECT_API_KEY` and `PERFECT_API_BASE_URL`.
- [ ] Run one full flow: `/scan` -> `/future` -> generate each scenario once.
- [ ] Verify each run returns a real image (no "Demo data" badge).
- [ ] Keep one known-good source image ready for live demo fallback.

## 2) Mask Overlays (Highest Visual Impact)

- [ ] Run a scan and confirm the "Where we saw it" panel appears on the scan result page.
- [ ] Toggle through every concern chip; confirm each overlay loads (no broken images).
- [ ] Confirm "Hold to see original" reveals the clean selfie.
- [ ] Check server logs for `[persistMaskAssets]` warnings — those masks fall back to expiring URLs.

## 3) Analysis Tier

- [ ] Confirm the scan result banner reads "Measured 10 dimensions" (HD path).
- [ ] If it reads "standard action set", HD is not enabled on the account — note it before judging.
- [ ] Confirm no metric renders at a flat 50 placeholder anywhere.

## 4) Real-Data Credibility

- [ ] Complete at least 3 scans across different days.
- [ ] Log habits across those same days.
- [ ] Verify `/dashboard` streaks match habit/scan history.
- [ ] Verify `/trends` shows lines based on saved scans (not synthetic values).
- [ ] Verify `/insights` shows evidence-backed patterns or an explicit "not enough data yet" state.
- [ ] Verify `/progress` shows a real delta, side-by-side masks, and at least one attribution.

## 5) Demo Script (2-3 minutes)

- [ ] Home -> Scan -> Scan Result
- [ ] Mask overlay: toggle two concerns, hold to compare against the original
- [ ] Progress: score delta, same concern on both dates, one attribution card with its evidence
- [ ] Future simulation (one scenario generate)
- [ ] Wrap with disclaimer + next-step value proposition

## 6) Production Readiness (Platform Neutral)

- [ ] Add all required env vars in hosting platform settings.
- [ ] Deploy and run the same smoke flow in production.
- [ ] Confirm server logs are accessible before judging session.

