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
`review`, `destroy`, and `authorize`.

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
