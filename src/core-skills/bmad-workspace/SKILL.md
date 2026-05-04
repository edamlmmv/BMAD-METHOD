---
name: bmad-workspace
description: 'Operate BMAD Workspace Sessions from Codex. Use when launching sessions, running Repo Intake, creating BMAD Work Packets, recording manual results, reviewing worktrees, destroying runtime state, or preparing grant-governed base improvements.'
---

# BMAD Workspace

## Purpose

Operate the local BMAD Workspace CLI as a BMAD-first Workspace Session
harness. BMAD remains the source of truth, Codex performs the work, and Git
worktrees provide review and provenance.

## First Check

Before session work, verify the CLI visible to Codex:

```bash
bmad --version
bmad workspace --help
```

Expected: version `6.6.0` or newer and help for `launch`, `intake`, `packet`,
`list`, `status`, `handoff`, `result`, `archive`, `verify-archive`, `review`,
`destroy`, and `authorize`.

Fallback when `PATH` is stale:

```bash
node {project-root}/tools/installer/bmad-cli.js workspace --help
```

## Normal Workspace Session

Use this path for target repo work. A normal Workspace Session may write target
repo worktrees and session runtime artifacts. It must not write the Workspace
Base.

```bash
bmad workspace launch --repo <target-repo> --goal <goal-file> --runtime-root <runtime-root>
bmad workspace intake <session-id> --runtime-root <runtime-root>
bmad workspace packet <session-id> --runtime-root <runtime-root> \
  --workflow <skill[:action]> \
  --zoom-out-ref <ref> \
  --ubiquitous-language-ref <ref> \
  --grill-decisions-ref <ref> \
  --tdd-plan-ref <ref>
bmad workspace list --runtime-root <runtime-root>
bmad workspace status <session-id> --runtime-root <runtime-root>
bmad workspace handoff <session-id> --runtime-root <runtime-root>
bmad workspace result <session-id> --runtime-root <runtime-root> --input <result-json>
bmad workspace review <session-id> --runtime-root <runtime-root>
bmad workspace archive <session-id> --runtime-root <runtime-root> --output <archive-dir>
bmad workspace verify-archive <archive-dir>
bmad workspace destroy <session-id> --runtime-root <runtime-root> --keep-review
```

Treat `packets/bmad-work-packet.json` as the BMAD Work Packet. The rendered
prompt is derived from that packet and is not the source of truth.

V10 uses one active packet bundle per Workspace Session. Re-running
`bmad workspace packet` explicitly rebuilds that active bundle, including
`packets/bmad-work-packet.json`, `packets/rendered-prompt.md`, and
`packets/executor-contract.json`. Read-only commands never regenerate packet
artifacts.

## Executor Contract

New BMAD Work Packets record `executorContractRef:
packets/executor-contract.json`. The Executor Contract is a manual readiness
artifact only. It declares `executionMode: manual`, `executorKind: codex`,
granted `allowedWriteRoots`, forbidden actions, and manual execution steps.

All refs in the contract are Session-relative POSIX paths except
`allowedWriteRoots`, which are canonical absolute granted roots by design.
Allowed roots come only from Workspace grants and repo worktrees. They are never
inferred from the current working directory.

The contract tells a human or Codex operator to inspect status, use the rendered
prompt, work only inside granted roots, run checks manually, and record evidence
with `bmad workspace result`. It does not invoke Codex, run shell commands,
schedule work, activate live adapters, restore, replay, merge, promote, or write
outside granted roots.

## Routing Contract

V8 packets include deterministic BMAD workflow routing:

- New packets record `routing.routingSchemaVersion: 1`.
- `bmadWorkflow` is a compatibility alias for `routing.selectedWorkflow`.
- `--workflow <skill[:action]>` explicitly selects a route from the BMad Method
  workflow catalog.
- Unknown, agent-only, or non-routeable workflow overrides fail before packet
  artifacts are written.
- Empty or ambiguous deterministic goals fail closed and require explicit
  `--workflow`.

Routing prepares the next manual BMAD workflow only. It does not run, schedule,
watch, restore, replay, merge, promote, or call live adapters.

## Result Ledger

Use result to record manual execution evidence after a BMAD Work Packet exists:

```bash
bmad workspace result <session-id> --runtime-root <runtime-root> --input <result-json> --result-id <id>
```

The input is JSON data only. Workspace records outcome, summary, command text,
evidence refs, and optional failure details under `results/<resultId>.json`.
It never executes commands from the input.

Result recording fails before writing when:

