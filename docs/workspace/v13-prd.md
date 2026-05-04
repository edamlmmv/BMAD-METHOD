---
title: "BMAD Workspace V13 PRD"
description: Release readiness and contract freeze requirements
---

# BMAD Workspace V13 PRD

## Overview

V13 makes the V12 Workspace CLI shippable as a coherent, documented, npm-clean
feature. It freezes the public command contract, aligns architecture and index
docs with current behavior, removes package-manager drift, and verifies that CI,
tests, docs, and source skill guidance describe the same manual-only lifecycle.

V13 is hardening work. It does not add execution, scheduling, restore/replay,
merge/promotion, live adapters, or automatic action from evidence.

## Baseline

The `codex/workspace-v12` branch adds the Workspace CLI, Work Packet contract,
Setup Gate, routing, status, list, handoff, Result Ledger, Executor Contract,
Manual Closeout, archive/verify-archive, Worktree Review, destroy, Grant Guard,
docs, and tests.

The current release risk is not missing capability. It is drift: architecture
docs still contain older V1/V4 framing, CI workflow checks lag `npm run quality`,
and an added `yarn.lock` conflicts with the repository's npm-only gate.

## Goals

- Add V13 planning artifacts and traceability.
- Align Workspace architecture and index docs with the V12/V13 lifecycle.
- Add a stable command contract document for all current Workspace commands.
- Add a release-readiness checklist for maintainers.
- Remove package-manager ambiguity by keeping npm and `package-lock.json` as the
  only tracked lockfile policy.
- Align `.github/workflows/quality.yaml` with `npm run quality`.
- Add deterministic tests for docs/source/test parity, command inventory, CI
  parity, npm lock policy, and V13 traceability.

## Non-Goals

- No `workspace run`.
- No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  target repo action.
- No scheduler, watcher, daemon, background worker, hidden execution, hidden
  state machine, or live adapter activation.
- No new command names, JSON fields, runtime adapters, or output schema changes.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V13-FR-001 | V13 docs shall include PRD, backlog, acceptance tests, traceability, command contract, and release-readiness checklist. |
| V13-FR-002 | Workspace index and architecture docs shall describe the current command set and derived lifecycle without V1/V4 stale framing. |
| V13-FR-003 | Command contract docs shall define command purpose, output type, filesystem effect, stable error families, and non-goals. |
| V13-FR-004 | The repository shall remain npm-only for install gates: `package-lock.json` present, `yarn.lock` absent, and `npm ci` documented. |
| V13-FR-005 | CI quality workflow shall include the same validation categories as `npm run quality`, including URL tests and Workspace tests. |
| V13-FR-006 | Tests shall fail when V13 docs, command contract, CI parity, npm lock policy, or command inventory drift. |
| V13-FR-007 | V13 shall preserve all manual-only boundaries from V12. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- `npm ci && npm run quality` passes before push on the exact checkout.
