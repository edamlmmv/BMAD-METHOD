---
source_marker: official-openai-doc
source_url: https://developers.openai.com/codex/config-reference
retrieved_at: 2026-05-05
namespace: codex
---

# Configuration Reference

Official OpenAI Codex configuration key reference. Source URL:
<https://developers.openai.com/codex/config-reference>.

## Config TOML

User config lives in `~/.codex/config.toml`. Trusted projects can add
`.codex/config.toml` layers. Security-sensitive keys include
`approval_policy`, `sandbox_mode`, and `sandbox_workspace_write.*`.

## Core Keys

Important keys include `model`, `review_model`, `model_provider`,
`openai_base_url`, `model_context_window`, `model_catalog_json`,
`approval_policy`, `approvals_reviewer`, `auto_review.policy`,
`allow_login_shell`, `sandbox_mode`, `notify`,
`feedback.enabled`, `analytics.enabled`, `model_instructions_file`,
`service_tier`, `features.*`, `hooks`, `mcp_servers.*`,
`agents.*`, `memories.*`, `model_providers.*`, `profiles.*`,
`history.*`, `file_opener`, `otel.*`, `tui.*`,
`web_search`, `default_permissions`, `permissions.*`, and
`projects.<path>.trust_level`.

## Requirements TOML

`requirements.toml` constrains settings users cannot override. It can limit
approval policies, sandbox modes, web search modes, hooks, filesystem denials,
MCP server identities, and command rules.
