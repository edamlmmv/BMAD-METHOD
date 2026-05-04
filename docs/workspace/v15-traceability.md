---
title: "BMAD Workspace V15 Traceability"
description: Progress tracking for read-only archive diff
---

# BMAD Workspace V15 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S142 V15 artifacts exist and are linked | Done | `docs/workspace/v15-traceability.md` | Planning set and index entries exist. |
| S143 Diff command is discoverable | Done | `tools/installer/commands/workspace.js` | Help lists `diff`, `--left`, and `--right`. |
| S144 Diff verifies sources first | Done | `tools/workspace/diff.js` | Archive inputs verify before diff output. |
| S145 File deltas are deterministic | Done | `tools/workspace/diff.js` | File deltas use manifest path, SHA-256, and bytes. |
| S146 Evidence and artifact deltas are stable | Done | `tools/workspace/diff.js` | V1 Evidence Index is incomparable; volatile fields are ignored. |
| S147 Diff remains read-only | Done | `test/test-workspace-cli.js` | Tests assert archive fingerprints and guardrail scope. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Surface |
| --- | --- | --- | --- | --- |
| AT15-001 | E62 | S142 | `test/test-workspace-contracts.js` | `docs/workspace/v15-prd.md` |
| AT15-002 | E63 | S143 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT15-003 | E63 | S143 | `test/test-workspace-cli.js` | `DIFF_SOURCE_REQUIRED` |
| AT15-004 | E63 | S144 | `test/test-workspace-cli.js` | `DIFF_SOURCE_NOT_FOUND` |
| AT15-005 | E64 | S145 | `test/test-workspace-cli.js` | `tools/workspace/diff.js` |
| AT15-006 | E64 | S145 | `test/test-workspace-cli.js` | `fileDeltas.changed` |
| AT15-007 | E64 | S145 | `test/test-workspace-cli.js` | `fileDeltas.added` |
| AT15-008 | E64 | S146 | `test/test-workspace-cli.js` | `evidenceDeltas.state` |
| AT15-009 | E65 | S144 | `test/test-workspace-cli.js` | `DIFF_ARCHIVE_INVALID` |
| AT15-010 | E65 | S147 | `test/test-workspace-contracts.js` | `docs/workspace/command-contract.md` |
| AT15-011 | E65 | S147 | `test/test-workspace-contracts.js` | `test/test-workspace-contracts.js` |
| AT15-012 | E66 | S142 | Manual push gate | `npm ci && npm run quality` |

## Guardrail

V15 diff data is inspection evidence only. Diff output never executes,
schedules, restores, replays, imports, syncs, merges, promotes, watches,
fetches, or activates live adapters.
