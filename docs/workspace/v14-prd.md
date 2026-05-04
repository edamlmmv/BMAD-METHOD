---
title: "BMAD Workspace V14 PRD"
description: Evidence Index and operator trust requirements
---

# BMAD Workspace V14 PRD

## Overview

V14 adds a read-only Evidence Index so operators can inspect Workspace Session
artifacts, checksums, validation state, and next manual actions without
expanding runtime authority. It also upgrades new archives to V2 by including
`evidence-index.json` while keeping V1 archive verification compatible.

V14 is trust hardening. It does not add execution, scheduling, restore/replay,
merge/promotion, live adapters, or automatic action from evidence.

## Baseline

V13 freezes the public manual Workspace command contract and verifies docs,
source skill guidance, tests, CI, and package-manager policy. The remaining
risk is operator confidence: humans need one compact evidence view before acting
on handoff, review, closeout, or archive output.

## Goals

- Add read-only `bmad workspace evidence`.
- Add `nextManualAction` to status and evidence checks.
- Include Evidence Index in new archive V2 bundles.
- Validate archive V2 Evidence Index shape and checksum.
- Add Evidence Index section to handoff.
- Add V14 docs, traceability, tests, and release readiness checks.

## Non-Goals

- No `workspace run`.
- No hidden execution, scheduler, watcher, daemon, or background worker.
- No restore, replay, import, merge, promotion, or automatic target repo action.
- No live adapter activation.
- No automatic action from result, review, closeout, handoff, archive, or
  evidence data.
- No `workspace diff` or `workspace compare` in V14.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V14-FR-001 | `evidence` shall emit JSON with `schemaVersion: 1`, `sessionId`, `sessionRoot`, `generatedAt`, `state`, `artifacts`, and `checks`. |
| V14-FR-002 | Evidence artifacts shall include stage, kind, ref, presence, validation state, checksum, byte size, and source command. |
| V14-FR-003 | Evidence checks shall include stable code, severity, message, ref, and next manual action. |
| V14-FR-004 | `status` checks shall include next manual actions while preserving existing stable error codes. |
| V14-FR-005 | `handoff` shall include an Evidence Index section. |
| V14-FR-006 | New archives shall use `archiveVersion: 2` and include `evidence-index.json`. |
| V14-FR-007 | `verify-archive` shall accept V1 archives and validate V2 Evidence Index files. |
| V14-FR-008 | V14 docs, source skill guidance, command contract, and tests shall list the same command inventory. |
| V14-FR-009 | Evidence and archive changes shall remain read-only or explicit artifact writes only. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- `npm ci && npm run quality` passes before push on the exact checkout.
