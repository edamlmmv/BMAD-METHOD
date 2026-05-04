---
title: "BMAD Workspace V10 PRD"
description: Manual Executor Contract requirements
---

# BMAD Workspace V10 PRD

## Overview

V10 adds a Manual Executor Contract for Workspace Sessions. It makes the
Codex execution boundary inspectable before manual work starts, without adding
automatic execution.

## Goals

- Add `packets/executor-contract.json` to new BMAD Work Packet builds.
- Record `executorContractRef` in new BMAD Work Packets.
- Declare manual Codex execution mode, allowed write roots, forbidden actions,
  and manual evidence steps.
- Surface contract state in status, handoff, archive, and verify-archive.
- Preserve legacy packets without the contract as warning-only evidence.

## Non-Goals

- No `workspace run`.
- No Codex invocation, shell execution, scheduler, watcher, daemon, or live
  adapter activation.
- No restore, replay, merge, or automatic promotion behavior.
- No multi-packet history; V10 keeps one active packet bundle per Session.
- No Result Ledger interpretation beyond manual evidence recording.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V10-FR-001 | New packet builds shall write `packets/executor-contract.json` and add `executorContractRef` to the BMAD Work Packet. |
| V10-FR-002 | Packet rebuilds shall validate the packet, rendered prompt, capability contract, and executor contract before publishing. |
| V10-FR-003 | Failed packet rebuilds shall leave prior active packet bundle artifacts and refs unchanged. |
| V10-FR-004 | Executor Contract validation shall require schema version, session refs, routing, manual execution mode, Codex executor kind, non-empty allowed write roots, forbidden actions, and manual steps. |
| V10-FR-005 | Allowed write roots shall derive only from grants and repo worktrees, never from current working directory inference. |
| V10-FR-006 | Capability Contract shall include `executor.codex.manual` as readiness support, not runtime execution permission. |
| V10-FR-007 | Status and handoff shall report valid, legacy-missing, declared-missing, or invalid Executor Contract state. |
| V10-FR-008 | Archive shall copy valid Executor Contract artifacts and fail declared missing or invalid contracts. |
| V10-FR-009 | Verify archive shall validate archived Executor Contract artifacts and archived refs, not live Session paths. |
| V10-FR-010 | Documentation and source skill guidance shall keep the manual-only boundary explicit. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Before push, `npm ci && npm run quality` passes on the exact checkout.
