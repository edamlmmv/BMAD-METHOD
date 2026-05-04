---
title: "BMAD Workspace V16 Traceability"
description: Progress tracking for Review Manifest and diff trust hardening
---

# BMAD Workspace V16 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S148 V16 artifacts exist and are linked | Done | `docs/workspace/v16-traceability.md` | Planning set and index entries exist. |
| S149 Review Manifest validates | Done | `tools/workspace/review-manifest.js` | Validator and forbidden actions are covered. |
| S150 Review writes Review Manifest | Done | `tools/workspace/review.js` | Review output includes manifest path. |
| S151 Inspectors surface Review Manifest | Done | `tools/workspace/status.js` | Status, Evidence Index, Handoff, and Closeout reference it. |
| S152 Archive carries Review Manifest | Done | `tools/workspace/archive.js` | Archive copies and verifies manifest. |
| S153 Diff refuses unsupported sources | Done | `tools/workspace/diff.js` | URL, live Session, and duplicate archive paths are rejected. |
| S154 Guardrails stay closed | Done | `test/test-workspace-contracts.js` | Contract tests cover docs and forbidden behavior. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Surface |
| --- | --- | --- | --- | --- |
| AT16-001 | E67 | S148 | `test/test-workspace-contracts.js` | `docs/workspace/v16-prd.md` |
| AT16-002 | E68 | S150 | `test/test-workspace-cli.js` | `tools/workspace/review.js` |
| AT16-003 | E68 | S149 | `test/test-workspace-contracts.js` | `tools/workspace/review-manifest.js` |
| AT16-004 | E68 | S151 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT16-005 | E68 | S151 | `test/test-workspace-cli.js` | `tools/workspace/evidence.js` |
| AT16-006 | E68 | S151 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT16-007 | E69 | S152 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT16-008 | E69 | S152 | `test/test-workspace-cli.js` | `ARCHIVE_REVIEW_MANIFEST_INVALID` |
| AT16-009 | E70 | S153 | `test/test-workspace-cli.js` | `DIFF_SOURCE_UNSUPPORTED` |
| AT16-010 | E70 | S153 | `test/test-workspace-cli.js` | `ARCHIVE_MANIFEST_INVALID` |
| AT16-011 | E71 | S154 | `test/test-workspace-contracts.js` | `docs/workspace/command-contract.md` |
| AT16-012 | E71 | S154 | Manual push gate | `npm ci && npm run quality` |

## Guardrail

Review Manifest and Workspace Diff are inspection evidence only. They never
execute, schedule, restore, replay, import, sync, merge, promote, watch, fetch,
score acceptance, compare live Sessions, or activate live adapters.
