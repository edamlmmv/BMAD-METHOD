---
title: "BMAD Workspace V9 PRD"
description: Manual Result Ledger requirements
---

# BMAD Workspace V9 PRD

## Overview

V9 adds a manual Result Ledger for Workspace Sessions. It records human-run or
externally-run execution outcomes as evidence artifacts before any Workspace
executor exists.

## Goals

- Add `bmad workspace result <sessionId> --input <result-json>`.
- Store append-only result artifacts under `results/<resultId>.json`.
- Link each result to the BMAD Work Packet and stored route.
- Capture outcomes, command records, evidence refs, and failure details.
- Block high-confidence secrets before result persistence or archive exposure.
- Surface result state in status, list, handoff, archive, and verify-archive.

## Non-Goals

- No `workspace run`.
- No command execution from result input.
- No daemon, scheduler, watcher, live adapter, restore, replay, merge, or
  auto-promotion.
- No network secret service or external scanning provider.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V9-FR-001 | Help shall list `result`, `--input <path>`, and `--result-id <id>` while still omitting execution commands. |
| V9-FR-002 | Result recording shall require an existing valid BMAD Work Packet. |
| V9-FR-003 | Result ids shall be safe path segments and duplicates shall fail with `RESULT_EXISTS`. |
| V9-FR-004 | Result input shall be JSON data only; command strings in input shall never be executed. |
| V9-FR-005 | Result artifacts shall include kind, schema version, session id, result id, packet ref, routing, outcome, summary, and optional command/evidence/failure fields. |
| V9-FR-006 | Secret-positive result input shall fail with `RESULT_SECRET_DETECTED` and write no artifact. |
| V9-FR-007 | Status and list shall report result count and latest outcome without making missing results a blocker. |
| V9-FR-008 | Invalid or secret-positive stored results shall appear as blockers. |
| V9-FR-009 | Handoff and archive shall include valid result ledger evidence. |
| V9-FR-010 | Verify archive shall validate copied result shape and checksums. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Before push, `npm ci && npm run quality` passes on the exact checkout.
