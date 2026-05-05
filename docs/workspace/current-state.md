---
title: "BMAD Workspace Current State"
description: Compact summary of the implemented Workspace surface
---

# BMAD Workspace Current State

The current Workspace surface is a manual CLI and filesystem contract. It
creates disposable Workspace Sessions, records evidence artifacts, and keeps
review decisions with the human operator.

## Implemented Surface

| Area | Current Behavior |
| --- | --- |
| Session setup | `launch`, `intake`, and `packet` create the session, repo provenance, Setup Gate, routing, BMAD Work Packet, rendered prompt, and Manual Executor Contract. |
| Manual evidence | Result Ledger records `result` execution evidence as inert JSON data. |
| Review evidence | `review` writes Worktree Review artifacts and Review Manifest evidence at `review/review-manifest.json`. |
| Session inspection | `status`, `list`, `handoff`, and `evidence` read stored artifacts without repair or execution. |
| Capability verification | `verify-capability` checks one self-contained request against declared capabilities only. |
| Closure | `closeout` records a manual final decision and next manual action. |
| Portability | `archive` writes `archiveVersion: 2` evidence bundles; `verify-archive` validates bundles; `diff` compares verified archives only. |
| Cleanup | `destroy` removes disposable runtime state while preserving target repo state. |
| Grants | `authorize` validates write paths and records denial evidence only when needed. |

## Current Guarantee

Workspace artifacts are evidence. They never become approval, execution,
restore, replay, merge, promotion, scheduler, watcher, daemon, or live adapter
input.

Capability verification is a declared-contract check. `ok: true` means the
request matched a declared capability and existing contract constraints; it does
not authorize writes, prove runtime tool availability, read `_bmad/custom`, run
Graphify, inspect local Codex config, or replace existing gates.

## Release Hygiene

Historical Workspace planning records are compiled under
`docs/workspace/history/`. Current docs are the normative operator and contract
surface.
