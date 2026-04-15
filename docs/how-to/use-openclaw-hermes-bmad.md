---
title: Use OpenClaw/Hermes BMAD
description: Operate the manifest-first Hermes/OpenClaw BMAD from Codex, Hermes, and OpenClaw.
sidebar:
  order: 11
---

This guide is the human quickstart for the OpenClaw/Hermes BMAD in this repository.

If you only remember one thing, remember this:

- **Hermes** is the brain.
- **OpenClaw** is the delegated worker.
- **`bmad.config.yaml`** is the source of truth.
- **`_bmad-output/`** is the local state and handoff surface.

## What This Setup Gives You

- A manifest-first BMAD contract in the repo
- A full BMAD skill catalog installed into `~/.hermes/skills`
- A curated worker-safe BMAD subset installed into `~/.openclaw/skills`
- A reusable runtime bundle installer for keeping Hermes/OpenClaw in sync
- A workspace prompt for the Hermes-first loop

## First Read

When you come back to this later, read these files in order:

1. `bmad.config.yaml`
2. `BMAD.md`
3. `.hermes.md`
4. `AGENTS.md`
5. `_bmad-output/sprint-status.yaml`
6. `_bmad-output/openclaw-hermes/handoff.md`

## Mental Model

Use the system like this:

1. Start in **Hermes** or a Hermetic planning surface like Codex/Copilot.
2. Let Hermes read the BMAD contract and current local state.
3. Keep planning, synthesis, and phase selection in Hermes.
4. Delegate only bounded execution, research, review, or validation slices to OpenClaw.
5. Reconcile results back into `_bmad-output/` before changing phase.

If OpenClaw needs to do work, it should work from the handoff file rather than from vague chat memory.

## Recommended Operating Model

If you are deciding between BMAD, Hermes, and OpenClaw, use this rule:

- **BMAD** is the generic method and artifact contract.
- **Hermes** is the planner and memory runtime.
- **OpenClaw** is the worker runtime.

So:

- do **not** stop using BMAD and "just use Hermes"
- do **not** make OpenClaw the place that owns the whole method
- do let Hermes and OpenClaw **use** the BMAD

This keeps the workflow portable across Codex, Copilot, VS Code, local runs, and VPS runs.

## Discovery-First Default

Your stated default workflow is a good one:

- start new work with `bmad-discovery-rigor`
- let Hermes decide the next BMAD phase after discovery
- use OpenClaw only after the work is bounded enough for a worker handoff

Treat discovery rigor as the default front door, not as an optional extra.

That means:

- for a new feature, start with discovery rigor
- for an unclear bug, start with discovery rigor
- for a major refactor, start with discovery rigor
- for a tiny follow-up inside an already-bounded task, skip straight to execution

## Command Surfaces

There are two kinds of commands here: **repo commands** and **skill commands**.

### Repo Commands

These come from `package.json` and the BMad CLI:

- `bmad install`
- `bmad status`
- `bmad update`
- `bmad uninstall`
- `bmad-method install`
- `bmad-method uninstall`
- `npm run bmad -- install`
- `npm run bmad -- uninstall`
- `npm run bmad:status`
- `npm run bmad:update`
- `npm run bmad-method -- install`
- `npm run bmad-method -- uninstall`
- `npm run runtime:plan`
- `npm run runtime:export`
- `npm run runtime:install`
- `npm run runtime:smoke`
- `npm run validate:skills`
- `npm run quality`

### What `bmad` Is

Yes, there is a `bmad` command.

The package exposes both:

- `bmad`
- `bmad-method`

They point to the same installer entrypoint and are the standard way to install BMAD skills into supported tools.

The repo also exposes matching `package.json` script wrappers:

- `npm run bmad -- <args>`
- `npm run bmad-method -- <args>`

Use the direct CLI form when the binary is on your path. Use the `npm run` form when you want the repo-local entrypoint explicitly.

## What To Customize vs What To Regenerate

Treat these as **source**:

- `bmad.config.yaml`
- `BMAD.md`
- `.hermes.md`
- `.github/prompts/bmad-openclaw-hermes-loop.prompt.md`
- `tools/runtime/openclaw-hermes-runtime.yaml`
- `tools/runtime/templates/openclaw-worker-preamble.md`
- `src/core-skills/`
- `src/bmm-skills/`

Treat these as **generated** and safe to overwrite:

- `.agents/skills/`
- `build/runtime/openclaw-hermes/`
- `~/.hermes/skills/`
- `~/.openclaw/skills/`

Do not put your only copy of a customization in a generated directory.

## Maintenance Model

Think in four separate update lanes:

### 1. BMAD Method Updates

When the BMAD repo changes:

1. update your repo branch
2. review diffs in the source surfaces
3. run `npm run bmad:status`
4. run `npm run bmad:update -- --fetch`
5. run `npm run runtime:smoke`
6. if you want the command to apply the update for you, run `npm run bmad:update -- --apply`

### 2. Hermes Runtime Updates

When Hermes changes:

1. upgrade Hermes itself outside the repo
2. keep `~/.hermes/config.yaml`, `.env`, and memories backed up
3. re-run `npm run runtime:install`
4. confirm Hermes still sees the full BMAD catalog in `~/.hermes/skills`

### 3. OpenClaw Runtime Updates

When OpenClaw changes:

1. upgrade OpenClaw itself outside the repo
2. back up `~/.openclaw/openclaw.json` and secrets
3. re-run `npm run runtime:install`
4. re-check Gateway, channels, and security posture

### 4. Your Local Customizations

Put customizations in source surfaces, not generated ones:

- keep BMAD contract changes in repo-tracked files
- keep skill changes in `src/core-skills/` or `src/bmm-skills/`
- keep runtime profile changes in `tools/runtime/`
- keep runtime secrets and provider config in `~/.hermes/` and `~/.openclaw/`

If you edit `.agents/skills/`, `~/.hermes/skills/`, or `~/.openclaw/skills/`
directly, expect those edits to be overwritten by the next install.

## How To Know What Is Running

Use this distinction:

- **Repo-side BMAD installed:** the BMAD repo, generated skills, and runtime bundles exist and validate
- **Runtime configured:** `~/.hermes/config.yaml`, `~/.hermes/.env`, and `~/.openclaw/openclaw.json` exist and are correct
- **Runtime live:** Hermes/OpenClaw binaries are installed and active, with the expected channels and Gateway actually running

This repo can prove the first state directly. It cannot prove the second or third state unless the machine-local runtime has been provisioned.

## Smoke Test

For repo-side health, run:

```bash
npm run bmad:status
npm run runtime:smoke
```

That checks:

- the BMAD install is present
- the runtime bundle plan resolves
- the runtime bundle export succeeds
- the skill catalog still validates

For live runtime health, also confirm:

- `~/.hermes/config.yaml` exists
- `~/.hermes/.env` exists
- `~/.openclaw/openclaw.json` exists
- the Hermes binary is installed
- the OpenClaw binary is installed
- the expected messaging channel or Gateway is reachable

## Git-Managed Updates

Use the git-aware BMAD updater when you want one command to:

- inspect branch and upstream status
- refuse to pull over local uncommitted work
- fast-forward the checkout safely
- refresh generated BMAD surfaces when relevant source files changed
- refresh Hermes/OpenClaw runtime bundles when relevant runtime files changed

Plan only:

```bash
npm run bmad:update -- --fetch
```

Apply when clean:

```bash
npm run bmad:update -- --apply
```

Behavior notes:

- default mode is a non-destructive plan
- apply mode uses `git pull --ff-only`
- if the worktree is dirty, apply mode aborts instead of trying to auto-stash or overwrite
- generated BMAD/runtime surfaces are only refreshed when the incoming git diff touches the paths that drive them

## Skill Surfaces

### In Codex

After Codex installation, BMAD skills live in:

- `.agents/skills/`

Good starting skills:

