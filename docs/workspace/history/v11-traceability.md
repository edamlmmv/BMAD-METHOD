---
title: "BMAD Workspace V11 Traceability"
description: Progress tracking for Manual Closeout
---

# BMAD Workspace V11 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S103 V11 artifacts are traceable | Planned | `docs/workspace/v11-traceability.md` | Initial planning artifact. |
| S104 Closeout schema is deterministic | Planned | `tools/workspace/closeout.js` | Add validator and shape helpers. |
| S105 Help lists closeout command | Planned | `tools/installer/commands/workspace.js` | Add command dispatch and options. |
| S106 Closeout preconditions are loud | Planned | `test/test-workspace-cli.js` | Missing packet, review, and invalid Session paths fail before writes. |
| S107 Closeout ids and input are safe | Planned | `tools/workspace/closeout.js` | Safe ids, duplicate guard, JSON-only input, and secret scanning. |
| S108 Valid closeout records evidence only | Planned | `tools/workspace/closeout.js` | Artifact records refs and manual decision only. |
| S109 Status and list report closeout | Planned | `tools/workspace/status.js`, `tools/workspace/list.js` | Missing closeout is warning-only; invalid closeout blocks. |
| S110 Handoff reports closeout | Planned | `tools/workspace/handoff.js` | Closeout section and blocker-first route guidance. |
| S111 Archive carries closeout safely | Planned | `tools/workspace/archive.js` | Copy and verify closeout artifacts inside archive. |
| S112 Guardrails remain closed | Planned | `test/test-workspace-cli.js` | No run, execution, destroy, merge, promotion, restore, or replay. |
| S113 Source skill teaches V11 | Planned | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents closeout evidence boundaries. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT11-001 | E43 | S105 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT11-002 | E43 | S106 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-003 | E43 | S106 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-004 | E43 | S106 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-005 | E42 | S104, S107 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-006 | E42 | S107 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-007 | E42 | S104, S108 | `test/test-workspace-contracts.js` | `tools/workspace/closeout.js` |
| AT11-008 | E42, E43 | S108 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT11-009 | E44 | S109 | `test/test-workspace-cli.js` | `tools/workspace/status.js`, `tools/workspace/list.js` |
| AT11-010 | E44 | S109 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT11-011 | E44 | S110 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT11-012 | E45 | S111 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT11-013 | E45 | S111 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT11-014 | E46 | S103, S113 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
| AT11-015 | E42, E43, E46 | S112 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
