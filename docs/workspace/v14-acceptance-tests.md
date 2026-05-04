---
title: "BMAD Workspace V14 Acceptance Tests"
description: Acceptance tests for Evidence Index and operator trust
---

# BMAD Workspace V14 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT14-001 | Inspect V14 planning artifacts and index links. | PRD, backlog, acceptance tests, traceability, operator guide, and release checklist exist and are linked. |
| AT14-002 | Run `workspace evidence` for a missing Session. | Command exits nonzero with `SESSION_NOT_FOUND` and an actionable next manual action. |
| AT14-003 | Run `workspace evidence` after launch only. | Command exits zero, is read-only, reports invalid state, missing intake and packet checks, and artifact entries. |
| AT14-004 | Run `workspace evidence` after packet creation. | Output reports packet artifacts, checksums, validation states, warnings, and next manual actions. |
| AT14-005 | Inspect status checks. | Checks preserve stable codes and include `nextManualAction`. |
| AT14-006 | Inspect handoff. | Markdown includes `## Evidence Index` with state, artifact count, issue count, and next manual action. |
| AT14-007 | Archive a reviewed Session. | New archive uses `archiveVersion: 2`, writes `evidence-index.json`, and verifies cleanly. |
| AT14-008 | Verify a V1 archive. | `verify-archive` remains backward compatible. |
| AT14-009 | Tamper archive Evidence Index. | `verify-archive` exits nonzero with evidence or checksum validation error. |
| AT14-010 | Inspect forbidden behavior language. | V14 keeps run, scheduler, watcher, daemon, restore/replay, merge/promotion, live adapters, and hidden execution out. |
| AT14-011 | Run Workspace contract tests. | Tests fail on Evidence Index shape, command inventory, archive V2, docs, or source skill drift. |
| AT14-012 | Run push gate. | `npm ci && npm run quality` passes on the exact checkout before push. |