- the session or BMAD Work Packet is missing or invalid
- `--result-id` is unsafe or already exists
- input JSON is malformed or has invalid outcome
- high-confidence secrets are detected

Results are manual evidence only. They do not restore, replay, schedule,
execute, merge, promote, or call live adapters.

## Setup Gate

Every BMAD Work Packet requires setup entries for:

- zoom-out
- ubiquitous language
- grill decisions
- TDD plan

Each setup entry must be complete with a ref or skipped with an explicit reason.
Use `--skip-setup <step=reason>` only when the user accepts the skip.

Setup refs may be local or external:

- bare path or `file:<path>`: local evidence file; BMAD Workspace records
  `sha256` and later reports checksum drift.
- `external:<ref>`: opaque provenance; no network fetch, no checksum, warning
  only as `external-unverified`.

## Status

Use status to inspect a Workspace Session without changing it:

```bash
bmad workspace status <session-id> --runtime-root <runtime-root>
```

Status reads session artifacts and reports blockers such as missing intake,
stale intake, missing packet, setup checksum drift, invalid or secret-positive
results, missing review, and Base Improvement readiness. Missing results are
not blockers.

Status does not create, repair, resume, run, fetch, schedule, watch, promote, or
merge anything.

## List

Use list to inventory Workspace Sessions without changing them:

```bash
bmad workspace list --runtime-root <runtime-root>
```

List emits JSON for known session directories. It reports invalid entries with
`SESSION_INVALID`, does not follow symlinks, and does not infer latest/current
sessions.

## Handoff

Use handoff to produce copy-ready Codex continuation context:

```bash
bmad workspace handoff <session-id> --runtime-root <runtime-root>
```

Handoff emits raw Markdown with fixed sections for identity, status, blockers,
BMAD Work Packet, Executor Contract, Setup Gate, Result Ledger, Worktree Review,
Base Improvement readiness, next BMAD route, and read-only boundary.

Handoff requires an explicit session id. It does not create, repair, resume,
fetch, schedule, watch, execute, apply changes, or change durable state.

## Archive

Use archive to capture a portable evidence bundle for a Workspace Session:

```bash
bmad workspace archive <session-id> --runtime-root <runtime-root> --output <archive-dir>
```

Archive creates the exact requested output directory and fails if it already
exists. It writes only that output directory. It copies known Session artifacts,
valid result artifacts, status, handoff, closeout notes, and checksums. It does
not copy target repo contents, Workspace Base contents, local setup evidence
files, secrets, or whole runtime directories.

The archive is an evidence bundle. It is not a restore package, import package,
replay input, execution plan, scheduler input, or durable state action.

## Verify Archive

Use verify-archive to inspect archive integrity without changing it:

```bash
bmad workspace verify-archive <archive-dir>
```

Verify checks `manifest.json`, required files, safe relative paths, SHA-256
checksums, and archived result shape. It does not fetch, repair, probe repos,
restore, import, execute, schedule, merge, or change durable state.

## Base Improvement Session

Use this path only when the user explicitly grants BMAD Workspace mutation.
Require a Base Mutation Grant with scoped allowed paths and a BMAD artifact
reference.

```bash
bmad workspace launch --base-improvement --grant <grant.json> --goal <goal-file> --runtime-root <runtime-root>
bmad workspace authorize <session-id> --write-path <path> --runtime-root <runtime-root>
```

Promotion into the base is explicit only. No auto-promotion.

## Base Improvement Session Kit

For Codex-guided base improvement, start from:

- `{project-root}/docs/workspace/templates/base-improvement-goal.md`
- `{project-root}/docs/workspace/templates/base-mutation-grant.template.json`
- `{project-root}/docs/workspace/templates/bmad-work-packet.template.json`
- `{project-root}/docs/workspace/templates/base-improvement-prompt.md`
- `{project-root}/docs/workspace/templates/worktree-review-checklist.md`

The kit prepares a reviewable BMAD Work Packet. It does not execute a hidden
run, expand grants, or promote changes.

## Guardrails

- Use public CLI behavior first.
- Use temp runtime roots for experiments.
- Check Git status before and after session operations.
- Do not create schedulers, daemons, memory graphs, live adapters,
  auto-promotion, or hidden execution.
- Treat Executor Contract artifacts as manual readiness declarations, not
  runtime permission or execution output.
- Do not treat Result Ledger artifacts as execution, restore, or replay input.
- Treat archives as evidence bundles only; never as restore or execution inputs.
- Keep unrelated dirty files untouched.
