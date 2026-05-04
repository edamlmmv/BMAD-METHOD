---
title: "BMAD Workspace V16 Backlog"
description: TDD-first backlog for Review Manifest and diff trust hardening
---

# BMAD Workspace V16 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E67 V16 Planning | Create traceable V16 artifacts. | AT16-001 | Broad feature discovery | Docs drift from implementation |
| E68 Review Manifest | Add typed review evidence and validation. | AT16-002 to AT16-006 | Review approval engine | Manifest becomes authority |
| E69 Archive Trust | Preserve and verify Review Manifest in archives. | AT16-007 to AT16-008 | Restore or replay | Archived refs drift |
| E70 Diff Refusal Matrix | Harden non-archive diff source refusal. | AT16-009 to AT16-010 | Live compare | Unsupported source ambiguity |
| E71 Guardrails | Preserve manual-only boundaries. | AT16-011 to AT16-012 | Runtime expansion | Scope creep |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S148 | V16 artifacts exist and are linked. | V16 docs missing from index. | Add PRD, backlog, acceptance, traceability, and release checklist. | AT16-001 |
| S149 | Review Manifest validates. | Invalid Review Manifest shape passes. | Add validator, forbidden action constants, and contract tests. | AT16-002, AT16-003 |
| S150 | Review writes Review Manifest. | `review` omits manifest. | Generate manifest with source refs, checks, findings, and decision. | AT16-002, AT16-003 |
| S151 | Inspectors surface Review Manifest. | Status, evidence, handoff, and closeout omit manifest. | Wire status, evidence, handoff, and closeout refs. | AT16-004 to AT16-006 |
| S152 | Archive carries Review Manifest. | Archive omits or fails to validate manifest. | Copy and verify archived Review Manifest. | AT16-007, AT16-008 |
| S153 | Diff refuses unsupported sources. | URL, live Session, or duplicate manifest paths slip through. | Add stable refusal and archive validation errors. | AT16-009, AT16-010 |
| S154 | Guardrails stay closed. | Docs or tests imply execution, compare, scoring, or promotion. | Update docs, source skill, release checklist, and contract tests. | AT16-011, AT16-012 |

## TDD Order

1. Add failing Review Manifest validator and contract tests.
2. Add failing CLI tests for review output, status, evidence, closeout, archive,
   verify-archive, and diff refusals.
3. Implement Review Manifest module and wire review/status/evidence/handoff.
4. Wire closeout and archive verification.
5. Harden diff and archive manifest validation.
6. Update docs, source skill, command contract, and release checklist.
7. Run `npm run test:workspace`, then `npm ci && npm run quality`.

## Cut Line

V16 stops after typed review evidence and diff refusal hardening. Publish
packets, semantic compare, branch diff, live Session diff, restore/replay,
merge/promotion, execution runtime, scheduler, watcher, daemon, and live
adapters remain future PRD topics.
