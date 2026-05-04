---
title: "BMAD Workspace V2 Traceability"
description: Progress tracking for session language and self-improvement packet kit
---

# BMAD Workspace V2 Traceability

## Purpose

Use this artifact to verify V2 progress by commit id. Each durable change should
map back to an acceptance test, story, deterministic test target, and first code
or artifact surface.

## Story Ledger

| Story | Current State | Evidence Commit | Notes |
| --- | --- | --- | --- |
| S12 Help and launch session language | Complete | Pending commit | Adds help wording and `--session-id`. |
| S13 Alias conflict behavior | Complete | Pending commit | Matching ids pass; differing ids fail. |
| S14 Additive JSON output | Complete | Pending commit | Adds `sessionId/sessionRoot` aliases. |
| S15 Packet kit validation | Complete | Pending commit | Adds deterministic template validator. |
| S16 Hidden execution ban in templates | Complete | Pending commit | Templates forbid run, live adapters, and auto-promotion. |
| S17 Repo-owned source skill | Complete | Pending commit | Adds source skill and module-help row. |
| S18 Skill validation | Planned | Pending commit | Verified by `npm run validate:skills`. |
| S19 V2 traceability | Complete | Pending commit | Adds this mapping artifact. |

## Acceptance Traceability

| Acceptance Test | Epic | Story | TDD Test Target | First Code Or Artifact Surface |
| --- | --- | --- | --- | --- |
| AT2-001 | E6 | S12 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT2-002 | E6 | S12 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT2-003 | E6 | S13 | `test/test-workspace-cli.js` | `tools/workspace/session.js` |
| AT2-004 | E6 | S13 | `test/test-workspace-cli.js` | `tools/workspace/session.js` |
| AT2-005 | E6 | S14 | `test/test-workspace-cli.js` | `tools/workspace/session.js` |
| AT2-010 | E7 | S15 | `test/test-workspace-contracts.js` | `tools/workspace/templates.js` |
| AT2-011 | E7 | S15 | `test/test-workspace-contracts.js` | `docs/workspace/templates/` |
| AT2-012 | E7 | S16 | `test/test-workspace-contracts.js` | `docs/workspace/templates/self-improvement-prompt.md` |
| AT2-020 | E8 | S17 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
| AT2-021 | E8 | S17 | `test/test-workspace-contracts.js` | `src/core-skills/module-help.csv` |
| AT2-022 | E8 | S18 | `npm run validate:skills` | `src/core-skills/bmad-workspace/SKILL.md` |
| AT2-030 | E9 | S19 | `test/test-workspace-contracts.js` | `docs/workspace/v2-traceability.md` |
| AT2-031 | E9 | S19 | `test/test-workspace-contracts.js` | `docs/workspace/v2-prd.md` |

## Completion Gate

V2 is complete when:

- focused workspace tests pass
- `npm run validate:skills` passes
- V1 compatibility remains additive
- no `workspace run`, hidden execution, live adapter, or auto-promotion exists
- this ledger records the final evidence commit
