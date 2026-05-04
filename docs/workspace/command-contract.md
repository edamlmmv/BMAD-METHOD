---
title: "BMAD Workspace Command Contract"
description: Stable public contract for Workspace CLI commands
---

# BMAD Workspace Command Contract

The current Workspace CLI contract is frozen around typed Review Manifest
evidence and read-only archive diff inspection. Docs, tests, and operators share
one source of truth before any future runtime expansion.

## Contract Rules

- `handoff` writes Markdown to stdout; every other command writes JSON to stdout.
- Failures write a stable error message to stderr and exit nonzero.
- Read-only commands never create, repair, resume, fetch, schedule, watch,
  execute, merge, promote, restore, replay, or call live adapters.
- Evidence commands record JSON data only. They never execute command strings or
  turn stored evidence into authority.
- Review Manifest records what Worktree Review inspected. It is evidence, not
  approval, promotion, or workflow authority.
- Diff compares archive evidence bundles only. It never applies, syncs, restores,
  replays, imports, merges, promotes, fetches, or watches.
- Session refs are POSIX relative paths unless explicitly documented as absolute
  granted roots.

## Codex Operator Affordances

Codex slash commands, tools, hooks, plugins, and future UI commands are operator
affordances, not Workspace subcommands. Operators may use `/goal`, subagents,
hooks, plugins, and other Codex features while executing a BMAD Work Packet, but
Workspace only records resulting evidence through goal files, Result Ledger,
Review Manifest, Closeout, Handoff, archives, or explicit future artifacts.

Affordance metadata must stay generic: command name, required capability,
inputs, expected evidence refs, and boundary. It must not hard-code provider
workflows or imply hidden execution. `~/.codex/config.toml` can inform
capability discovery when explicitly supplied by the operator, such as
`features.goals`, `features.multi_agent`, or `features.codex_hooks`, but it is
not Workspace authority and must not be required for deterministic tests.

## Commands

| Command | Output | Filesystem Effect | Stable Contract |
| --- | --- | --- | --- |
| `launch` | JSON | Creates session runtime, repo worktrees, grants, and `instance.json`. | Requires `--repo`, `--goal`, and optional `--session-id`. |
| `intake` | JSON | Writes `intake/repo-intake.json` and provenance. | Fails when session is missing or invalid. |
| `packet` | JSON | Writes active packet bundle under `packets/`. | Requires fresh intake and complete or explicitly skipped Setup Gate. |
| `status` | JSON | Read-only. | Reports blockers, artifact state, and derived lifecycle. |
| `list` | JSON | Read-only. | Lists explicit sessions under runtime root; no latest-session inference. |
| `handoff` | Markdown | Read-only. | Emits copy-ready continuation context for an explicit session id. |
| `evidence` | JSON | Read-only. | Emits artifact evidence, checksums, validation state, and next manual actions. |
| `diff` | JSON | Read-only. | Compares two verified Workspace archive bundles. |
| `result` | JSON | Writes `results/<result-id>.json`. | Records manual execution evidence and never executes commands. |
| `review` | JSON | Writes review summary, Review Manifest, per-repo status, and patch refs. | Reads Git worktrees and preserves target repo state. |
| `closeout` | JSON | Writes `closeout/<closeout-id>.json`. | Records manual final decision and next manual review action. |
| `archive` | JSON | Creates the exact output directory. | Copies evidence artifacts only, never worktrees or setup source files. |
| `verify-archive` | JSON | Read-only. | Validates archive manifest, checksums, refs, results, closeouts, and executor contract. |
| `destroy` | JSON | Removes session runtime; optional review retention. | Preserves target repo source and commits. |
| `authorize` | JSON | Writes violation evidence only on denial. | Validates requested durable write path against grants. |

## Stable Error Families

- Session and artifact state: `SESSION_NOT_FOUND`, `SESSION_INVALID`,
  `WORK_PACKET_INVALID_JSON`, `STALE_INTAKE`.
- Setup and routing: `SETUP_REF_MISSING`,
  `SETUP_REF_CHECKSUM_MISMATCH`, `ROUTE_WORKFLOW_UNKNOWN`,
  `ROUTE_DECISION_REQUIRED`.
