# OpenClaw/Hermes BMAD

This is the BMAD.

The point of this file is to make the setup feel like one coherent system
instead of "a bunch of random markdown files." The canonical definition lives in
`bmad.config.yaml`. The other files are materialized surfaces of that one BMAD.

## What It Is

This BMAD implements a chief-of-staff topology:

- Hermes is the brain.
- OpenClaw is the delegated worker layer.
- `_bmad-output/` is the local operational memory for the current workspace.
- Repo-tracked files define the contract.
- Machine-local config under `~/.hermes/` and `~/.openclaw/` supplies secrets,
  providers, gateway auth, skills, memory, and runtime settings.

## Method vs Runtime

Keep these roles distinct:

- BMAD is the portable method, workflow contract, and artifact shape.
- Hermes is the preferred planning and memory runtime for this setup.
- OpenClaw is the delegated execution runtime for channel-heavy or tool-heavy
  work.
- Workspace truth lives in repo-tracked files and `_bmad-output/`.
- Runtime-native memory and secrets stay in `~/.hermes/` and `~/.openclaw/`.

Do not replace BMAD with Hermes. Hermes and OpenClaw should use the BMAD.

The portability rule is what keeps this workable across Codex, Copilot, VS
Code, local runs, and VPS runs. The BMAD stays generic; Hermes and OpenClaw are
adapters around it.

## Canonical Files

Use these files in this order:

1. `bmad.config.yaml` — machine-readable source of truth for the BMAD
2. `BMAD.md` — human-readable entrypoint and operating guide
3. `.hermes.md` — Hermes-specific project context
4. `AGENTS.md` — repo guardrails and quality rules
5. `_bmad-output/openclaw-hermes/handoff.md` — current cross-agent contract
6. `_bmad-output/sprint-status.yaml` — current phase and next action

## Why It Materializes As Files

The BMAD is file-based on purpose:

- Plain files are portable across Hermes, OpenClaw, Copilot, Codex, and other
  agent surfaces.
- Diffable files are easier to audit and recover than opaque runtime state.
- Local `_bmad-output/` state can churn without polluting git history.
- A manifest-first wrapper still gives us one place to look.

So the model is:

- `bmad.config.yaml` defines the BMAD.
- Supporting Markdown and YAML files implement it.
- Automations, prompts, and installers are wrappers around that contract.

## Runtime Skill Wiring

The BMAD skill catalog is wired into the runtime explicitly:

- Hermes gets the full BMAD skill catalog installed verbatim into
  `~/.hermes/skills`.
- OpenClaw gets only the curated worker subset installed into
  `~/.openclaw/skills`.
- OpenClaw copies are adapted with a handoff-first preamble so workers stay
  bounded to Hermes delegation instead of taking over planning.

The reusable runtime bundle manifest lives at
`tools/runtime/openclaw-hermes-runtime.yaml`.

Use these reusable commands:

1. `npm run runtime:plan`
2. `npm run runtime:export`
3. `npm run runtime:install`

For the human operator flow, read:

- `docs/how-to/use-openclaw-hermes-bmad.md`

## Runtime Topology

### Hermes

Hermes is the chief of staff:

- keeps long-lived context and memory
- owns the user-facing conversation
- starts new work with discovery rigor unless the path is already clearly
  bounded
- chooses the next BMAD phase
- builds and sends bounded briefs to OpenClaw workers

### OpenClaw

OpenClaw is the worker layer:

- exposes typed tools and channel integrations through the Gateway
- runs delegated subagents with explicit scope
- returns evidence, artifacts, and risks back to Hermes

## OpenClaw Security

Treat OpenClaw as a powerful worker runtime, not as a casual chat bot.

- One Gateway equals one trusted operator boundary. Do not use one Gateway for
  mutually untrusted people or mixed personal and company trust zones.
- Prefer a dedicated VPS, VM, container, or OS user for OpenClaw so the blast
  radius stays bounded if a worker goes wrong.
- Keep the Gateway local-first: bind it to `127.0.0.1`, protect it with token
  auth, and use Tailscale, VPN, or an SSH tunnel for remote access instead of
  exposing it broadly on the public internet.
- Use pairing or strict allowlists on human-facing channels. Group chats should
  stay opt-in and mention-gated, not broadly open by default.
- Keep `OPENCLAW_GATEWAY_TOKEN`, provider API keys, bot tokens, and pairing
  stores in machine-local config only. Never commit them to tracked BMAD files.
- Audit new skills, plugins, and remote nodes before enabling them. A skill or
  channel integration is part of the security surface, not just a convenience.
- Run `openclaw security audit` after meaningful config changes and before
  expanding channel or tool access.

### VPS Hardening Baseline

For always-on deployments, use this host baseline unless you have a better one:

- SSH keys only
- firewall default-deny for inbound traffic
- Fail2Ban or equivalent intrusion prevention
- automatic security updates
- Docker or comparable isolation where practical
- private-network access through Tailscale or VPN when possible
- Telegram or similar channels kept one-to-one by default, not added to broad
  shared groups

### Handoff Contract

All Hermes to OpenClaw delegation must be visible in:

- `_bmad-output/openclaw-hermes/handoff.md`

That handoff is the durable cross-agent contract for:

- objective
- inputs
- requested output
- constraints
- validation
- risks
- next action

## Config Surfaces

### Repo-tracked

- `bmad.config.yaml`
- `BMAD.md`
- `.hermes.md`
- `.github/copilot-instructions.md`
- `.github/prompts/bmad-openclaw-hermes-loop.prompt.md`
- `bmad-output.instructions.md`

### Machine-local

Hermes:

- `~/.hermes/config.yaml`
- `~/.hermes/.env`
- `~/.hermes/memories/`
- `~/.hermes/skills/`
- `~/.hermes/cron/`

OpenClaw:

- `~/.openclaw/openclaw.json`
- `OPENCLAW_GATEWAY_TOKEN`
- provider credentials
- channel/plugin state
- `~/.openclaw/skills/`

### Workspace-local state

- `_bmad-output/discovery-context-*.md`
- `_bmad-output/project-context.md`
- `_bmad-output/PRD.md`
- `_bmad-output/architecture.md`
- `_bmad-output/sprint-status.yaml`
- `_bmad-output/openclaw-hermes/handoff.md`

## Deployment Modes

### Local

Use when experimenting or iterating on the BMAD:

- Hermes and OpenClaw run on the same machine
- local config stays under `~/.hermes` and `~/.openclaw`
- `_bmad-output/` keeps workspace memory local

### VPS

Use when you want the system always on:

- Hermes remains the brain
- OpenClaw stays behind a single Gateway per host
- Docker or a managed VPS flow is preferred for isolation and uptime

## Current Intent

The current workspace goal is not product delivery yet. It is to define and
stabilize the OpenClaw/Hermes BMAD itself so the loop can be reused cleanly on a
local machine or VPS.

## Rule Of Thumb

If a future agent asks "where should I start?" the answer is:

1. read `bmad.config.yaml`
2. read `BMAD.md`
3. read `.hermes.md` and `AGENTS.md`
4. read `_bmad-output/sprint-status.yaml`
5. read `_bmad-output/openclaw-hermes/handoff.md`
