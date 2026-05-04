---
name: bmad-workspace
description: 'Operate BMAD Workspace Sessions from Codex. Use when launching sessions, running Repo Intake, creating BMAD Work Packets, reviewing worktrees, destroying runtime state, or preparing grant-governed base improvements.'
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
`list`, `status`, `handoff`, `review`, `destroy`, and `authorize`.

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
  --zoom-out-ref <ref> \
  --ubiquitous-language-ref <ref> \
  --grill-decisions-ref <ref> \
  --tdd-plan-ref <ref>
bmad workspace list --runtime-root <runtime-root>
bmad workspace status <session-id> --runtime-root <runtime-root>
bmad workspace handoff <session-id> --runtime-root <runtime-root>
bmad workspace review <session-id> --runtime-root <runtime-root>
bmad workspace destroy <session-id> --runtime-root <runtime-root> --keep-review
```

Treat `packets/bmad-work-packet.json` as the BMAD Work Packet. The rendered
prompt is derived from that packet and is not the source of truth.

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
stale intake, missing packet, setup checksum drift, missing review, and Base
Improvement readiness.

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
BMAD Work Packet, Setup Gate, Worktree Review, Base Improvement readiness, next
BMAD route, and read-only boundary.

Handoff requires an explicit session id. It does not create, repair, resume,
fetch, schedule, watch, execute, apply changes, or change durable state.

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
- Keep unrelated dirty files untouched.
