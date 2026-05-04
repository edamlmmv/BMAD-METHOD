---
title: "BMAD Workspace V16 PRD"
description: Review Manifest and diff trust hardening requirements
---

# BMAD Workspace V16 PRD

## Overview

V16 adds typed Review Manifest evidence to Worktree Review and hardens archive
diff refusal behavior. The goal is to make review evidence portable,
machine-readable, and explicit about what it inspected while keeping every
Workspace boundary manual-only.

V16 does not add execution, restore, replay, import, merge, promotion,
scheduling, watching, live adapters, semantic scoring, live Session comparison,
or `workspace compare`.

## Baseline

V15 added read-only archive diff over verified archive evidence bundles. The
remaining gap is typed review memory: `review/summary.json` and patches exist,
but there is no durable manifest that maps review checks, findings, source refs,
and capability boundaries for humans or downstream BMAD review steps.

## Goals

- Add `review/review-manifest.json` when `bmad workspace review` runs.
- Validate Review Manifest shape in status, evidence, archive, and
  verify-archive flows.
- Surface Review Manifest state in handoff and Evidence Index.
- Let Manual Closeout reference valid Review Manifest evidence.
- Harden `bmad workspace diff` refusal paths for non-archive sources.
- Add V16 docs, tests, command contract updates, and source skill guidance.

## Non-Goals

- No `workspace run`.
- No `workspace compare`.
- No live Session, branch, working tree, URL, or adapter diff.
- No semantic review verdict, acceptance score, or approval engine.
- No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  import.
- No scheduler, watcher, daemon, background worker, remote fetch, or live
  adapter activation.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V16-FR-001 | `review` shall write `review/review-manifest.json` with stable kind, schema version, source refs, capabilities, checks, findings, and decision state. |
| V16-FR-002 | Review Manifest shall declare forbidden actions including execution, restore, replay, merge, promotion, scheduling, watching, fetching, live adapter activation, and hidden subprocess. |
| V16-FR-003 | Status shall report Review Manifest state and warn when legacy review summary exists without a manifest. |
| V16-FR-004 | Evidence Index shall include Review Manifest as a review artifact with checksum and validation state. |
| V16-FR-005 | Handoff shall include Review Manifest ref and state. |
| V16-FR-006 | Closeout shall reference Review Manifest when valid. |
| V16-FR-007 | Archive shall copy Review Manifest and `verify-archive` shall validate archived Review Manifest shape. |
| V16-FR-008 | Diff shall reject URL, live Workspace Session, and Git worktree sources as unsupported archive sources. |
| V16-FR-009 | Archive verification shall reject duplicate manifest file paths. |
| V16-FR-010 | Docs, tests, command contract, and source skill shall preserve manual-only guardrails. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:refs` passes.
- `npm run validate:skills` passes.
- `npm ci && npm run quality` passes before push on the exact checkout.