- Executor readiness: `EXECUTOR_CONTRACT_MISSING`,
  `EXECUTOR_CONTRACT_INVALID`.
- Result ledger: `RESULT_PACKET_MISSING`, `RESULT_ID_UNSAFE`,
  `RESULT_EXISTS`, `RESULT_INVALID`, `RESULT_SECRET_DETECTED`.
- Closeout: `CLOSEOUT_PACKET_MISSING`, `CLOSEOUT_REVIEW_MISSING`,
  `CLOSEOUT_ID_UNSAFE`, `CLOSEOUT_EXISTS`, `CLOSEOUT_INVALID`,
  `CLOSEOUT_SECRET_DETECTED`.
- Review Manifest: `REVIEW_MANIFEST_MISSING`,
  `REVIEW_MANIFEST_INVALID_JSON`, `REVIEW_MANIFEST_INVALID`.
- Archive: `ARCHIVE_NOT_FOUND`, `ARCHIVE_MANIFEST_MISSING`,
  `ARCHIVE_MANIFEST_INVALID`, `ARCHIVE_OUTPUT_EXISTS`,
  `ARCHIVE_CHECKSUM_MISMATCH`, `ARCHIVE_UNSAFE_PATH`,
  `ARCHIVE_RESULT_INVALID`, `ARCHIVE_CLOSEOUT_INVALID`,
  `ARCHIVE_EXECUTOR_CONTRACT_INVALID`, `ARCHIVE_EVIDENCE_INDEX_INVALID`,
  `ARCHIVE_REVIEW_MANIFEST_INVALID`.
- Diff: `DIFF_SOURCE_REQUIRED`, `DIFF_SOURCE_NOT_FOUND`,
  `DIFF_SOURCE_UNSUPPORTED`, `DIFF_ARCHIVE_INVALID`, `DIFF_UNSAFE_PATH`.

## Evidence Index Shape

`evidence` returns:

- `schemaVersion: 1`
- `sessionId`, `sessionRoot`, and `generatedAt`
- `state: complete | warning | invalid`
- `artifacts[]` entries with `stage`, `kind`, `ref`, `present`,
  `validationState`, `sha256`, `bytes`, and `sourceCommand`
- `checks[]` entries with `code`, `severity`, `message`, `ref`, and
  `nextManualAction`

`evidence` never creates, repairs, fetches, executes, restores, replays,
archives, destroys, merges, promotes, schedules, watches, or activates adapters.

## Review Manifest Shape

`review/review-manifest.json` records:

- `kind: bmad-workspace-review-manifest`
- `schemaVersion: 1`
- `sessionId`, `reviewId`, `createdAt`, and `createdBy`
- `sourceRefs` for packet, executor contract, capability contract, result
  ledger, review summary, closeout, archive, and archive diff when present
- `capabilities.allowed` and `capabilities.forbidden`
- `checks[]` entries with `id`, `status`, `evidenceRefs`, and `message`
- `findings[]` entries with severity, owner, status, and evidence refs
- `decision.status: ready | blocked | needs_human_review`

Review Manifest is an evidence map only. It never executes, restores, replays,
imports, merges, promotes, fetches, schedules, watches, activates adapters, or
turns review findings into approval.

## Archive Formats

`archiveVersion: 1` bundles remain valid for `verify-archive`.
Current archives use `archiveVersion: 2` and include `evidence-index.json`.
`verify-archive` validates the Evidence Index shape and checksum for
`archiveVersion: 2` bundles.

## Diff Shape

`diff` returns:

- `schemaVersion: 1`
- `diffVersion: 1`
- `left` and `right` archive descriptors
- `summary` with change counts and incomparable sections
- `fileDeltas` grouped as added, removed, changed, and unchanged
- `statusDeltas`, `evidenceDeltas`, `packetDeltas`, and `closeoutDeltas`

`archiveVersion: 1` inputs remain comparable, but Evidence Index deltas are
marked `incomparable` because those bundles do not require
`evidence-index.json`.

## Non-Goals

Current contract does not add `workspace run`, `workspace compare`, automatic closeout,
automatic archive, automatic destroy, scheduler, watcher, daemon, background
worker, restore, replay, import, sync, apply, merge, promotion, remote fetch,
live adapter activation, hidden execution, semantic diff scoring, or live
Session comparison.
