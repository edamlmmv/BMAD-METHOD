---
title: "BMAD Workspace V3 Backlog"
description: TDD-first backlog for full Workspace rename
---

# BMAD Workspace V3 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E10 Rename Source Surface | Move modules, docs, tests, and skill source. | AT3-001 to AT3-004 | Setup refs | Broken imports |
| E11 Rename Write Boundary | Replace old base write tokens with `workspace-base`. | AT3-005, AT3-006 | Grant redesign | Inconsistent artifacts |
| E12 V3 Traceability | Record V3 evidence and cut list. | AT3-007 | Runtime behavior changes | Docs drift |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S20 | Workspace files use new paths. | Tests cannot import `tools/workspace`. | Move files and update imports/scripts. | AT3-004 |
| S21 | Source skill is canonical. | `bmad-workspace` missing. | Add skill and catalog row; remove old source skill. | AT3-002, AT3-003 |
| S22 | Public help uses BMAD Workspace. | Help names old Workspace surface. | Update CLI help text. | AT3-001 |
| S23 | Base write boundary uses `workspace-base`. | Contract expects old token. | Update grants, contracts, docs, tests. | AT3-005, AT3-006 |
| S24 | V3 progress is traceable. | V3 acceptance IDs unmapped. | Add V3 traceability artifact. | AT3-007 |

## Cut List

- setup refs
- Base Improvement Session template redesign
- `workspace run`
- live adapters
- daemon, scheduler, watcher, hidden memory, auto-promotion
