---
title: "BMAD Workspace V13 Traceability"
description: Progress tracking for release readiness and contract freeze
---

# BMAD Workspace V13 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S126 V13 artifacts exist and are linked | Done | `docs/workspace/v13-traceability.md` | Planning set and index entries exist. |
| S127 Architecture reflects V12/V13 lifecycle | Done | `docs/workspace/architecture.md` | Current command set and derived lifecycle documented. |
| S128 Command contract is explicit | Done | `docs/workspace/command-contract.md` | Commands, output types, effects, errors, and non-goals documented. |
| S129 Release checklist is actionable | Done | `docs/workspace/v13-release-readiness.md` | Maintainer validation checklist added. |
| S130 npm remains source of truth | Done | `package-lock.json` | `yarn.lock` removed; npm install gate retained. |
| S131 CI mirrors quality gate | Done | `.github/workflows/quality.yaml` | URL and Workspace tests included in CI validation. |
| S132 Tests guard public command inventory | Done | `test/test-workspace-contracts.js`, `test/test-workspace-cli.js` | Command inventory and docs parity checks added. |
| S133 Tests guard V13 docs and traceability | Done | `test/test-workspace-contracts.js` | V13 artifact, checklist, CI, and lock policy checks added. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Surface |
| --- | --- | --- | --- | --- |
| AT13-001 | E52 | S126, S133 | `test/test-workspace-contracts.js` | `docs/workspace/v13-prd.md` |
| AT13-002 | E53 | S127, S133 | `test/test-workspace-contracts.js` | `docs/workspace/architecture.md` |
| AT13-003 | E53 | S128, S132 | `test/test-workspace-contracts.js` | `docs/workspace/command-contract.md` |
| AT13-004 | E53 | S127, S128 | `test/test-workspace-contracts.js` | `docs/workspace/command-contract.md` |
| AT13-005 | E54 | S130 | `test/test-workspace-contracts.js` | `package-lock.json` |
| AT13-006 | E54 | S131 | `test/test-workspace-contracts.js` | `.github/workflows/quality.yaml` |
| AT13-007 | E55 | S132 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT13-008 | E56 | S129, S133 | `test/test-workspace-contracts.js` | `docs/workspace/v13-release-readiness.md` |
| AT13-009 | E55 | S132, S133 | `test/test-workspace-contracts.js` | `test/test-workspace-contracts.js` |
| AT13-010 | E56 | S129 | Manual push gate | `npm ci && npm run quality` |

## Guardrail

V13 preserves the manual-only boundary. Evidence artifacts remain inert and no
command added by V13 executes, schedules, restores, replays, merges, promotes,
watches, or activates live adapters.
