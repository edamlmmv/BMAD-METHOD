---
title: "Docker MCP Toolkit And Context7 Planning"
description: Secret-safe advisory plan for Docker MCP Toolkit and Context7 capability authoring in BMAD Workspace
---

# Docker MCP Toolkit And Context7 Planning

## Summary

BMAD Workspace recognizes `host.mcp.docker.toolkit` as an experimental,
declaration-only `host.mcp` capability for Docker MCP Toolkit gateway-profile
authoring. The declaration is advisory capability guidance only. It does not
start Docker, call Docker MCP Gateway, read Docker MCP Catalog state, contact a
Context7 MCP server, read Apple Passwords, read a Docker secret, inspect
network state, or mutate Workspace artifacts.

Primary invariant: `bmad workspace verify-capability` evaluates only the
self-contained Capability Request JSON supplied to it. Same request, same
verdict, even with no live Docker, Context7, Apple Passwords, network, or MCP
access. No live Docker, Context7, Apple Passwords, network, or MCP access is
allowed in deterministic tests for this capability.

## Source Register

| source_id | Title | URL | Publisher | Retrieved | Used For | Do Not Use For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docker_mcp_toolkit_docs` | Docker MCP Toolkit | [Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/) | Docker Docs | 2026-05-07 | Docker MCP Toolkit, Toolkit profile/gateway concepts, operator setup vocabulary | Workspace verifier input, local runtime proof, secret proof | Official Docker docs source. |
| `docker_mcp_cli_docs` | Docker MCP Toolkit CLI | [CLI](https://docs.docker.com/ai/mcp-catalog-and-toolkit/cli/) | Docker Docs | 2026-05-07 | `docker mcp secret set`, Docker MCP Gateway commands, Docker Desktop credential store, local CLI vocabulary | Verifier behavior, local availability guarantee, key retrieval | Official Docker CLI docs source. Local Docker MCP CLI shape is observation only. |
| `docker_mcp_catalog_docs` | Docker MCP Catalog | [Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/) | Docker Docs | 2026-05-07 | Catalog source boundary and packaged MCP server vocabulary | Proof that Context7 is configured locally or authorized | Official Docker Catalog docs source. |
| `docker_hub_context7_mcp_server` | Docker Hub Context7 MCP server | [mcp/context7](https://hub.docker.com/mcp/server/context7) | Docker Hub | 2026-05-07 | Docker Hub Context7 MCP server identity and operator install context | Runtime proof, API key proof, verifier input | Docker Hub catalog page for Context7 server. |
| `context7_mcp_readme` | Context7 MCP README | [Context7 README](https://github.com/upstash/context7) | Upstash Context7 | 2026-05-07 | `CONTEXT7_API_KEY`, `--api-key`, MCP server auth options | Key storage, key retrieval, Workspace verifier input | Source for Context7 runtime configuration only. |
| `context7_ai_sdk_docs` | Context7 AI SDK Getting Started | [AI SDK](https://github.com/upstash/context7/blob/master/docs/agentic-tools/ai-sdk/getting-started.mdx) | Upstash Context7 | 2026-05-07 | Header usage shape and docs retrieval context | Key storage, verifier input, Docker runtime proof | Advisory authoring source. |
| `context7_mastra_docs` | Context7 Mastra integration | [Mastra](https://github.com/upstash/context7/blob/master/docs/integrations/mastra.mdx) | Upstash Context7 | 2026-05-07 | Header usage shape for hosted Context7 calls | Key storage, verifier input, Docker runtime proof | Advisory authoring source. |
| `bmad_workspace_capability_contract` | BMAD Workspace Capability Contract | docs/workspace/capability-contract.md | BMAD-METHOD | 2026-05-07 | Declared capability schema, exact id matching, grant boundary, sealed verifier invariant | Docker product claims, live Context7 claims | Local source for BMAD-owned fields only. |

## Boundary Map

| Surface | What It Is | What It Can Support | Boundary |
| --- | --- | --- | --- |
| Docker MCP Toolkit | Docker Desktop and CLI tooling for MCP server catalog, profiles, secrets, and gateway execution | Operator setup guidance and manual evidence planning | Docker MCP Toolkit remains optional and version-dependent. It is not verifier input and not Workspace authority. |
| Docker MCP Gateway | Runtime gateway process that can expose selected MCP servers and tools | Manual operator execution outside deterministic tests | Live gateway state, profile state, tool list output, and container state are not verifier input. |
| Docker MCP Catalog | Catalog of packaged MCP servers | Source lookup and operator vocabulary | Catalog state does not prove Context7 configuration, credentials, or Workspace compatibility. |
| Docker MCP secret / `secretRef` | Runtime secret reference through Docker MCP secret handling | Preferred runtime key injection path. `secretRef: Context7` is non-secret metadata. | BMAD never reads the secret value and never stores it. |
| Context7 MCP server | Documentation retrieval server, including Docker Hub `mcp/context7` packaging | Advisory docs evidence for an operator | Context7 output is not verifier input and does not authorize Docker, Git, or Workspace writes. |
| Apple Passwords entry named `Context7` | User-owned runtime credential source | Human-owned source before any future local secret setup | BMAD must ask the user to confirm it exists before setup. It must never read, display, store, log, or record the key. |
| Workspace verifier | `bmad workspace verify-capability` | Declared-contract compatibility over one JSON request | No filesystem, network, live MCP, Docker, Apple Passwords, secret manager, target repo, `_bmad/custom`, or session artifact reads. |

## Candidate Declaration

The committed declaration uses only fields accepted by the Workspace verifier:

```json
{
  "id": "host.mcp.docker.toolkit",
  "group": "host.mcp",
  "provider": "docker-mcp-toolkit",
  "interface": "docker-mcp-gateway-profile",
  "allowedInNormalSession": true,
  "allowedInBaseImprovement": false,
  "requiresGrant": true,
  "writes": [],
  "forbiddenWrites": ["workspace-base", "target-repo", "scheduler", "daemon", "live-adapter", "secret-store"],
  "outputs": ["docker-mcp-operator-evidence.json"],
  "upstreamGapProofRequired": false
}
```

The portable fixture is
`docs/workspace/templates/capability-request.docker-mcp-toolkit.example.json`.
It embeds the declaration and source-referenced observations so the verifier can
run with no ambient context.

## Secret Injection Priority

Use this order for future human-owned runtime setup only:

1. Docker MCP secret / `secretRef`.
2. `CONTEXT7_API_KEY` from a secret manager into the process environment.
3. `--api-key` as a last-resort manual path only because process args can leak.

For Docker MCP CLI setup, Docker docs describe `docker mcp secret set` and
Docker Desktop credential store behavior. BMAD may cite that as operator
guidance. BMAD must not read Docker secrets, Apple Passwords, shell history,
logs, screenshots, transcripts, or local MCP config to prove capability.

## Security Rules

- `secretRef: Context7` is non-secret metadata.
- Actual Context7 API key remains runtime-only in Apple Passwords entry named
  `Context7`.
- Before any future local secret setup, ask the user to confirm Apple Passwords
  entry `Context7`; the key must not be displayed, stored, logged, or recorded.
- Use placeholders only: `<CONTEXT7_API_KEY>` or `<redacted>`.
- No .env, repo MCP config, screenshots, transcripts, shell history, logs,
  tests, fixtures, result, closeout, or docs may contain key material.
- No synthetic high-entropy placeholder is allowed.

## Negative Fixture Matrix

| Claim Source | Expected Handling |
| --- | --- |
| Live Docker MCP Gateway state | Reject as verifier proof; manual operator evidence only. |
| Docker MCP Catalog state | Reject as verifier proof; source context only. |
| Docker MCP secret existence | Reject as verifier proof; runtime prerequisite only. |
| Apple Passwords entry existence | Reject as verifier proof; user-owned runtime setup only. |
| `CONTEXT7_API_KEY` presence | Reject as verifier proof; may be recorded only as set/unset state in manual evidence. |
| `--api-key` usage | Reject as verifier proof; last-resort manual path only because process args can leak. |
| Context7 MCP output | Reject as verifier proof; docs context only. |
| `_bmad/custom` | Reject as verifier proof; authoring context only. |

## Assumptions

- Apple Passwords flow is user-owned runtime setup, not BMAD automation.
- Docker MCP Toolkit remains optional and version-dependent.
- local Docker MCP CLI shape is observation only, not source of truth.
- Git and Context7 work from the parallel session stays separate; no Git files
  or names are part of this Docker MCP capability declaration.

## Validation

Required planning gates:

- `node test/test-workspace-contracts.js`
- `npm run validate:skills`
- No live Docker, Context7, Apple Passwords, network, or MCP access in tests.

Before pushing, run `npm ci && npm run quality` on the exact checkout to be
pushed.
