---
title: 'BMAD Workspace Operator Readiness'
description: Non-authoritative operator runbook for closing readiness gaps
---

# BMAD Workspace Operator Readiness

This non-authoritative runbook closes the readiness UX gap for a BMAD Operator.
Authority remains the existing Workspace contract docs and release rules only.
Committed fixtures/manifests are evidence inputs, not authority.

## Operator Goal

Use this when onboarding to the repo or reviewing release readiness. The job is
to verify Workspace readiness without changing TOML, public CLI/API/schema,
verifier behavior, or Graphify behavior.

## First 10 Minutes

1. Confirm the checkout and current commit.
2. Read the current Workspace contract docs: Product Requirements,
   Architecture, Command Contract, Capability Contract, Guardrails, Operator
   Quickstart, Operator Guide, and Release Checklist.
3. Inspect capability examples before claiming capability readiness.
4. Confirm checked-in Graphify graph evidence is present and validated.
5. Confirm TOML/customize guidance does not imply verifier, grant, runtime, or
   hidden-execution authority.
6. Stop before public CLI/API/schema, TOML, verifier, or Graphify behavior
   changes unless a separate implementation plan and red test exist.

## Readiness Checklist

- `AC-OPR-01`: PASS when this one-page runbook exists and is clearly
  non-authoritative.
- `AC-OPR-02`: PASS when Workspace index, Operator Quickstart, and Release
  Checklist link this runbook as readiness-gap closure.
- `AC-OPR-03`: PASS when `bmad workspace verify-capability` is treated as a
  declared-contract check over self-contained Capability Request JSON only.
- `AC-OPR-04`: PASS when checked-in `graph/*.graph.json` and
  `npm run validate:graphify-manifests` are treated as advisory evidence only.
  Graphify may inform readiness, but it never gates readiness, mutates
  manifests, or becomes authority unless an existing Workspace contract
  explicitly says so.
- `AC-OPR-05`: PASS when TOML/customize is limited to exposed skill behavior.
  There is no TOML mutation by default. \_bmad/custom is not verifier input,
  grant authority, runtime authority, or hidden-execution authority.
- `AC-OPR-06`: PASS when compiled history records the readiness closure
  candidate and preserves the current count convention.
- `AC-OPR-07`: PASS when push readiness still requires
  `npm ci && npm run quality` on exact `HEAD`.
- `AC-OPR-08`: PASS when Context7 Docs MCP readiness records Apple Passwords
  item `Context7` as the credential source, records only `CONTEXT7_API_KEY=set`
  or unset, and never stores the key value.
- `AC-OPR-09`: PASS when Git MCP readiness treats add, commit, and branch tools
  as manual/grant-gated, keeps GitHub connector state separate, and preserves
  local `git` CLI plus `npm ci && npm run quality` as exact pre-push authority.
- `AC-OPR-10`: PASS when PostgreSQL MCP readiness uses
  `docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`
  and `docs/workspace/templates/postgres-mcp-operator-evidence.template.json`,
  records only `POSTGRES_URL=set` or unset, lists allowed schemas/tables and
  denied writes, and treats read-only database evidence as sensitive.
- `AC-OPR-11`: PASS when Codex MCP/TOML docs readiness cites
  `https://developers.openai.com/codex/config-reference#configtoml` and
  `https://developers.openai.com/codex/cli/reference#codex-mcp`, treats
  `mcp_servers.*`, `codex mcp`, `~/.codex/config.toml`, and
  `.codex/config.toml` as operator context only, and confirms no verifier, CLI,
  schema, or capability registry drift before implementation.

If any checklist item fails, the operator can decide readiness is blocked
without asking a maintainer.

## Evidence Sources

- Authority docs: `docs/workspace/prd.md`, `architecture.md`,
  `command-contract.md`, `capability-contract.md`, `guardrails.md`,
  `operator-quickstart.md`, `operator-guide.md`, and `release-checklist.md`.
- Capability fixtures:
  `docs/workspace/templates/capability-request.codex-manual.example.json` and
  `docs/workspace/templates/capability-request.graphify-repo-intake.example.json`,
  plus `docs/workspace/templates/capability-request.git-worktree-review.example.json`.
- Graphify evidence inputs: checked-in `graph/*.graph.json` files and
  `npm run validate:graphify-manifests`.
- Git evidence inputs: `bmad workspace review` outputs, including
  `review/summary.json`, `review/review-manifest.json`, per-repo `status.json`,
  and `diff.patch` when files changed.
- Context7 and Git MCP evidence inputs:
  `docs/workspace/templates/capability-request.context7-docs.example.json`,
  `docs/workspace/templates/capability-request.git-mcp-local.example.json`,
  `docs/workspace/templates/context7-docs-operator-evidence.template.json`, and
  `docs/workspace/templates/git-mcp-operator-evidence.template.json`.
- PostgreSQL MCP evidence inputs:
  `docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`,
  `docs/workspace/templates/postgres-mcp-operator-evidence.template.json`, and
  `docs/workspace/postgresql-mcp-capability-planning.md`. Read-only evidence
  must record `POSTGRES_URL=set` or unset, allowed schemas/tables, denied
  writes, and why DB evidence is needed.
- Codex MCP/TOML docs readiness inputs:
  `docs/workspace/customize-codex-mcp-planning.md`, official OpenAI Codex
  config and CLI MCP references
  (`https://developers.openai.com/codex/config-reference#configtoml` and
  `https://developers.openai.com/codex/cli/reference#codex-mcp`),
  `mcp_servers.*`, `codex mcp`, `~/.codex/config.toml`,
  `.codex/config.toml`, `bmad-check-implementation-readiness` resolver output,
  and recorded validation commands. These inputs guide operators only; they are
  not Workspace verifier authority.
- Skill validation evidence: `tools/skill-validator.md` plus
  `npm run validate:skills`.

## Not Authority

- This `operator-readiness.md` file.
- Compiled history prose.
- Live or advisory Graphify output.
- `_bmad/custom` for verifier, grant, runtime, or hidden-execution authority.
- Codex config.
- Live Context7 config, Apple Passwords state, raw `CONTEXT7_API_KEY` values,
  Git MCP runtime state, local dirty state, and GitHub connector state.
- Live PostgreSQL state, PostgreSQL MCP runtime state, Docker MCP runtime
  state, local MCP config secrets, raw PostgreSQL connection strings, query
  results, allowed schemas omitted by assumption, denied writes omitted by
  assumption, and `POSTGRES_URL` values beyond set/unset state.
- Codex MCP/TOML docs readiness facts, including `mcp_servers.*`, `codex mcp`,
  `~/.codex/config.toml`, `.codex/config.toml`, OpenAI Docs MCP observations,
  and local Codex config state.
- Workspace Session artifacts.

## Boundaries

- No public CLI/API/schema change.
- No TOML files/behavior change.
- No Graphify behavior change.
- No verifier behavior change.
- No scheduler, watcher, replay, restore, merge, promotion, or live adapter.
- No keychain or Apple Passwords automation; the operator manually exposes
  `CONTEXT7_API_KEY` and records only redacted state.
- No PostgreSQL MCP readiness without least-privilege scope. Read-only is not
  safe by itself; allowed schemas/tables and denied writes must be explicit.
- No Codex MCP/TOML docs readiness claim may change Workspace verifier, CLI,
  schema, capability registry, grants, runtime authority, or self-contained
  Capability Request JSON behavior.

## Push Gate

Before push, run this on the exact checkout and `HEAD` being pushed:

```bash
npm ci && npm run quality
```
