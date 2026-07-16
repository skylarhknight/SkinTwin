# SkinForward Demo Checklist

## 1) Future Simulation (Highest Priority)

- [ ] Confirm `.env.local` has `PERFECT_API_KEY` and `PERFECT_API_BASE_URL`.
- [ ] Run one full flow: `/scan` -> `/future` -> generate each scenario once.
- [ ] Verify each run returns a real image (no "Demo data" badge).
- [ ] Keep one known-good source image ready for live demo fallback.

## 2) Real-Data Credibility

- [ ] Complete at least 3 scans across different days.
- [ ] Log habits across those same days.
- [ ] Verify `/dashboard` streaks match habit/scan history.
- [ ] Verify `/trends` shows lines based on saved scans (not synthetic values).
- [ ] Verify `/insights` shows evidence-backed patterns or an explicit "not enough data yet" state.

## 3) Demo Script (2-3 minutes)

- [ ] Home -> Scan -> Scan Result
- [ ] Dashboard (streaks + latest insight)
- [ ] Trends (range switch + one metric explanation)
- [ ] Future simulation (one scenario generate)
- [ ] Wrap with disclaimer + next-step value proposition

## 4) Production Readiness (Platform Neutral)

- [ ] Add all required env vars in hosting platform settings.
- [ ] Deploy and run the same smoke flow in production.
- [ ] Confirm server logs are accessible before judging session.

