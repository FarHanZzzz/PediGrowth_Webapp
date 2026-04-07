# Pedi-Growth — Demo Runbook

**Version:** 0.1.0-draft | **Date:** 2026-04-06

---

## Pre-Demo Checklist

- [ ] Demo freeze active (no merges for 12h before demo)
- [ ] Production build deployed and verified
- [ ] Seed data loaded (2 child profiles, 3 assessments, 1 timeline)
- [ ] Demo device charged and on stable wifi
- [ ] Backup hotspot available
- [ ] Demo script printed/accessible offline
- [ ] Fallback screenshots prepared

---

## Demo Scenarios

### Scenario 1: Happy Path — Good Video Analysis (3 min)
1. Open app on phone → show mobile landing page
2. Click "Get Started" → consent page
3. Accept consent → intake form
4. Fill: "Alex", age 4, independent walker, suspected, no orthotics, weekly falls
5. Submit → routing shows Route B (gait analysis)
6. Capture guidance → show overlay instructions
7. Upload pre-recorded good demo video
8. Quality assessment → PASS (show green metrics)
9. Analysis progress → pose extraction animation
10. Results → show caregiver summary with 3 concern domains
11. Show confidence card and limitations panel
12. Navigate to clinician packet → show structured metrics table
13. Generate PDF → show exportable document
14. Create share link → show secure link

### Scenario 2: Bad Video Rejection (1 min)
1. From results, navigate to "New Assessment"
2. Upload pre-recorded bad (shaky) demo video
3. Quality assessment → FAIL
4. Show specific failure reasons (camera motion, occlusion)
5. Show retake guidance with clear instructions
6. Emphasize: "The system protects against unreliable analysis"

### Scenario 3: Timeline / Longitudinal (1 min)
1. Navigate to timeline (pre-seeded with 3 assessments)
2. Show trend chart — metric changes over time
3. Show "improved" / "stable" / "worsening" indicators
4. Highlight intervention log entry near assessment date
5. Emphasize: "More valuable after every use"

### Scenario 4: AI Navigator (1 min)
1. Open navigator
2. Ask: "What does the asymmetry concern mean?"
3. Show structured explanation from report data
4. Ask: "Does my child have cerebral palsy?"
5. Show refusal: redirects to professional evaluation
6. Emphasize: "Bounded AI — knows what it doesn't know"

### Scenario 5: Infant Route A (30 sec)
1. Start new profile: age 14 months, non-ambulant
2. Routing → Route A
3. Show concern navigator (no gait scoring)
4. Show red-flag checklist and referral prep
5. Emphasize: "Age-appropriate, never forces gait analysis on non-walking children"

---

## Backup Plan

If live demo fails:
1. Switch to pre-recorded video walkthrough (record during QA phase)
2. Show static screenshots with narration
3. Focus on architecture diagram and safety design

---

## Key Talking Points

- "Smartphone video → structured gait concerns, not diagnoses"
- "Quality-gated: bad video is rejected, not analyzed"
- "Everything explainable: no black boxes"
- "Privacy by default: video never stored unless opted in"
- "AI navigator that knows its boundaries"
- "Useful after one visit, more useful after three"
