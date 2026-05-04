---
title: "BMAD Workspace V14 Backlog"
description: TDD-first backlog for Evidence Index and operator trust
---

# BMAD Workspace V14 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E57 V14 Planning | Create traceable V14 artifacts. | AT14-001 | Feature expansion | Docs drift from command contract |
| E58 Evidence Index | Add read-only evidence command and schema. | AT14-002 to AT14-005 | Runtime execution | Evidence view implies authority |
| E59 Handoff and Archive Trust | Surface Evidence Index in handoff and archive V2. | AT14-006 to AT14-009 | Restore or replay | Archive compatibility breaks |
| E60 Contract Guardrails | Preserve manual-only boundaries and source parity. | AT14-010, AT14-011 | Broad command expansion | Scope creep into automation |
| E61 Release Readiness | Provide V14 maintainer checklist. | AT14-012 | Release automation | Push gate omitted |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S134 | V14 artifacts exist and are linked. | V14 docs missing from index. | Add PRD, backlog, acceptance, traceability, operator guide, and release checklist. | AT14-001 |
| S135 | Evidence command is read-only. | `workspace evidence` is unknown or writes files. | Add command returning Evidence Index JSON with no filesystem mutation. | AT14-002, AT14-003 |
| S136 | Evidence artifacts are inspectable. | Output lacks checksums or validation states. | Include artifact stage, kind, ref, presence, validation, checksum, size, and source command. | AT14-003, AT14-004 |
| S137 | Checks tell operators what to do next. | Status checks lack next manual actions. | Add `nextManualAction` while preserving stable error codes. | AT14-005 |
| S138 | Handoff summarizes Evidence Index. | Handoff lacks evidence section. | Add Evidence Index section with state, counts, and next action. | AT14-006 |
| S139 | Archive V2 preserves evidence. | Archive lacks Evidence Index. | Add `archiveVersion: 2`, `evidence-index.json`, and validation. | AT14-007, AT14-009 |
| S140 | V1 archive verification remains compatible. | Old archive manifests are rejected. | Accept V1 archives without Evidence Index. | AT14-008 |
| S141 | Guardrails stay closed. | Tests or docs imply execution. | Extend forbidden behavior tests and docs. | AT14-010, AT14-011 |

## TDD Order

1. Add failing docs/source/help parity tests for `evidence`.
2. Add failing Evidence Index shape and read-only CLI tests.
3. Add failing status/handoff next-action tests.
4. Add failing archive V2 and V1 compatibility tests.
5. Implement Evidence Index and next manual action helpers.
6. Wire CLI, handoff, archive, verify-archive, docs, and source skill.
7. Run `npm run test:workspace`, then `npm ci && npm run quality`.

## Cut Line

V14 stops after Evidence Index, next manual actions, handoff summary, archive V2,
V1 archive compatibility, docs, and tests. `workspace diff`, runtime execution,
restore/replay, promotion, scheduler, watcher, daemon, and live adapter work
remain future PRD topics.
