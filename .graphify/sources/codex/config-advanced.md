---
source_marker: official-openai-doc
source_url: https://developers.openai.com/codex/config-advanced
retrieved_at: 2026-05-05
namespace: codex
---

# Advanced Configuration

Official OpenAI Codex documentation for advanced configuration. Source URL:
<https://developers.openai.com/codex/config-advanced>.

## Profiles

Profiles save named configuration values under `[profiles.<name>]` and are
selected with `codex --profile <name>`. Profiles can override model,
reasoning effort, approval policy, and model catalog values.

## One-Off CLI Overrides

Codex accepts dedicated flags such as `--model` and arbitrary TOML overrides
through `-c` or `--config`.

## Config And State Locations

Codex stores local state under `CODEX_HOME`, defaulting to `~/.codex`.
Common files include `config.toml`, auth state, history, logs, and caches.

## Project Config Files

Trusted projects can provide `.codex/config.toml` layers. Codex walks from
project root to current directory and closest config wins for duplicate keys.

## Hooks

Hooks are experimental lifecycle commands loaded from `hooks.json` or inline
`[hooks]` config when `features.codex_hooks` is enabled.

## Agent Roles

Subagent role configuration lives under `[agents]` in `config.toml`.

## Project Root Detection

Codex detects project roots through markers such as `.git`; the
`project_root_markers` key can customize this.

## Model Providers

Custom model providers define base URL, wire API, authentication, headers, and
retry/timeout behavior. Built-in provider IDs such as `openai` are reserved.

## Approval Policies And Sandbox Modes

`approval_policy` controls when Codex pauses for review. `sandbox_mode`
controls filesystem and network access. `approvals_reviewer` changes who
reviews prompts, not sandbox boundaries.

## Named Permission Profiles

`default_permissions` can point to built-in profiles such as `:workspace`
or custom `[permissions.<name>]` tables.

## Shell Environment Policy

`shell_environment_policy` limits which environment variables subprocesses
receive.

## MCP Servers

`mcp_servers.<id>` config defines command, URL, environment, allowed tools,
timeouts, OAuth settings, and enablement.

## Observability And Telemetry

`[otel]` can enable log, metrics, and trace export. `analytics.enabled`
controls anonymous product metrics.

## Notifications

`notify` runs an external program for supported events such as
`agent-turn-complete`.

## History, Citations, Project Instructions, And TUI

Codex config controls history persistence, clickable file citations, project
instruction discovery, and TUI notifications/theme/keymap settings.
