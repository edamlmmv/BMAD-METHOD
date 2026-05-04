---
title: "BMAD Workspace V12 PRD"
description: Lifecycle closure and contract hardening requirements
---

# BMAD Workspace V12 PRD

## Overview

V12 turns the planned Manual Closeout slice into an executable, tested Workspace
capability and tightens the lifecycle contract around the existing command set.
The release closes the gap between V11 planning artifacts and the V1 to V10
implementation: operators can record a final manual Session decision, inspect it
in read-only surfaces, and archive it as evidence without granting artifacts any
runtime authority.

Manual Closeout is evidence and guidance only. It does not execute commands,
archive, destroy, merge, promote, restore, replay, schedule, watch, run a daemon,
or activate live adapters.

## Baseline

The `codex/workspace-v11` branch adds the BMAD Workspace CLI, filesystem
contracts, documentation, and tests for:

- Workspace Session launch, Repo Intake, BMAD Work Packet creation, Worktree
  Review, Destroy, and Grant Guard authorization.
- Session Setup Gate, read-only status, inventory, Codex handoff, archive and
  archive verification, deterministic routing, Result Ledger, and Manual
  Executor Contract.
- V11 planning artifacts for Manual Closeout.

The current executable gap is that V11 closeout stories remain planned. V12
implements that gap and adds a derived lifecycle model so command boundaries are
clear before any larger orchestration work is considered.

## Goals

- Add a `closeout` Workspace command that records manual Session closeout data.
- Store closeout artifacts under `closeout/<closeout-id>.json`.
- Validate closeout schema, safe ids, JSON-only input, secret scanning, allowed
  outcomes, allowed next actions, and required refs before writing artifacts.
- Link closeout artifacts to the active BMAD Work Packet, routing, Executor
  Contract, Result Ledger, and Worktree Review.
- Surface closeout count, latest outcome, invalid closeout blockers, and derived
  lifecycle state in status, list, handoff, archive, and verify-archive.
- Document command boundaries as a derived state model, not a hidden workflow
  engine.
- Preserve the manual-only guardrail across code, tests, docs, and the
  `bmad-workspace` skill.

## Non-Goals

- No `workspace run`.
- No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  import.
- No scheduler, watcher, daemon, background worker, or live adapter activation.
- No acceptance scoring, quality judgment, approval workflow, or multi-closeout
  engine.
- No command that treats result, review, closeout, archive, or handoff evidence
  as authority to perform durable work.
- No party-mode execution integration. Party mode may critique plans, but it does
  not mutate Workspace artifacts or approve closeout.

## Derived Lifecycle Model

V12 reports lifecycle as a derived view over stored artifacts. It does not add a
separate durable state machine that can override artifact evidence.

| Derived State | Evidence |
| --- | --- |
| `launched` | `instance.json` exists and validates. |
| `intake-recorded` | Repo Intake exists and is fresh. |
| `packet-ready` | Active BMAD Work Packet and rendered prompt validate. |
| `executor-ready` | Executor Contract validates or legacy warning is reported. |
| `result-recorded` | One or more valid Result Ledger artifacts exist. |
| `review-recorded` | Worktree Review summary exists and validates. |
| `closeout-recorded` | One or more valid closeout artifacts exist. |
| `blocked` | Any high-severity status check or invalid artifact exists. |

The lifecycle model is inspectability only. It must not authorize writes, infer a
latest Session, replay archived evidence, or prevent explicit operator commands
that already pass their own preconditions.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V12-FR-001 | Help shall list `closeout`, `--input <path>`, and `--closeout-id <id>` while still omitting execution commands. |
| V12-FR-002 | Closeout recording shall require an existing Session, valid BMAD Work Packet, and non-invalid Executor Contract state. |
| V12-FR-003 | Closeout recording shall not require existing result artifacts, but shall link all valid results that exist. |
| V12-FR-004 | Completed closeout recording shall require Worktree Review to exist before writing. |
| V12-FR-005 | Closeout ids shall be safe path segments; duplicate ids shall fail before writing. |
| V12-FR-006 | Closeout input shall be JSON data only; command strings in input shall never be executed. |
| V12-FR-007 | Secret-positive closeout input or stored closeout artifacts shall fail with stable errors and write no new artifact. |
| V12-FR-008 | Closeout artifacts shall include kind, schema version, session id, closeout id, created timestamp, packet ref, routing, executor contract ref, result refs, review ref, outcome, next action, summary, and optional evidence refs. |
| V12-FR-009 | Closeout validation shall allow only manual outcome and next-action values and reject wording that implies execution, restore, replay, merge, promotion, destroy, scheduling, watching, or live adapter activation. |
| V12-FR-010 | Status and list shall report closeout count, latest closeout outcome, latest closeout ref, and derived lifecycle state without making missing closeout a blocker. |
| V12-FR-011 | Invalid or secret-positive stored closeout artifacts shall appear as blockers in status and list. |
| V12-FR-012 | Handoff shall include a Closeout section and use latest closeout guidance only when no higher-priority blockers exist. |
| V12-FR-013 | Archive shall copy valid closeout artifacts and mention latest closeout state in `closeout.md`. |
| V12-FR-014 | Verify archive shall validate archived closeout shape, checksums, and archived refs without reading live Session paths. |
| V12-FR-015 | Evidence artifacts shall remain inert: result, review, closeout, handoff, and archive data shall never be treated as execution, restore, replay, merge, promotion, destroy, scheduler, watcher, or live adapter input. |
| V12-FR-016 | Documentation, traceability, tests, and the source `bmad-workspace` skill shall describe V12 lifecycle closure and manual-only boundaries. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Before push, `npm ci && npm run quality` passes on the exact checkout.
