---
title: "BMAD Workspace V12 Backlog"
description: TDD-first backlog for lifecycle closure and contract hardening
---

# BMAD Workspace V12 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E47 Closeout Command | Record manual closeout artifacts safely. | AT12-001 to AT12-010 | Execution or approval engine | Closeout is mistaken for durable action |
| E48 Closeout Surfaces | Make closeout inspectable in read-only surfaces. | AT12-011 to AT12-013 | Latest-session inference | Guidance ignores blockers |
| E49 Archive Closeout Evidence | Preserve and verify closeout artifacts. | AT12-014, AT12-015 | Restore or replay | Archive trusts live Session paths |
| E50 Lifecycle Contract | Report derived lifecycle state and command boundaries. | AT12-016, AT12-017 | Durable workflow engine | State model becomes authority |
| E51 Docs and Skill | Teach V12 closure and guardrails. | AT12-018 | Broad workspace redesign | Docs outrun implementation |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S114 | V12 artifacts are traceable. | V12 traceability missing. | Add V12 PRD, backlog, acceptance, and traceability. | AT12-018 |
| S115 | Closeout schema is deterministic. | Invalid closeout passes validation. | Add `tools/workspace/closeout.js` validator and shape helpers. | AT12-008, AT12-009 |
| S116 | Help lists closeout command. | Help omits `closeout`. | Add CLI help, command dispatch, `--input`, and `--closeout-id`. | AT12-001 |
| S117 | Closeout preconditions are loud. | Closeout writes without packet, valid executor contract, or required review. | Fail missing packet, invalid contract, and missing completed review before writes. | AT12-002 to AT12-005 |
| S118 | Closeout ids and input are safe. | Unsafe ids, duplicates, malformed JSON, or secret input persist. | Validate id, duplicate, JSON input, and secrets before artifact write. | AT12-006, AT12-007 |
| S119 | Valid closeout records evidence only. | Closeout omits refs or treats missing results as fatal. | Store closeout artifact with packet, routing, executor, result, review, outcome, next action, and optional evidence refs. | AT12-009, AT12-010 |
| S120 | Status and list report closeout. | Closeout ledger is invisible or invalid closeout is ignored. | Add closeout count, latest outcome, latest ref, lifecycle state, and invalid closeout blockers. | AT12-011, AT12-012 |
| S121 | Handoff reports closeout. | Handoff omits closeout or ignores blockers. | Add Closeout section and preserve blocker-first recommendation rules. | AT12-013 |
| S122 | Archive carries closeout safely. | Archive omits closeout or verify ignores shape. | Copy closeout artifacts and validate archived closeout shape, refs, and checksums. | AT12-014, AT12-015 |
| S123 | Lifecycle state is derived. | Status invents state or persists workflow authority. | Derive lifecycle from artifacts only and document command boundaries. | AT12-016 |
| S124 | Guardrails remain closed. | Code adds action verbs or durable operation paths from evidence. | Keep all evidence inert and manual-only. | AT12-017 |
| S125 | Source skill teaches V12. | Skill omits closeout or lifecycle boundaries. | Update `bmad-workspace` guidance. | AT12-018 |

## TDD Order

1. Add closeout schema, allowed-value, and forbidden-action tests.
2. Add CLI help and precondition tests for missing Session, missing packet,
   invalid Executor Contract, and missing review.
3. Add safe id, duplicate id, malformed JSON, and secret-detection tests.
4. Add valid closeout artifact tests with and without Result Ledger artifacts.
5. Add status, list, and handoff surface tests.
6. Add archive and verify-archive closeout tests.
7. Add derived lifecycle state tests.
8. Add docs, source skill, guardrail, and traceability checks.

## Cut Line

V12 stops after closeout can be recorded, reported, archived, verified, and
explained as a manual evidence artifact. Any command that performs archive,
destroy, merge, promotion, restore, replay, execution, scheduling, watching, or
live adapter activation from closeout data belongs outside V12.
