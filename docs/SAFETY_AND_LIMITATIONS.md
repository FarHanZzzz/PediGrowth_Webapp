# Pedi-Growth — Safety, Privacy, and Limitations

**Version:** 0.1.0-draft | **Date:** 2026-04-06

---

## 1. Non-Diagnostic Disclaimer (Required on all results)

> **Important:** Pedi-Growth is a gait concern documentation and monitoring support tool. It does NOT diagnose medical conditions, predict diseases, or replace professional clinical evaluation. All observations are based on automated video analysis with inherent limitations. Always consult qualified healthcare professionals for clinical decisions regarding your child's health.

---

## 2. Consent UX Requirements

### Initial Consent (Before intake)
- Full-screen consent page with scrollable text
- Checkbox: "I understand this tool does not provide medical diagnoses"
- Checkbox: "I understand results should be discussed with healthcare professionals"
- Checkbox: "I consent to processing my child's movement data for gait analysis"
- Timestamp and record stored in `consent_records`
- Cannot proceed without all checkboxes

### Video Retention Consent (Separate, optional)
- Presented only when user chooses to save video
- Explains: what is stored, where, for how long, who can access
- Retention duration selection (30/60/90 days)
- Can be revoked at any time

---

## 3. Secure Share Links

- Generated with cryptographic random token (256-bit)
- Default expiry: 30 days (configurable)
- Optional: single-use or limited access count
- Shared view: read-only clinician packet, no edit capability
- Expired links show: "This link has expired. Please request a new one."
- All access events logged to `audit_events`
- User can revoke share links at any time

---

## 4. Confidence Downgrade Behavior

| Condition | Downgrade Action | User-Facing Message |
|-----------|-----------------|---------------------|
| Video quality = borderline | Reduce all metrics confidence by 25% | "Video quality was limited. Results may be less reliable. Consider re-recording." |
| < 3 gait cycles | Reduce all metrics confidence by 30% | "Only [N] walking cycles were captured. More cycles improve accuracy." |
| Frontal-only view | Side-dependent metrics marked "limited" | "Side-view metrics could not be computed from this angle." |
| Low landmark confidence | Suppress concern levels | "Body tracking confidence was low. We recommend re-recording in better conditions." |
| Single assessment | No progression data | "Trend data requires at least two assessments." |

---

## 5. Low-Quality Video Suppression Rules

1. If overall quality = **fail**: No analysis performed. Show retake guidance only.
2. If overall quality = **borderline**: Analysis performed with prominent confidence warning on every output page.
3. If body visibility < 0.3: Suppress all results regardless of other metrics.
4. If detected gait cycles = 0: Suppress all results, suggest recording a longer walking segment.

---

## 6. Risk of Misuse

| Risk | Mitigation |
|------|-----------|
| User interprets concern levels as diagnosis | Disclaimer on every results page; concern ≠ diagnosis language |
| User shares results claiming "app diagnosed CP" | Report includes non-diagnostic disclaimer; share view includes it |
| User delays professional care based on "routine" followup | All outputs include "consult a professional" guidance |
| User records other children without consent | Single-user flow; no batch processing; consent per session |
| Model produces false reassurance | Never say "normal" or "no problems detected"; use "no significant concerns identified in this assessment" |
| Adversarial use (fabricated videos) | Quality gate rejects non-walking content; audit logging |

---

## 7. Prohibited UI/AI Language

See `POLICY_RULES.md` Section 2.4 for full list. Summary:

**Never display:** diagnose, confirm disease, likely has, probability of, certainty, guaranteed, definitive, your child has, risk score, prescribe

**Always use:** concern, observation, follow-up priority, professional evaluation, support, confidence, limitations, we observed

---

## 8. Access Controls

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| Caregiver | Own child profiles, assessments, reports, navigator | Other users' data, admin panel, raw audit logs |
| Clinician | Shared reports (via share link), own annotations | Non-shared assessments, user accounts |
| Admin | Anonymized aggregates, audit logs, feature flags | Individual PII without explicit access grant |

---

## 9. Data Deletion

- User can request full data deletion at any time
- Deletion removes: profiles, assessments, reports, videos, navigator threads
- Deletion preserves: anonymized audit logs (required for safety review)
- Deletion is irreversible — confirmation step required
- Deletion completed within 72 hours
- Confirmation email sent upon completion
