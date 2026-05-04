---
title: "BMAD Workspace V11 PRD"
description: Manual closeout requirements for Workspace Sessions
---

# BMAD Workspace V11 PRD

## Overview

V11 adds a first-class Manual Closeout artifact for Workspace Sessions. It lets
a human or Codex operator record the end-state decision for a Session after
manual execution, results, and Worktree Review evidence exist. Closeout is
evidence and guidance only; it does not execute, archive, destroy, merge, or
promote anything.

## Baseline

V1 through V10 established the Workspace Session lifecycle:

- Launch, Repo Intake, BMAD Work Packet creation, Worktree Review, Destroy, and
  Base Improvement grants.
- Session-only language, Setup Gate evidence, read-only status, inventory,
  handoff, archive, deterministic routing, Result Ledger, and Manual Executor
  Contract.
- Repeated guardrail: no `workspace run`, no hidden execution, no scheduler,
  no watcher, no daemon, no restore or replay, no merge, and no automatic
  promotion.

V11 closes the manual loop after execution evidence is recorded. It gives status,
handoff, archive, and verify-archive one durable place to read the operator's
final Session decision.

## Goals

- Add a `closeout` Workspace command that records manual Session closeout data.
- Store closeout artifacts under `closeout/<closeout-id>.json`.
- Tie closeout to the active BMAD Work Packet, routing, Executor Contract, Result
  Ledger, and Worktree Review refs.
- Report closeout count and latest closeout in status, list, handoff, archive,
  and verify-archive.
- Keep missing closeout warning-only; invalid or secret-positive closeout
  artifacts are blockers.
- Preserve the manual-only boundary and avoid any durable action verbs that
  imply execution, restore, replay, merge, promotion, or destroy.

## Non-Goals

- No `workspace run`.
- No command execution from closeout input.
- No automatic archive, destroy, merge, promotion, or target repo action.
- No acceptance scoring or quality judgment.
- No restore, replay, import, scheduler, watcher, daemon, or live adapter.
- No multi-closeout workflow engine; V11 only records and reports artifacts.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V11-FR-001 | Help shall list `closeout`, `--input <path>`, and `--closeout-id <id>` while still omitting execution commands. |
| V11-FR-002 | Closeout recording shall require an existing Session, valid BMAD Work Packet, and non-invalid Executor Contract state. |
| V11-FR-003 | Closeout recording shall not require existing result artifacts, but shall link any valid results that exist. |
| V11-FR-004 | Closeout recording shall require Worktree Review to exist before writing a completed closeout. |
| V11-FR-005 | Closeout ids shall be safe path segments; duplicates shall fail before writing. |
| V11-FR-006 | Closeout input shall be JSON data only; command strings in input shall never be executed. |
| V11-FR-007 | Secret-positive closeout input or stored closeout artifacts shall fail with stable errors and write no new artifact. |
| V11-FR-008 | Closeout artifacts shall include kind, schema version, session id, closeout id, packet ref, routing, executor contract ref, result refs, review ref, outcome, next action, summary, and optional evidence refs. |
| V11-FR-009 | Closeout validation shall allow only manual next-action values and shall reject action wording that implies execution, restore, replay, merge, promotion, or destroy. |
| V11-FR-010 | Status and list shall report closeout count and latest outcome without making missing closeout a blocker. |
| V11-FR-011 | Invalid or secret-positive stored closeout artifacts shall appear as blockers. |
| V11-FR-012 | Handoff shall include a Closeout section and use latest closeout guidance only when no higher-priority blockers exist. |
| V11-FR-013 | Archive shall copy valid closeout artifacts and mention latest closeout in `closeout.md`. |
| V11-FR-014 | Verify archive shall validate archived closeout shape, checksums, and archived refs, not live Session paths. |
| V11-FR-015 | Documentation and source skill guidance shall keep closeout evidence-only and manual-only. |

## Closeout Input Shape

```json
{
  "outcome": "completed",
  "nextAction": "manual-target-review",
  "summary": "Manual work finished and review evidence is ready.",
  "evidenceRefs": ["results/result-001.json", "review/summary.json"]
}
```

Allowed `outcome` values:

- `completed`
- `blocked`
- `abandoned`
- `continued`

Allowed `nextAction` values:

- `manual-target-review`
- `manual-base-review`
- `manual-archive-review`
- `manual-continuation-review`
- `manual-discard-review`

## Closeout Artifact Shape

```json
{
  "kind": "bmad-workspace-closeout",
  "schemaVersion": 1,
  "sessionId": "session-20260504-example",
  "closeoutId": "closeout-001",
  "createdAt": "2026-05-04T00:00:00.000Z",
  "packetRef": "packets/bmad-work-packet.json",
  "routing": {
    "selectedWorkflow": "bmad-quick-dev"
  },
  "executorContractRef": "packets/executor-contract.json",
  "resultRefs": ["results/result-001.json"],
  "reviewRef": "review/summary.json",
  "outcome": "completed",
  "nextAction": "manual-target-review",
  "summary": "Manual work finished and review evidence is ready.",
  "evidenceRefs": ["results/result-001.json", "review/summary.json"]
}
```

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Before push, `npm ci && npm run quality` passes on the exact checkout.
