---
title: "BMAD Workspace V15 Backlog"
description: TDD-first backlog for read-only archive diff
---

# BMAD Workspace V15 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E62 V15 Planning | Create traceable V15 artifacts. | AT15-001 | Broad feature discovery | Docs drift from implementation |
| E63 Diff Contract | Add read-only archive diff command and schema. | AT15-002 to AT15-005 | Live session diff | Diff implies authority |
| E64 Delta Coverage | Compare file, status, packet, closeout, and evidence surfaces. | AT15-006 to AT15-008 | Semantic review verdict | Noisy volatile data |
| E65 Guardrails | Preserve manual-only and archive-only boundaries. | AT15-009 to AT15-011 | Compare, restore, replay, merge | Scope creep |
| E66 Release Readiness | Provide V15 maintainer checklist. | AT15-012 | Release automation | Push gate omitted |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S142 | V15 artifacts exist and are linked. | V15 docs missing from index. | Add PRD, backlog, acceptance, traceability, release checklist, and source guidance. | AT15-001 |
| S143 | Diff command is discoverable. | Help and command contract omit `diff`. | Add `diff`, `--left`, `--right`, and stable error docs. | AT15-002, AT15-003 |
| S144 | Diff verifies sources first. | Invalid archive produces partial diff. | Require valid archive inputs and stable `DIFF_*` errors. | AT15-004, AT15-009 |
| S145 | File deltas are deterministic. | Identical archives or changed files produce unstable output. | Compare manifest files by path, SHA-256, and bytes. | AT15-005 to AT15-007 |
| S146 | Evidence and artifact deltas are stable. | V1 archives fail or volatile paths create false changes. | Normalize volatile fields and mark V1 Evidence Index as incomparable. | AT15-008 |
| S147 | Diff remains read-only. | Diff mutates inputs or introduces execution language. | Assert tree fingerprints and guardrail text. | AT15-010, AT15-011 |

## TDD Order

1. Add failing help, docs, command inventory, and source skill tests.
2. Add failing CLI tests for missing inputs, invalid archives, identical V2
   archives, changed files, added/removed files, and V1/V2 evidence.
3. Implement `tools/workspace/diff.js` with archive verification and stable JSON.
4. Wire CLI options and next manual actions.
5. Update docs, source skill, command contract, and release checklist.
6. Run `npm run test:workspace`, then `npm ci && npm run quality`.

## Cut Line

V15 stops after JSON-only archive diff. `workspace compare`, live session diff,
branch diff, restore/replay, merge/promotion, execution runtime, scheduler,
watcher, daemon, and live adapters remain future PRD topics.
