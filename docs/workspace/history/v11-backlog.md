---
title: "BMAD Workspace V11 Backlog"
description: TDD-first backlog for Manual Closeout
---

# BMAD Workspace V11 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E42 Closeout Contract | Define manual closeout schema and validation. | AT11-005 to AT11-008, AT11-015 | Acceptance scoring | Closeout becomes hidden approval |
| E43 Closeout CLI | Record closeout artifacts safely. | AT11-001 to AT11-008 | Execution or destroy | User thinks closeout performs action |
| E44 Closeout Surfaces | Report closeout in read-only views. | AT11-009 to AT11-011 | Latest-session inference | Guidance ignores blockers |
| E45 Closeout Archive | Preserve and verify closeout evidence. | AT11-012, AT11-013 | Restore or replay | Archive trusts live Session paths |
| E46 Docs and Skill | Teach V11 boundaries. | AT11-014, AT11-015 | Broad workflow rewrite | Manual-only contract drift |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S103 | V11 artifacts are traceable. | V11 traceability missing. | Add V11 PRD, backlog, acceptance, and traceability. | AT11-014 |
| S104 | Closeout schema is deterministic. | Invalid closeout passes. | Add `tools/workspace/closeout.js` validator. | AT11-005 to AT11-008 |
| S105 | Help lists closeout command. | Help omits `closeout`. | Add CLI help, command dispatch, and options. | AT11-001 |
| S106 | Closeout preconditions are loud. | Closeout writes without packet or review. | Fail missing packet, invalid executor contract, or missing completed review before writes. | AT11-002 to AT11-004 |
| S107 | Closeout ids and input are safe. | Unsafe ids, duplicates, or secret input persist. | Validate id, duplicate, JSON input, and secrets before artifact write. | AT11-005, AT11-006 |
| S108 | Valid closeout records evidence only. | Closeout omits route or evidence refs. | Store closeout artifact with packet, routing, executor, result, review, outcome, and next action. | AT11-007, AT11-008 |
| S109 | Status and list report closeout. | Closeout ledger invisible. | Add closeout count, latest outcome, and invalid closeout blockers. | AT11-009, AT11-010 |
| S110 | Handoff reports closeout. | Handoff omits closeout or ignores blockers. | Add Closeout section and preserve blocker-first recommendation rules. | AT11-011 |
| S111 | Archive carries closeout safely. | Archive omits closeout or verify ignores shape. | Copy closeout artifacts and validate archived closeout shape and refs. | AT11-012, AT11-013 |
| S112 | Guardrails remain closed. | Code adds action verbs or durable operation path. | Keep closeout evidence-only and manual-only. | AT11-015 |
| S113 | Source skill teaches V11. | Skill omits closeout boundaries. | Update `bmad-workspace` guidance. | AT11-014 |

## TDD Order

1. Add closeout schema and forbidden next-action tests.
2. Add CLI help and missing-precondition tests.
3. Add safe id, duplicate, malformed JSON, and secret-detection tests.
4. Add valid closeout artifact test.
5. Add status, list, and handoff surface tests.
6. Add archive and verify-archive closeout tests.
7. Add docs, source skill, and traceability checks.

## Cut Line

V11 should stop after closeout can be recorded, reported, archived, and verified.
Any command that performs archive, destroy, merge, promotion, restore, replay,
or execution from closeout data belongs outside V11.
