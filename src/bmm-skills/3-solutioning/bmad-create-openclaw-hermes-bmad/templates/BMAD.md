# {{project_name}} OpenClaw/Hermes BMAD

This is the BMAD.

The canonical definition lives in `bmad.config.yaml`. The other files are
materialized surfaces of that one BMAD.

## What It Is

This BMAD implements a chief-of-staff topology:

- Hermes is the brain.
- OpenClaw is the delegated worker layer.
- `{{output_folder}}/` is the local operational memory for the current
  workspace.
- Repo-tracked files define the contract.
- Machine-local config under `~/.hermes/` and `~/.openclaw/` supplies secrets,
  providers, gateway auth, skills, memory, and runtime settings.

## Canonical Files

Use these files in this order:

1. `bmad.config.yaml`
2. `BMAD.md`
3. `.hermes.md`
4. `AGENTS.md`
5. `{{output_folder}}/openclaw-hermes/handoff.md`
6. `{{output_folder}}/sprint-status.yaml`

## Runtime Skill Wiring

- Hermes gets the full BMAD skill catalog installed verbatim into
  `~/.hermes/skills`.
- OpenClaw gets only the curated worker subset installed into
  `~/.openclaw/skills`.
- OpenClaw copies are adapted with a handoff-first preamble so workers stay
  bounded to Hermes delegation instead of taking over planning.

## Runtime Topology

### Hermes

Hermes is the chief of staff:

- keeps long-lived context and memory
- owns the user-facing conversation
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
- Keep gateway tokens, provider API keys, bot tokens, and pairing stores in
  machine-local config only. Never commit them to tracked BMAD files.
- Audit new skills, plugins, and remote nodes before enabling them. A skill or
  channel integration is part of the security surface, not just a convenience.
- Run `openclaw security audit` after meaningful config changes and before
  expanding channel or tool access.

### VPS Hardening Baseline

- SSH keys only
- firewall default-deny for inbound traffic
- Fail2Ban or equivalent intrusion prevention
- automatic security updates
- Docker or comparable isolation where practical
- private-network access through Tailscale or VPN when possible
- one-to-one messaging by default for sensitive bots

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
- channel and plugin state
- `~/.openclaw/skills/`

### Workspace-local state

- `{{output_folder}}/project-context.md`
- `{{output_folder}}/PRD.md`
- `{{output_folder}}/architecture.md`
- `{{output_folder}}/sprint-status.yaml`
- `{{output_folder}}/openclaw-hermes/handoff.md`

## Rule Of Thumb

If a future agent asks "where should I start?" the answer is:

1. read `bmad.config.yaml`
2. read `BMAD.md`
3. read `.hermes.md` and `AGENTS.md`
4. read `{{output_folder}}/sprint-status.yaml`
5. read `{{output_folder}}/openclaw-hermes/handoff.md`
