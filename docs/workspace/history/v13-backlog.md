---
title: "BMAD Workspace V13 Backlog"
description: TDD-first backlog for release readiness and contract freeze
---

# BMAD Workspace V13 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E52 V13 Planning | Create traceable V13 artifacts. | AT13-001 | Feature expansion | Plan lacks acceptance hooks |
| E53 Contract Synchronization | Align architecture, index, command contract, and source skill truth. | AT13-002 to AT13-004 | New runtime behavior | Stale docs guide future work wrongly |
| E54 Package and CI Hygiene | Keep npm-only install policy and CI parity. | AT13-005, AT13-006 | Package manager migration | Push gate diverges from local gate |
| E55 Contract Tests | Guard command inventory, lifecycle docs, and error families. | AT13-007 to AT13-009 | Broad refactor | Tests check internals instead of public contract |
| E56 Release Readiness | Provide maintainer checklist for V13 validation. | AT13-010 | Release automation | Checklist omitted before push |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S126 | V13 artifacts exist and are linked. | V13 traceability missing. | Add PRD, backlog, acceptance, traceability, and index links. | AT13-001 |
| S127 | Architecture reflects V12/V13 lifecycle. | Docs still describe V1/V4 command surface as current. | Update architecture lifecycle, module map, interface sketch, and non-goals. | AT13-002 |
| S128 | Command contract is explicit. | No canonical command contract doc. | Add command contract with output types, effects, error families, and non-goals. | AT13-003, AT13-004 |
| S129 | Release checklist is actionable. | No V13 release-readiness checklist. | Add checklist with `npm ci`, quality, docs parity, archive verification, and no forbidden verbs. | AT13-010 |
| S130 | npm remains source of truth. | `yarn.lock` exists or package lock missing. | Remove `yarn.lock`; assert `package-lock.json` exists. | AT13-005 |
| S131 | CI mirrors quality gate. | Workflow omits URL or Workspace checks. | Add `npm run test:urls` and `npm run test:workspace` to CI validation job. | AT13-006 |
| S132 | Tests guard public command inventory. | Help/docs omit current commands or include `workspace run`. | Add command inventory and docs parity tests. | AT13-007, AT13-009 |
| S133 | Tests guard V13 docs and traceability. | V13 docs drift from implementation surfaces. | Add V13 traceability and release-readiness tests. | AT13-001 to AT13-010 |

## TDD Order

1. Add failing V13 docs/index/traceability tests.
2. Add command contract and architecture parity tests.
3. Add npm lock policy and CI parity tests.
4. Add V13 docs and index entries.
5. Update architecture and command contract docs.
6. Remove `yarn.lock` and align CI workflow.
7. Run `npm run test:workspace`, then `npm ci && npm run quality`.

## Cut Line

V13 stops after release readiness, command contract freeze, CI/package hygiene,
and docs/test parity. Execution runtime, restore/replay, promotion, scheduler,
watcher, daemon, and live adapter decisions require a later PRD and architecture
round.
