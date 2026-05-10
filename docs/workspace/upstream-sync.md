---
title: 'BMAD Upstream Sync'
description: Scope and command contract for planning BMAD upstream updates
---

# BMAD Upstream Sync

`bmad upstream-sync` is a dry-run-first updater workflow for keeping a BMAD
checkout aligned with upstream BMAD-METHOD releases. It is a source update
planner and guarded apply command, not a Workspace Session command.

## Scope

Use this workflow when a BMAD checkout needs to compare one upstream git ref or
tag with another, such as `6.6.0` to `6.7.0`, and produce reviewable evidence
before any source mutation.

```bash
bmad upstream-sync --from v6.6.0 --to v6.7.0 --dry-run \
  --output _bmad-output/upstream-sync/20260510/plan.json

bmad upstream-sync apply \
  --plan _bmad-output/upstream-sync/20260510/plan.json \
  --approved
```

Git refs and tags are upstream authority. The npm package version is recorded
only as sanity evidence.

## Plan Artifact

Dry run writes `plan.json` under `_bmad-output/upstream-sync/**`. It must not
mutate source files. The plan schema is `bmad-upstream-sync-plan.v1`.

The plan records:

- source and target git refs, commits, and tree hashes
- `git diff --name-status --find-renames` evidence
- added, removed, renamed, merged, and changed BMAD skills
- BMAD Help and module-help catalog changes
- installer, manifest, docs, template, and test changes
- dirty-tree, local-divergence, and manual-conflict risks
- optional live PostgreSQL state as `set` or `unset` only
- plan hash over canonical sorted JSON, excluding the hash field itself

## Apply Guard

`apply` requires `--approved`, a valid plan hash, unchanged source and target
git refs, and a clean source tree. Dirty files are allowed only when they are
upstream-sync evidence under `_bmad-output/upstream-sync/**`.

`apply` fails closed when:

- `--approved` is missing
- `plan.json` hash does not match
- source or target git refs changed since dry run
- source files are dirty outside `_bmad-output/upstream-sync/**`
- `_bmad/custom/**` has any planned or local changes
- patch check fails

## Authority Boundaries

- JSON remains canonical BMAD and Workspace authority.
- `pack-draft.toml` remains review-only.
- MCP, Graphify, Codex config, Workspace runtime, and PostgreSQL MCP remain
  advisory evidence only.
- Codex delegation is a copy-ready prompt or work packet only.
- No scheduler, daemon, hidden Codex loop, auto-push, or auto-promotion is part
  of this workflow.

## BMAD Route

Run `bmad-tool-leverage-review-prompt` before implementation planning for this
workflow. Implement repository changes through `bmad-self-improve` via
`bmad-loop`, then run `bmad-code-review`.

Implementation-readiness is not the first route for this updater. Run readiness
only if the updater scope becomes a new BMAD PRD/architecture/epics commitment
that moves from Phase 3 to Phase 4.
