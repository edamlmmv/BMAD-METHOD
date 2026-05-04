---
title: "BMAD Workspace V15 Acceptance Tests"
description: Acceptance tests for read-only archive diff
---

# BMAD Workspace V15 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT15-001 | Inspect V15 planning artifacts and index links. | PRD, backlog, acceptance tests, traceability, and release checklist exist and are linked. |
| AT15-002 | Inspect CLI help and command contract. | Both list `diff`, `--left`, and `--right` while omitting `workspace compare` and `workspace run`. |
| AT15-003 | Run `workspace diff` without both sources. | Command exits nonzero with `DIFF_SOURCE_REQUIRED` and a next manual action. |
| AT15-004 | Run `workspace diff` with missing or unsupported sources. | Command exits nonzero with a stable `DIFF_SOURCE_*` error. |
| AT15-005 | Diff identical V2 archives. | Command exits zero, is read-only, and reports no changes. |
| AT15-006 | Diff archives with changed file content. | Output reports the changed file path, SHA-256, and byte counts. |
| AT15-007 | Diff archives with added and removed files. | Output classifies safe relative paths as added or removed. |
| AT15-008 | Diff archive V1 against V2. | Command exits zero and marks Evidence Index deltas as `incomparable`. |
| AT15-009 | Diff invalid archives. | Command fails before diff output with `DIFF_ARCHIVE_INVALID`. |
| AT15-010 | Inspect forbidden behavior language. | V15 keeps run, compare, restore/replay, merge/promotion, scheduler, watcher, daemon, live adapters, and hidden execution out. |
| AT15-011 | Run Workspace contract tests. | Tests fail on diff schema, command inventory, docs, source skill, or guardrail drift. |
| AT15-012 | Run push gate. | `npm ci && npm run quality` passes on the exact checkout before push. |
