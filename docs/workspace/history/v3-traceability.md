---
title: "BMAD Workspace V3 Traceability"
description: Progress tracking for full Workspace rename
---

# BMAD Workspace V3 Traceability

## Story Ledger

| Story | Current State | Evidence Commit | Notes |
| --- | --- | --- | --- |
| S20 Workspace files use new paths | Complete | Pending commit | Moves modules, docs, and tests. |
| S21 Source skill is canonical | Complete | Pending commit | Adds `bmad-workspace` source and catalog row. |
| S22 Public help uses BMAD Workspace | Complete | Pending commit | Updates CLI help. |
| S23 Base write boundary uses `workspace-base` | Complete | Pending commit | Updates contracts, grants, and tests. |
| S24 V3 progress is traceable | Complete | Pending commit | Adds this artifact. |

## Acceptance Traceability

| Acceptance Test | Epic | Story | TDD Test Target | First Code Or Artifact Surface |
| --- | --- | --- | --- | --- |
| AT3-001 | E10 | S22 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT3-002 | E10 | S21 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
| AT3-003 | E10 | S21 | `test/test-workspace-contracts.js` | `src/core-skills/module-help.csv` |
| AT3-004 | E10 | S20 | `npm run test:workspace` | `tools/workspace/` |
| AT3-005 | E11 | S23 | `test/test-workspace-contracts.js` | `tools/workspace/contracts.js` |
| AT3-006 | E11 | S23 | `test/test-workspace-cli.js` | `tools/workspace/grant-guard.js` |
| AT3-007 | E12 | S24 | `rg -i old naming` | `docs/workspace/v3-traceability.md` |

## Completion Gate

V3 is complete when:

- focused workspace tests pass
- skill validation passes
- old Workspace source skill is absent
- setup refs and Base Improvement Session redesign remain deferred to V4
