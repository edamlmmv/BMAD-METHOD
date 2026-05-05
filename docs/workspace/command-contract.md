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

## Command Registry

`tools/workspace/command-registry.js` is the source of truth for Workspace
command names, descriptions, and command classes. CLI help, docs parity checks,
and contract tests use that registry so current surfaces cannot drift silently.
Public command names and options are frozen for this contract.

## Commands

| Command | Class | Output | Filesystem Effect | Stable Contract |
| --- | --- | --- | --- | --- |
| `launch` | `write` | JSON | Creates session runtime, repo worktrees, grants, and `instance.json`. | Requires `--repo`, `--goal`, and optional `--session-id`. |
| `intake` | `write` | JSON | Writes `intake/repo-intake.json` and provenance. | Fails when session is missing or invalid. |
| `packet` | `write` | JSON | Writes active packet bundle under `packets/`. | Requires fresh intake, complete or explicitly skipped Setup Gate, and required Evidence Gate v1 evidence. |
| `list` | `read` | JSON | Read-only. | Lists explicit sessions under runtime root; no latest-session inference. |
| `status` | `read` | JSON | Read-only. | Reports blockers, artifact state, and derived lifecycle. |
| `handoff` | `read` | Markdown | Read-only. | Emits copy-ready continuation context for an explicit session id. |
| `evidence` | `read` | JSON | Read-only. | Emits artifact evidence, checksums, validation state, and next manual actions. |
| `verify-capability` | `read` | JSON | Read-only. | Verifies one Capability Request JSON against supplied declared capabilities; no session lookup, adapter probing, or customization merge. |
| `diff` | `read` | JSON | Read-only. | Compares two verified Workspace archive bundles. |
| `result` | `write` | JSON | Writes `results/<result-id>.json`. | Records manual execution evidence and never executes commands. |
| `closeout` | `write` | JSON | Writes `closeout/<closeout-id>.json`. | Records manual final decision and next manual review action. |
| `archive` | `write` | JSON | Creates the exact output directory. | Copies evidence artifacts only, never worktrees or setup source files. |
| `verify-archive` | `read` | JSON | Read-only. | Validates archive manifest, checksums, refs, results, closeouts, and executor contract. |
| `review` | `write` | JSON | Writes review summary, Review Manifest, per-repo status, and patch refs. | Reads Git worktrees and preserves target repo state. |
| `destroy` | `destructive` | JSON | Removes session runtime; optional review retention. | Preserves target repo source and commits. |
| `authorize` | `grant-gated` | JSON | Writes violation evidence only on denial. | Validates requested durable write path against grants before target mutation. |

## Stable Error Families

- Session and artifact state: `SESSION_NOT_FOUND`, `SESSION_INVALID`,
  `WORK_PACKET_INVALID_JSON`, `STALE_INTAKE`.
- Setup and routing: `SETUP_REF_MISSING`,
  `SETUP_REF_CHECKSUM_MISMATCH`, `ROUTE_WORKFLOW_UNKNOWN`,
  `ROUTE_DECISION_REQUIRED`.
- Executor readiness: `EXECUTOR_CONTRACT_MISSING`,
  `EXECUTOR_CONTRACT_INVALID`.
- Evidence Gate v1: `EVIDENCE_GATE_FAILED`.
- Capability verifier: `REQUEST_INVALID`, `CAPABILITY_NOT_DECLARED`,
  `CAPABILITY_ID_DUPLICATE`, `SESSION_NOT_ALLOWED`, `GROUP_MISMATCH`,
  `PROVIDER_MISMATCH`, `INTERFACE_MISMATCH`, `WRITE_NOT_DECLARED`,
  `WRITE_FORBIDDEN`, `OUTPUT_NOT_DECLARED`.
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
- `evidenceGates` projection with recomputed gate state; pass/fail status is
  never persisted back into the packet
- `artifacts[]` entries with `stage`, `kind`, `ref`, `present`,
  `validationState`, `sha256`, `bytes`, and `sourceCommand`
- `checks[]` entries with `code`, `severity`, `message`, `ref`, and
  `nextManualAction`

`evidence` never creates, repairs, fetches, executes, restores, replays,
archives, destroys, merges, promotes, schedules, watches, or activates adapters.

## Capability Verification Shape

`verify-capability` accepts one `--input <request.json>` document with:

- `kind: bmad-workspace-capability-request`
- `schemaVersion: 1`
- `request.id` and `request.sessionType`
- optional requested `group`, `provider`, `interface`, `writes`, and `outputs`
- `capabilities[]` entries shaped like the Workspace Capability Contract
- optional `observations[]` for advisory Codex/tool or checked-in graph facts

The command returns `bmad-workspace-capability-verdict` JSON with `ok`,
`request`, `matchedDeclaration`, `errors`, `warnings`, and `observations`.
`ok: true` means declared contract compatibility only. It does not authorize
writes, prove runtime availability, inspect local Codex config, read
`_bmad/custom`, run Graphify, call app-server APIs, or replace Evidence Gate,
Grant Guard, self-improve invariants, install checks, or quality checks.

Matching is exact and case-sensitive on `request.id`. Aliases, semantic match,
lowercasing, trimming, group fallback, and provider fallback are not part of v1.
Requested `writes` and `outputs` use exact token subset checks; no glob, prefix,
or path containment semantics are inferred. `requiresGrant` is reported as an
advisory observation only; `authorize` remains the grant authority.

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

## Archive Contract

Current archives use `archiveVersion: 2` and include `evidence-index.json`.
`verify-archive` validates the current manifest contract, Evidence Index shape,
and Evidence Index checksum for current bundles.

## Diff Shape

`diff` returns:

- `schemaVersion: 1`
- `diffVersion: 1`
- `left` and `right` archive descriptors
- `summary` with change counts and incomparable sections
- `fileDeltas` grouped as added, removed, changed, and unchanged
- `statusDeltas`, `evidenceDeltas`, `packetDeltas`, and `closeoutDeltas`

Inputs must verify under the current Workspace archive manifest contract before
comparison.

## Non-Goals

Current contract does not add `workspace run`, `workspace compare`, automatic closeout,
automatic archive, automatic destroy, scheduler, watcher, daemon, background
worker, restore, replay, import, sync, apply, merge, promotion, remote fetch,
live adapter activation, hidden execution, semantic diff scoring, or live
Session comparison.
