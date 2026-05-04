---
title: "BMAD Workspace V13 Acceptance Tests"
description: Acceptance tests for release readiness and contract freeze
---

# BMAD Workspace V13 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT13-001 | Inspect V13 planning artifacts and index links. | PRD, backlog, acceptance tests, traceability, command contract, and release checklist exist and are linked. |
| AT13-002 | Inspect architecture docs. | Docs describe V12/V13 derived lifecycle and full command set without stale current V1/V4 framing. |
| AT13-003 | Inspect command contract. | Contract lists all current Workspace commands, output type, filesystem effect, stable error families, and manual-only rules. |
| AT13-004 | Inspect non-goal language. | Docs and tests keep `workspace run`, scheduler, watcher, daemon, restore/replay, merge/promotion, live adapters, and hidden execution out of V13. |
| AT13-005 | Inspect package-manager artifacts. | `package-lock.json` exists and `yarn.lock` does not exist. |
| AT13-006 | Inspect CI parity. | `.github/workflows/quality.yaml` includes URL tests and Workspace tests in the validation job. |
| AT13-007 | Inspect CLI help and command contract together. | Both list the same Workspace command inventory. |
| AT13-008 | Inspect release-readiness checklist. | Checklist includes `npm ci`, `npm run quality`, Workspace tests, refs validation, skills validation, docs parity, archive verification, and forbidden runtime audit. |
| AT13-009 | Run Workspace contract tests. | Tests fail on stale docs, missing command docs, npm lock drift, CI drift, or command inventory drift. |
| AT13-010 | Run push gate. | `npm ci && npm run quality` passes on the exact checkout before push. |
