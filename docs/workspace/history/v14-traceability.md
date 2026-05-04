---
title: "BMAD Workspace V14 Traceability"
description: Progress tracking for Evidence Index and operator trust
---

# BMAD Workspace V14 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S134 V14 artifacts exist and are linked | Done | `docs/workspace/v14-traceability.md` | Planning set and index entries exist. |
| S135 Evidence command is read-only | Done | `tools/workspace/evidence.js` | Command derives evidence from stored artifacts only. |
| S136 Evidence artifacts are inspectable | Done | `tools/workspace/evidence.js` | Artifacts include stage, kind, ref, presence, validation, checksum, size, and source command. |
| S137 Checks tell operators what to do next | Done | `tools/workspace/next-action.js` | Status and evidence checks include `nextManualAction`. |
| S138 Handoff summarizes Evidence Index | Done | `tools/workspace/handoff.js` | Handoff includes `## Evidence Index`. |
| S139 Archive V2 preserves evidence | Done | `tools/workspace/archive.js` | New archives include and verify `evidence-index.json`. |
| S140 V1 archive verification remains compatible | Done | `tools/workspace/archive.js` | `verify-archive` accepts archiveVersion 1 and 2. |
| S141 Guardrails stay closed | Done | `test/test-workspace-contracts.js` | Forbidden behavior and command inventory checks remain explicit. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Surface |
| --- | --- | --- | --- | --- |
| AT14-001 | E57 | S134 | `test/test-workspace-contracts.js` | `docs/workspace/v14-prd.md` |
| AT14-002 | E58 | S135 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT14-003 | E58 | S135, S136 | `test/test-workspace-cli.js` | `tools/workspace/evidence.js` |
| AT14-004 | E58 | S136 | `test/test-workspace-cli.js` | `tools/workspace/evidence.js` |
| AT14-005 | E58 | S137 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT14-006 | E59 | S138 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT14-007 | E59 | S139 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT14-008 | E59 | S140 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT14-009 | E59 | S139 | `test/test-workspace-cli.js` | `ARCHIVE_EVIDENCE_INDEX_INVALID` |
| AT14-010 | E60 | S141 | `test/test-workspace-contracts.js` | `docs/workspace/command-contract.md` |
| AT14-011 | E60 | S135-S141 | `test/test-workspace-contracts.js` | `test/test-workspace-contracts.js` |
| AT14-012 | E61 | S134 | Manual push gate | `npm ci && npm run quality` |

## Guardrail

V14 evidence data is inspectable, not authoritative. Evidence Index, status,
handoff, archive, review, result, and closeout artifacts never execute,
schedule, restore, replay, merge, promote, watch, or activate live adapters.
