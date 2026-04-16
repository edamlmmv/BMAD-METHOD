---
title: OpenClaw/Hermes Runtime Compatibility
description: Track what is repo-managed, machine-local, and upstream-managed in the OpenClaw/Hermes BMAD runtime.
sidebar:
  order: 12
---

This reference exists to keep maintenance boring.

The OpenClaw/Hermes BMAD has multiple update lanes:

- the **repo contract**
- the **generated runtime bundle**
- the **machine-local starter config**
- the **actual Hermes and OpenClaw binaries**

Treating those as separate lanes is how you avoid breaking a working setup
while still taking upstream improvements.

## Compatibility Matrix

| Layer | Owner | Install / Update Path | Verification | Current expectation |
| --- | --- | --- | --- | --- |
| BMAD contract (`bmad.config.yaml`, `BMAD.md`, `.hermes.md`) | repo | git + normal BMAD review flow | `npm run runtime:smoke` | should stay versioned in git |
| Hermes skill bundle (`~/.hermes/skills`) | repo-generated | `npm run runtime:install` | `npm run runtime:doctor` | should match the repo catalog exactly |
| OpenClaw worker bundle (`~/.openclaw/skills`) | repo-generated | `npm run runtime:install` | `npm run runtime:doctor` | should match the curated worker subset |
| Hermes starter config (`~/.hermes/config.yaml`, `~/.hermes/.env`) | machine-local | `npm run runtime:bootstrap -- --apply` + local edits | `npm run runtime:doctor` | files should exist and secrets should be filled |
| OpenClaw starter config (`~/.openclaw/openclaw.json`, `~/.openclaw/.env`) | machine-local | `npm run runtime:bootstrap -- --apply` + local edits | `npm run runtime:doctor` | files should exist and token/model settings should be valid |
| Hermes CLI binary | upstream | official installer or upstream package flow | `hermes --help`, `npm run runtime:live-smoke` | should be on `PATH` |
| OpenClaw CLI binary | upstream | official installer or upstream package flow | `openclaw --version`, `npm run runtime:live-smoke` | should be on `PATH` |

## The Safe Update Order

When more than one layer changes, update in this order:

1. update the repo branch and review the BMAD contract changes
2. run `npm run runtime:smoke`
3. if the runtime bundle changed, run `npm run runtime:install`
4. if starter config expectations changed, run `npm run runtime:bootstrap`
5. if upstream CLIs changed, upgrade Hermes and OpenClaw themselves
6. run `npm run runtime:doctor`
7. when the doctor reaches `runtime-ready`, run `npm run runtime:live-smoke`

## Official Install Surfaces

Current preferred install surfaces encoded in this BMAD:

### Hermes

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### OpenClaw

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

Alternative OpenClaw global npm install when you manage Node yourself:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

## Drift Rules

Put your real customizations in these places:

- repo-tracked BMAD files
- `tools/runtime/`
- `src/core-skills/`
- `src/bmm-skills/`
- machine-local config in `~/.hermes/` and `~/.openclaw/`

Do **not** put your only copy of a customization in:

- `.agents/skills/`
- `build/runtime/openclaw-hermes/`
- `~/.hermes/skills/`
- `~/.openclaw/skills/`

Those are generated or regenerated surfaces.

## What The Health Commands Mean

Use the runtime commands like this:

- `npm run runtime:bootstrap`
  Shows what machine-local files and directories are missing.
- `npm run runtime:install`
  Regenerates and installs the BMAD skill bundles into Hermes and OpenClaw.
- `npm run runtime:doctor`
  Checks repo-valid, runtime-configured, runtime-ready, and runtime-live.
- `npm run runtime:live-smoke`
  Runs non-destructive Hermes/OpenClaw CLI probes after the doctor gates are ready.

## Provider Choice

Do not treat OpenRouter as mandatory.

- The starter env files expose multiple provider slots so you can choose the
  provider path you actually have.
- Pick one supported provider path and keep the selected model plus matching
  credential aligned across the runtime config files.
- Leave unused provider keys blank instead of trying to fill every slot.

## If Upstream Breaks You

If a new Hermes or OpenClaw release changes behavior:

1. do not rewrite the BMAD first
2. capture the failing doctor or live-smoke output
3. compare the upstream install/config guidance to your current machine-local config
4. update the runtime templates only if the new convention is worth standardizing
5. keep repo truth and machine-local truth separate while you migrate
