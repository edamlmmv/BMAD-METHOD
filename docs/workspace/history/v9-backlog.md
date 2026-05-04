---
title: "BMAD Workspace V9 Backlog"
description: TDD-first backlog for manual Result Ledger
---

# BMAD Workspace V9 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E34 Result Contract | Define result schema and secret scanner. | AT9-003 to AT9-005, AT9-007, AT9-008 | Executor | Unsafe evidence persistence |
| E35 Result CLI | Record manual result artifacts. | AT9-001 to AT9-005 | Command execution | Hidden side effects |
| E36 Result Surfaces | Report and archive results. | AT9-006, AT9-009 to AT9-011 | Restore/replay | Evidence gaps |
| E37 Docs and Skill | Teach V9 boundaries. | AT9-012 | Broad adapter registry | Scope creep |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S84 | V9 artifacts are traceable. | V9 traceability missing. | Add V9 PRD, backlog, acceptance, and traceability. | AT9-012 |
| S85 | Help lists result command. | Help omits `result`. | Add CLI help and options. | AT9-001 |
| S86 | Missing preconditions are loud. | Result records without packet. | Fail missing session or packet before writes. | AT9-002 |
| S87 | Result validation is deterministic. | Bad input writes artifacts. | Validate JSON, outcome, result id, and duplicates. | AT9-003 |
| S88 | Secrets are blocked. | Secret-like token persists. | Detect high-confidence secrets and write nothing. | AT9-003, AT9-008 |
| S89 | Valid result records evidence only. | Command text runs or metadata missing. | Store result artifact with packet/routing refs. | AT9-004, AT9-005 |
| S90 | Status and list report results. | Result ledger invisible. | Add result count/latest metadata. | AT9-006, AT9-007 |
| S91 | Handoff reports results. | Handoff omits result ledger. | Add Result Ledger section. | AT9-009 |
| S92 | Archive carries results safely. | Archive omits results or verify ignores shape. | Copy results and validate archived shape. | AT9-010, AT9-011 |
| S93 | Skill teaches V9. | Source skill omits result boundaries. | Update `bmad-workspace` guidance. | AT9-012 |

## TDD Order

1. Add result schema and secret scanner contract tests.
2. Add CLI help and precondition tests.
3. Add invalid input, duplicate, and no-execution tests.
4. Add valid result write and lifecycle tests.
5. Add status/list/handoff visibility tests.
6. Add archive copy and verify shape tests.
7. Add docs, skill text, and traceability checks.
