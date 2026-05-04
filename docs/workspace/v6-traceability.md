---
title: "BMAD Workspace V6 Traceability"
description: Progress tracking for Session inventory and Codex handoff
---

# BMAD Workspace V6 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S43 V6 artifacts are traceable | Done | `docs/workspace/v6-traceability.md` | Acceptance mapping exists. |
| S44 Help lists inventory and handoff | Done | `test/test-workspace-cli.js` | Help checks both commands. |
| S45 Empty inventory works | Done | `test/test-workspace-cli.js` | Missing runtime returns empty inventory. |
| S46 Valid sessions are visible | Done | `test/test-workspace-cli.js` | Inventory lists launched session artifacts. |
| S47 Invalid entries are safe | Done | `test/test-workspace-cli.js` | Broken dirs and symlinks report `SESSION_INVALID`. |
| S48 Inventory is read-only | Done | `test/test-workspace-cli.js` | Runtime fingerprint unchanged. |
| S49 Missing handoff is loud | Done | `test/test-workspace-cli.js` | Missing session fails with `SESSION_NOT_FOUND`. |
| S50 Invalid handoff is loud | Done | `test/test-workspace-cli.js` | Invalid session fails with `SESSION_INVALID`. |
| S51 Valid handoff renders context | Done | `tools/workspace/handoff.js` | Markdown sections are fixed. |
| S52 Review and blockers are carried | Done | `tools/workspace/handoff.js` | Status checks and review refs render. |
| S53 Base Improvement handoff is diagnostic | Done | `test/test-workspace-cli.js` | Readiness wording is diagnostic-only. |
| S54 Skill teaches V6 | Done | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents `list` and `handoff`. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT6-001 | E25 | S43 | `test/test-workspace-contracts.js` | `docs/workspace/v6-traceability.md` |
| AT6-002 | E22 | S44 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT6-003 | E22 | S45 | `test/test-workspace-cli.js` | `tools/workspace/list.js` |
| AT6-004 | E22 | S46 | `test/test-workspace-cli.js` | `tools/workspace/list.js` |
| AT6-005 | E22 | S47 | `test/test-workspace-cli.js` | `tools/workspace/list.js` |
| AT6-006 | E22 | S47 | `test/test-workspace-cli.js` | `tools/workspace/list.js` |
| AT6-007 | E22 | S48 | `test/test-workspace-cli.js` | `tools/workspace/list.js` |
| AT6-008 | E23 | S49 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-009 | E23 | S50 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-010 | E23 | S51 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-011 | E23 | S51 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-012 | E23 | S52 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-013 | E23 | S52 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-014 | E24 | S53 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT6-015 | E25 | S54 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