- `bmad-help`
- `bmad-discovery-rigor`
- `bmad-create-openclaw-hermes-bmad`
- `bmad-quick-dev`
- `bmad-code-review`

### In Hermes

Hermes gets the **full** BMAD catalog in:

- `~/.hermes/skills`

This is the planner-facing surface. Hermes should be able to use the full method, not a reduced worker menu.

### In OpenClaw

OpenClaw gets the **worker subset** in:

- `~/.openclaw/skills`

These copies are adapted so they begin with a handoff-first worker contract. OpenClaw should execute, research, review, and validate. It should not silently become the PM or architect.

### In Copilot

The workspace prompt is:

- `/bmad-openclaw-hermes-loop`

Use that when you want the Hermes-first loop behavior from the workspace prompt surface.

## Daily Use

### Fastest Path

If you are in Codex:

1. Run `bmad-discovery-rigor` for new work
2. Or run `bmad-help` if you want guidance on the next skill
3. Then run the specific BMAD skill you need
4. Keep the BMAD state current in `_bmad-output/`

If you are in Copilot:

1. Run `/bmad-openclaw-hermes-loop`
2. Tell Hermes to start with discovery rigor
3. Let Hermes read the repo BMAD contract
4. Only hand off bounded work to OpenClaw

## Examples

### Example: Codex New Feature

Use:

```text
bmad-discovery-rigor Add a reusable story-splitting workflow for large PRDs in this repo.
```

Then move to:

```text
bmad-create-prd
```

or:

```text
bmad-quick-dev
```

depending on whether the work is still definition-heavy or implementation-ready.

### Example: Codex Bug or Change Request

Use:

```text
bmad-discovery-rigor Something about the runtime bundle install feels brittle. Classify the risk and propose the next step.
```

Then move to:

```text
bmad-quick-dev
```

or:

```text
bmad-code-review
```

depending on whether you need implementation or validation next.

### Example: Copilot / Hermes

Use:

```text
/bmad-openclaw-hermes-loop
Read bmad.config.yaml and BMAD.md first. Start with discovery rigor for this request, then propose the next BMAD phase. Only use OpenClaw if a bounded worker slice is needed.
```

### Example: Hermes to OpenClaw Handoff

Keep Hermes as the planner, then hand off something bounded like:

```text
Objective: update the runtime installer docs
Inputs: BMAD.md, bmad.config.yaml, docs/how-to/use-openclaw-hermes-bmad.md
Output: doc edits plus validation notes
Constraints: do not change provider config or secrets handling
Validation: docs remain consistent with the manifest
```

That handoff belongs in `_bmad-output/openclaw-hermes/handoff.md`.

### Example: Memory Layering

Use memory in layers:

- `_bmad-output/` for workspace state and current phase
- `~/.hermes/memories/` for Hermes long-lived memory
- `~/.openclaw/` for OpenClaw runtime/session state

This avoids making VS Code, Codex, or Copilot depend on one runtime's private memory format.

### When to Reinstall Runtime Bundles

Run:

```bash
npm run runtime:install
```

when:

- the runtime skill map changes
- a BMAD skill used by Hermes/OpenClaw changes
- you want to refresh `~/.hermes/skills` or `~/.openclaw/skills`

### When to Reinstall Codex Skills

Run the BMAD installer for Codex when:

- `.agents/skills` is missing
- BMAD skills are stale or absent in Codex
- you update installed modules and want Codex regenerated

## What Is Still Manual

The following are **not** fully captured by repo files and still need real machine-level setup:

- `~/.hermes/config.yaml`
- `~/.hermes/.env`
- `~/.openclaw/openclaw.json`
- provider API keys
- gateway token
- Telegram/Slack/Discord channel setup
- Tailscale/VPN/firewall/Fail2Ban/host hardening

## If You Forget Everything

Use this recovery path:

1. Read `bmad.config.yaml`
2. Read `BMAD.md`
3. Read this guide
4. Read `_bmad-output/sprint-status.yaml`
5. Run `bmad-help` or `/bmad-openclaw-hermes-loop`
