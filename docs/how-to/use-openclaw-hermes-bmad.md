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
- A Codex skill and a workspace prompt for the Hermes-first loop

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

## Autonomous Operating Doctrine

This BMAD is meant to be autonomous across Codex, Hermes, and OpenClaw without
depending on hidden chat memory.

The doctrine is:

1. read the BMAD contract first
2. classify the task before committing to a phase
3. decide whether the work should stay local or be delegated
4. keep shared truth in repo files and `_bmad-output/`
5. reconcile evidence before changing phase
6. ask the human only when intent is missing or a tradeoff is non-obvious

That means Codex can absolutely drive discovery, planning, routing, execution,
and reconciliation. Hermes/OpenClaw is not a replacement for BMAD. It is the
runtime layer the BMAD can choose when that runtime actually helps.

## When To Use What

Use this decision table:

| Situation | Best entrypoint | Why |
| --- | --- | --- |
| Repo-local, bounded, single-session work | Direct BMAD skill in Codex | Lowest overhead; no runtime complexity needed |
| Complex or unclear work where you want the system to classify and route | `bmad-openclaw-hermes-loop` in Codex or `/bmad-openclaw-hermes-loop` in Copilot | Lets the loop read state, run discovery rigor, and pick the next phase |
| You want discovery as an explicit standalone first step | `bmad-discovery-rigor` | Forces classification before anything else |
| Long-lived goals, recurring jobs, background progress, channel-heavy work, or strong memory needs | Hermes/OpenClaw loop | This is where persistent memory and delegated workers materially help |
| Already inside a clear implementation or review slice | Direct phase skill like `bmad-quick-dev` or `bmad-code-review` | Faster than spinning up orchestration you do not need |

Short rule:

- do **not** use Hermes/OpenClaw for every tiny task
- do use Hermes/OpenClaw when continuity, delegation, memory, or background execution actually matter
- if you are unsure, use the loop and let discovery rigor route the work

## Browser QA Surface

If your goal is personal QA, DOM-style automation, screenshots, and turning a
successful run into a Playwright seed, the relevant OpenClaw surface is the
managed browser tool, not Canvas.

- Use `openclaw browser` for isolated browser control, tabs, navigation,
  snapshots, screenshots, clicks, typing, and other browser actions.
- Canvas is a macOS visual panel for lightweight HTML/UI surfaces. It can
  navigate and evaluate JavaScript, but it is not the primary test-like browser
  automation surface.
- Peekaboo Bridge and Remote Control are the macOS-native options when you need
  automation outside the browser itself.

For personal QA work, default to the isolated `openclaw` browser profile rather
than your everyday signed-in browser session.

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
- `npm run runtime:bootstrap`
- `npm run runtime:plan`
- `npm run runtime:export`
- `npm run runtime:install`
- `npm run runtime:doctor`
- `npm run runtime:live-smoke`
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

For the condensed operator matrix, read
`docs/reference/openclaw-hermes-runtime-compatibility.md`.

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
- **Runtime configured:** `~/.hermes/config.yaml`, `~/.hermes/.env`, `~/.openclaw/openclaw.json`, and `~/.openclaw/.env` exist and are correct
- **Runtime ready:** the machine-local config parses and the required provider secrets and gateway token are actually filled
- **Runtime live:** Hermes/OpenClaw binaries are installed and active, with the expected channels and Gateway actually running

This repo can prove the first state directly. It cannot prove the second,
third, or fourth state unless the machine-local runtime has been provisioned.

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
- `~/.openclaw/.env` exists
- the Hermes binary is installed
- the OpenClaw binary is installed
- the expected messaging channel or Gateway is reachable

For combined repo-plus-runtime health, run:

```bash
npm run runtime:doctor
```

That command is the operator-facing bridge between:

- repo-valid
- runtime-configured
- runtime-ready
- runtime-live

For a non-destructive live probe of binary and gateway reachability, run:

```bash
npm run runtime:live-smoke
```

