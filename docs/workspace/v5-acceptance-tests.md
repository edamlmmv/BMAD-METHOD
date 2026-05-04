---
title: "BMAD Workspace V5 Acceptance Tests"
description: Acceptance tests for read-only status and setup provenance
---

# BMAD Workspace V5 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT5-001 | Inspect V4 traceability. | V4 story rows are Done, Deferred, or Cut with evidence. |
| AT5-002 | Inspect `bmad workspace --help`. | Help lists `status` and uses version-neutral Workspace language. |
| AT5-003 | Run `workspace status` for a missing session. | Command exits nonzero with `SESSION_NOT_FOUND`. |
| AT5-004 | Run `workspace status` for a launched session. | Command exits zero and does not change session files. |
| AT5-005 | Inspect launch-only status. | Output reports blocked state and `MISSING_INTAKE`. |
| AT5-006 | Inspect stale-intake status. | Output reports stale state and `STALE_INTAKE`. |
| AT5-007 | Inspect malformed packet status. | Output reports invalid state and `WORK_PACKET_INVALID_JSON`. |
| AT5-008 | Inspect reviewed session status. | Output reports review present and ready state. |
| AT5-009 | Create packet with missing local setup ref. | Command fails with `SETUP_REF_MISSING` and writes no partial packet. |
| AT5-010 | Create packet with local setup refs. | Packet records local `sha256`; status catches checksum drift. |
| AT5-011 | Create packet with `external:<ref>`. | Packet/status record warning-only `external-unverified` with no fetch. |
| AT5-012 | Inspect docs and help for engine verbs. | No new run, daemon, scheduler, or auto-promotion workflow appears. |
| AT5-013 | Inspect blocked Base Improvement Session. | Readiness reports blocked without mutation. |
| AT5-014 | Inspect reviewed Base Improvement Session. | Readiness reports `ready-for-human-review` without Promotion behavior. |
| AT5-015 | Inspect V5 traceability. | Acceptance IDs map to stories, tests, and first code surfaces. |
