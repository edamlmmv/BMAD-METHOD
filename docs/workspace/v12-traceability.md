---
title: "BMAD Workspace V12 Traceability"
description: Progress tracking for lifecycle closure and contract hardening
---

# BMAD Workspace V12 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S114 V12 artifacts are traceable | Done | `docs/workspace/v12-traceability.md` | Acceptance mapping exists. |
| S115 Closeout schema is deterministic | Done | `tools/workspace/closeout.js` | Validator covers required fields and allowed manual values. |
| S116 Help lists closeout command | Done | `tools/installer/commands/workspace.js` | Command dispatch and options added. |
| S117 Closeout preconditions are loud | Done | `test/test-workspace-cli.js` | Missing Session, packet, invalid contract, and missing review fail before writes. |
| S118 Closeout ids and input are safe | Done | `tools/workspace/closeout.js` | Safe ids, duplicate guard, JSON-only input, and `CLOSEOUT_SECRET_DETECTED` scanning. |
| S119 Valid closeout records evidence only | Done | `tools/workspace/closeout.js` | Artifact records refs and manual decision only. |
| S120 Status and list report closeout | Done | `tools/workspace/status.js`, `tools/workspace/list.js` | Missing closeout is warning-only; invalid closeout blocks. |
| S121 Handoff reports closeout | Done | `tools/workspace/handoff.js` | Closeout section and blocker-first route guidance. |
| S122 Archive carries closeout safely | Done | `tools/workspace/archive.js` | Copy and verify closeout artifacts inside archive. |
| S123 Lifecycle state is derived | Done | `tools/workspace/status.js` | Lifecycle is derived from artifacts, not persisted as authority. |
| S124 Guardrails remain closed | Done | `test/test-workspace-cli.js` | No run, execution, destroy, merge, promotion, restore, replay, scheduler, watcher, daemon, or live adapter. |
| S125 Source skill teaches V12 | Done | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents closeout and lifecycle boundaries. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT12-001 | E47 | S116 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT12-002 | E47 | S117 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-003 | E47 | S117 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-004 | E47 | S117 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-005 | E47 | S117 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-006 | E47 | S118 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-007 | E47 | S118 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-008 | E47 | S115 | `test/test-workspace-contracts.js` | `tools/workspace/closeout.js` |
| AT12-009 | E47 | S119 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-010 | E47 | S119 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-011 | E48, E50 | S120, S123 | `test/test-workspace-cli.js` | `tools/workspace/status.js`, `tools/workspace/list.js` |
| AT12-012 | E48 | S120 | `test/test-workspace-cli.js` | `tools/workspace/status.js`, `tools/workspace/list.js` |
| AT12-013 | E48 | S121 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT12-014 | E49 | S122 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT12-015 | E49 | S122 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT12-016 | E50 | S123 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT12-017 | E50 | S124 | `test/test-workspace-cli.js` | `tools/workspace/closeout.js` |
| AT12-018 | E51 | S114, S125 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
