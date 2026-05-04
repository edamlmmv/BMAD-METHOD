---
title: "BMAD Workspace V8 Backlog"
description: TDD-first backlog for deterministic Workspace routing
---

# BMAD Workspace V8 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E30 Routing Contract | Add pure deterministic routing. | AT8-002 to AT8-006 | LLM route choice | Hidden magic |
| E31 Packet Routing | Persist route decisions in new packets. | AT8-003, AT8-004, AT8-007, AT8-008 | Packet V5 rewrite | Compatibility drift |
| E32 Routing Surfaces | Report route provenance in status, handoff, archive. | AT8-009 to AT8-011 | Execution | Unsafe next action |
| E33 Docs and Skill | Teach V8 routing and guardrails. | AT8-001, AT8-012 | Broad rewrite | Traceability theater |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S72 | V8 artifacts are traceable. | V8 traceability missing. | Add V8 PRD, backlog, acceptance, and traceability. | AT8-001 |
| S73 | Help lists workflow override. | Help omits `--workflow`. | Add packet override option. | AT8-001 |
| S74 | Catalog filtering is deterministic. | Agent or duplicate rows route. | Filter and sort BMad Method workflow rows. | AT8-002 |
| S75 | Router handles overrides. | Unknown override falls back. | Validate override or fail before writes. | AT8-003, AT8-004 |
| S76 | Router handles deterministic goals. | Packet hardcodes quick-dev. | Route from goal and artifact text. | AT8-005 |
| S77 | Ambiguous routing fails closed. | Empty or tied goals silently default. | Fail with `ROUTE_DECISION_REQUIRED`. | AT8-006 |
| S78 | New packets persist routing. | Packet lacks `routing`. | Add routing schema and alias check. | AT8-007 |
| S79 | Route failures are atomic. | Invalid route mutates packet files. | Preserve existing artifacts. | AT8-008 |
| S80 | Legacy packets stay readable. | Old V4 packet becomes invalid. | Surface `legacy-missing` route metadata. | AT8-009 |
| S81 | Surfaces report routing. | Handoff/archive omit route provenance. | Add route workflow/source/confidence. | AT8-010 |
| S82 | Blockers override recommendations. | Route hides missing review or stale evidence. | Keep blocker-first next routes. | AT8-011 |
| S83 | Skill teaches routing. | Source skill omits V8. | Update `bmad-workspace` guardrails and examples. | AT8-012 |

## TDD Order

1. Add routing contract unit tests.
2. Add catalog filtering and override tests.
3. Add packet schema compatibility tests.
4. Add CLI invalid override and atomicity tests.
5. Add status and handoff legacy packet tests.
6. Add archive routing surface tests.
7. Add docs, skill text, and traceability checks.
