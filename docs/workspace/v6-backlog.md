---
title: "BMAD Workspace V6 Backlog"
description: TDD-first backlog for Session inventory and Codex handoff
---

# BMAD Workspace V6 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E22 Session Inventory | Add read-only `list`. | AT6-002 to AT6-007 | Session selection shortcuts | Hidden discovery |
| E23 Codex Handoff | Add raw Markdown `handoff`. | AT6-008 to AT6-013 | Execution or repair | Context drift |
| E24 Base Improvement Handoff | Report readiness diagnostics. | AT6-014 | Durable state action | Unsafe wording |
| E25 Docs and Skill | Document V6 behavior. | AT6-001, AT6-015 | Broad rewrite | Traceability theater |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S43 | V6 artifacts are traceable. | V6 traceability missing. | Add V6 traceability and docs. | AT6-001 |
| S44 | Help lists inventory and handoff. | Help lacks commands. | Add `list` and `handoff` help rows. | AT6-002 |
| S45 | Empty inventory works. | `workspace list` unknown. | Return empty JSON inventory. | AT6-003 |
| S46 | Valid sessions are visible. | List omits launched session. | Report sorted Session rows. | AT6-004 |
| S47 | Invalid entries are safe. | Broken dirs or symlinks crash/follow. | Report `SESSION_INVALID`. | AT6-005, AT6-006 |
| S48 | Inventory is read-only. | List mutates runtime. | Read known artifacts only. | AT6-007 |
| S49 | Missing handoff is loud. | Missing handoff vague or partial. | Fail with `SESSION_NOT_FOUND`. | AT6-008 |
| S50 | Invalid handoff is loud. | Invalid handoff emits partial context. | Fail with `SESSION_INVALID`. | AT6-009 |
| S51 | Valid handoff renders context. | Handoff is JSON or omits sections. | Emit fixed Markdown sections. | AT6-010, AT6-011 |
| S52 | Review and blockers are carried. | Handoff omits review/status checks. | Render checks and review refs. | AT6-012, AT6-013 |
| S53 | Base Improvement handoff is diagnostic. | Handoff implies durable action. | Report readiness only. | AT6-014 |
| S54 | Skill teaches V6. | Source skill lacks commands. | Update `bmad-workspace` skill. | AT6-015 |

## TDD Order

1. Add V6 traceability red checks.
2. Add help checks for `list` and `handoff`.
3. Add empty inventory test.
4. Add valid inventory test.
5. Add read-only and invalid-entry inventory tests.
6. Add missing and invalid handoff tests.
7. Add raw Markdown handoff test.
8. Add packet/setup/review handoff tests.
9. Add Base Improvement handoff test.
10. Update docs and skill.
