---
title: "BMAD Workspace V6 Acceptance Tests"
description: Acceptance tests for Session inventory and Codex handoff
---

# BMAD Workspace V6 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT6-001 | Inspect V6 traceability. | V6 acceptance IDs map to stories, tests, and first code surfaces. |
| AT6-002 | Inspect `bmad workspace --help`. | Help lists `list` and `handoff`. |
| AT6-003 | List missing runtime root. | Command exits zero with empty JSON inventory. |
| AT6-004 | List valid sessions. | Inventory includes sorted valid Session rows and known artifact states. |
| AT6-005 | List invalid dirs. | Inventory includes invalid rows with `SESSION_INVALID`. |
| AT6-006 | List symlink entries. | Symlink entries are not followed and are reported invalid. |
| AT6-007 | Check list read-only behavior. | Runtime tree fingerprint stays unchanged. |
| AT6-008 | Handoff missing session. | Command exits nonzero with `SESSION_NOT_FOUND` and no Markdown. |
| AT6-009 | Handoff invalid session. | Command exits nonzero with `SESSION_INVALID` and no Markdown. |
| AT6-010 | Handoff valid blocked session. | Markdown renders fixed sections and status blockers. |
| AT6-011 | Handoff packet/setup state. | Markdown includes Work Packet, rendered prompt, setup refs, and checksums. |
| AT6-012 | Handoff review state. | Markdown includes review summary and patch refs when present. |
| AT6-013 | Handoff stale or checksum-drift state. | Markdown reports deterministic status checks. |
| AT6-014 | Handoff Base Improvement Session. | Markdown reports readiness diagnostics without durable state action. |
| AT6-015 | Inspect V6 docs and skill. | Source skill and docs describe read-only inventory and handoff. |
