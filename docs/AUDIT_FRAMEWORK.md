# GAITBRIDGE — Audit & Logging Framework

**Version:** 0.1.0-draft | **Date:** 2026-04-06

---

## 1. Audit Domains

### Domain 1: Product Decision Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Feature scope changed | info | PRD update merged |
| Out-of-scope work attempted | warning | Scope violation detected |
| Acceptance criteria modified | info | Issue updated |

### Domain 2: Model / Provider Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Pose provider changed | warning | Provider config updated |
| Provider version updated | info | Dependency update |
| Extraction confidence drops below baseline | warning | Average confidence < 0.4 |
| Provider initialization failure | critical | Runtime error |

### Domain 3: Policy Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Policy threshold changed | warning | Code change merged |
| Policy version updated | info | Release |
| Policy test failure | critical | CI pipeline |
| Policy bypass attempted | critical | Runtime detection |

### Domain 4: Safety Incident Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Prohibited language in output | critical | Policy filter triggered |
| Diagnostic claim generated | critical | Language safety filter |
| AI response blocked | warning | Guardrail intervention |
| Confidence-inappropriate escalation | warning | Concern engine anomaly |
| User reports harmful output | critical | User feedback |

### Domain 5: Data Access Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| User data accessed | info | Any read operation |
| Data export requested | info | PDF/share generation |
| Data deletion requested | warning | User action |
| Admin access to user data | warning | Admin panel action |
| Unauthorized access attempt | critical | RLS rejection |

### Domain 6: Sharing Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Share link created | info | User action |
| Share link accessed | info | External access |
| Share link expired | info | TTL reached |
| Share link revoked | info | User action |
| Excessive share access | warning | Access count > threshold |

### Domain 7: AI Response Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Navigator message sent | info | User message |
| Navigator response generated | info | LLM response |
| Response filtered by policy | warning | Policy intervention |
| Knowledge card cited | info | Tool use |
| Diagnostic question asked | info | Pattern detection |
| Prohibited claim blocked | critical | Guardrail triggered |

### Domain 8: Release Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Version released | info | Deployment |
| Policy version bumped | warning | Policy change |
| Rollback executed | critical | Emergency |
| Demo freeze activated | info | Pre-demo |

### Domain 9: Demo Readiness Audit
| Event | Severity | Trigger |
|-------|----------|---------|
| Demo checklist completed | info | QA confirmation |
| Demo scenario failure | warning | Test failure |
| Seed data loaded | info | Script execution |
| Demo freeze violation | warning | Merge during freeze |

---

## 2. Audit Event Schema

```typescript
interface AuditEvent {
  id: string;
  userId: string | null;
  eventType: string;            // e.g., 'policy.language_safety.violation'
  severity: 'info' | 'warning' | 'critical';
  domain: AuditDomain;
  entityType: string | null;    // e.g., 'assessment', 'navigator_message'
  entityId: string | null;
  details: Record<string, unknown>;
  policyVersion: string | null;
  appVersion: string;
  timestamp: string;            // ISO 8601
}
```

---

## 3. Retention & Access

| Severity | Retention | Who Can Review |
|----------|-----------|----------------|
| info | 90 days | Admin, relevant role owner |
| warning | 1 year | Admin, Policy Lead, Product Owner |
| critical | 2 years | Admin, Product Owner (mandatory review) |

**Export format:** JSON lines, downloadable by admin role.

---

## 4. Alert Triggers

| Condition | Alert Action |
|-----------|-------------|
| Any critical severity event | Notify Product Owner + Policy Lead immediately |
| > 5 policy violations in 1 hour | Notify all leads |
| AI response blocked 3 times in one session | Flag session for review |
| Share link accessed > 50 times | Flag for abuse review |
| Data deletion requested | Confirm with user, notify admin |