Treat `runtime-ready` as the trust gate for real autonomous work. You can still
run `npm run runtime:live-smoke` before readiness is green to verify that the
CLI surfaces are reachable, but a passing live smoke does not mean the selected
provider path is configured correctly yet.

Use `npm run runtime:live-smoke -- --deep` when you want to probe more of the
CLI surfaces such as gateway, health, and channel status without doing real
product work.

## Local-First Provisioning Slice

When the repo-side BMAD is already validating, the next setup slice is
machine-local, not repo-local.

Complete the machine-local slice in this order:

1. Install the Hermes and OpenClaw binaries and confirm both are on your
   `PATH`.

Recommended official install surfaces:

```bash
# Hermes
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# OpenClaw
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

After install, verify:

```bash
hermes --help
openclaw --version
```

If the install succeeded but the command is still missing, check your shell
startup files and `PATH` before changing the BMAD itself.
2. Preview the starter scaffolding plan:

```bash
npm run runtime:bootstrap
```

3. Create the missing starter files outside the repository:

```bash
npm run runtime:bootstrap -- --apply
```

That bootstrap creates:

- `~/.hermes/config.yaml`
- `~/.hermes/.env`
- `~/.openclaw/openclaw.json`
- `~/.openclaw/.env`

It also generates a starter `OPENCLAW_GATEWAY_TOKEN` value in both
`~/.hermes/.env` and `~/.openclaw/.env` so the gateway does not begin life with
an empty token.

Use `--force` only if you intentionally want to overwrite an existing starter
file with the repo template baseline.

4. Fill in the generated placeholders and secrets before expecting live runtime
   checks to pass:

- choose one supported provider path you actually have access to
- set the matching provider credentials in `~/.hermes/.env`
- set the matching provider credentials in `~/.openclaw/.env`
- refine `~/.hermes/config.yaml` and `~/.openclaw/openclaw.json` for that real
  provider choice plus your channel and gateway choices

5. Re-run `npm run runtime:install` so the home-directory skill installs match
   the current repo bundle.
6. Re-run `npm run runtime:doctor` and expect `runtime-configured` to pass
   before using the live smoke result as anything more than a reachability
   signal.
7. Once `runtime:doctor` reaches `runtime-ready`, run:

```bash
npm run runtime:live-smoke
```

Use `bmad.config.yaml` plus this guide as the contract for what belongs in each
file:

- Hermes config should define the runtime defaults, provider choice, context
  files, memory paths, and preferred terminal backends.
- Hermes `.env` should hold provider credentials and any other secrets required
  by the chosen runtime. It is also a good local place to stage the
  `OPENCLAW_GATEWAY_TOKEN` value if your service runner exports from there.
- OpenClaw `.env` should hold the provider credentials and gateway token the
  OpenClaw CLI will actually read.
- OpenClaw config should define the Gateway, provider defaults, enabled tools,
  and channel policy.

OpenRouter is only one valid option. If you do not have an OpenRouter account,
choose another supported provider path and align the model reference and env key
to that provider instead of forcing an OpenRouter setup.

Keep these boundaries explicit:

- never commit provider keys, bot tokens, or `OPENCLAW_GATEWAY_TOKEN`
- keep tracked repo files as contract and guidance only
- treat `_bmad-output/` as workspace-local state, not a secrets store

The current expected failure shape is:

- `repo-valid`: pass
- `runtime-configured`: fail until the four machine-local config files exist
- `runtime-ready`: fail until provider credentials and
  `OPENCLAW_GATEWAY_TOKEN` are filled
- `runtime-live`: may still pass its required probes before `runtime-ready`
  because it is validating binary and gateway reachability rather than provider
  readiness

After the binaries are installed and those files exist, the next validation
pass should confirm:

- Hermes starts with the expected project context
- OpenClaw Gateway binds locally with token auth
- the configured provider path works
- any profile-level custom agents still match the Hermes-brain /
  OpenClaw-worker split

## Fresh Sessions And Scheduled Runs

Treat scheduled or background runs as fresh sessions unless proven otherwise.

That means:

- automation prompts must be self-contained
- they must read the BMAD contract and current `_bmad-output/` state explicitly
- they should not assume current chat memory is still present
- they should reconcile results back into shared artifacts before exiting

This is especially important when Hermes or OpenClaw is being used for cron,
gateway-delivered, or background execution.

## Git-Managed Updates

Use the git-aware BMAD updater when you want one command to:

- inspect branch and upstream status
- inspect an explicit target like `upstream/main`
- refuse to pull over local uncommitted work
- fast-forward the checkout safely
- refresh generated BMAD surfaces when relevant source files changed
- refresh Hermes/OpenClaw runtime bundles when relevant runtime files changed
- write a BMAD update brief when the target is not a simple fast-forward

Plan only:

```bash
npm run bmad:update -- --fetch
```

Plan against the official repo explicitly:

```bash
npm run bmad:update -- --target upstream/main
```

Apply when clean:

```bash
npm run bmad:update -- --apply
```

Attempt a fast-forward against an explicit target:

```bash
npm run bmad:update -- --target upstream/main --apply
```

Behavior notes:

- default mode is a non-destructive plan
- apply mode uses `git merge --ff-only <target-ref>`
- if the worktree is dirty, apply mode aborts instead of trying to auto-stash or overwrite
- generated BMAD/runtime surfaces are only refreshed when the incoming git diff touches the paths that drive them
- if the target is already contained in your branch, apply mode becomes a no-op
- if the target is not fast-forward compatible, the command stops and writes a BMAD update brief instead of attempting a risky merge
- the BMAD update brief is written into your BMAD output folder so discovery rigor can use it as the next artifact

## Skill Surfaces

### In Codex

After Codex installation, BMAD skills live in:

- `.agents/skills/`

Good starting skills:

- `bmad-help`
- `bmad-openclaw-hermes-loop`
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

This is a **Copilot / VS Code prompt surface**.

### Codex And Copilot Equivalence

The two surface-level entrypoints are:

- Codex: `bmad-openclaw-hermes-loop`
- Copilot: `/bmad-openclaw-hermes-loop`

They are meant to represent the same loop on different surfaces.

`bmad-discovery-rigor` remains the lower-level direct skill for when you want
to force discovery as an explicit first step instead of entering the whole loop.

## Daily Use

### Fastest Path

If you are in Codex:

1. Run `bmad-openclaw-hermes-loop` when you want the system to read the BMAD, classify the work, and route autonomously
2. Run `bmad-discovery-rigor` when you want explicit discovery as a separate first step
3. Run `bmad-help` if you want guidance on the next skill
4. Use a direct phase skill once the work is clearly bounded
5. Keep the BMAD state current in `_bmad-output/`

If you are in Copilot:

1. Run `/bmad-openclaw-hermes-loop`
2. Tell Hermes to start with discovery rigor
3. Let Hermes read the repo BMAD contract
4. Only hand off bounded work to OpenClaw

The loop should do this autonomously:

1. read the manifest and current artifacts
2. start with discovery rigor unless the task is already clearly bounded
3. decide whether to stay in the current surface or delegate to OpenClaw
4. reconcile the result back into `_bmad-output/`
5. report the next phase and next action

## Examples

### Example: Codex New Feature

Use:

```text
bmad-openclaw-hermes-loop Add a reusable story-splitting workflow for large PRDs in this repo and keep routing until the next clear BMAD phase is ready.
```

Or, if you want discovery to be explicit instead of wrapped by the loop:

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
bmad-openclaw-hermes-loop Something about the runtime bundle install feels brittle. Classify the risk, choose the next phase, and only delegate if needed.
```

Or:

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

### Example: Autonomous Codex Handoff

Use:

```text
bmad-openclaw-hermes-loop Run discovery, choose the phase, negotiate any needed Hermes/OpenClaw delegation, and keep going until you reach the best bounded result for this repo. Report back with outcome, evidence, and next action.
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
5. Run `bmad-help`, `bmad-openclaw-hermes-loop`, or `/bmad-openclaw-hermes-loop`
